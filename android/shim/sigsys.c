/*
 * libsigsys.so: loaded into the Bun server through LD_PRELOAD (EngineService).
 *
 * Android's app seccomp filter traps system calls newer than the device
 * allows (SECCOMP_RET_TRAP -> SIGSYS). Bun 1.4 makes several: close_range
 * before main and in every spawned child, pidfd_open, copy_file_range. A
 * trapped call in a vfork child is worst: the child has just reset every
 * signal to its default, SIGSYS dumps core, and a core dump kills every
 * task sharing the address space, so the server dies with its child.
 *
 * 1. syscall() is replaced: the numbers below answer ENOSYS without entering
 *    the kernel (Bun has a fallback for each), the rest go through as usual.
 *    Every known call site in Bun uses the libc syscall() export.
 * 2. A SIGSYS handler turns any other trap into -ENOSYS, and sigaction() /
 *    signal() leave SIGSYS alone, so the handler survives Bun's reset in a
 *    child. Nothing here allocates, locks or calls dlsym after start: these
 *    functions also run in vfork children on the parent's memory.
 */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <signal.h>
#include <stdarg.h>
#include <string.h>
#include <ucontext.h>

#ifndef SYS_SECCOMP
#define SYS_SECCOMP 1
#endif

typedef int (*sigaction_fn)(int, const struct sigaction *, struct sigaction *);
typedef sighandler_t (*signal_fn)(int, sighandler_t);

static sigaction_fn real_sigaction;
static signal_fn real_signal;
static struct sigaction sigsys_action;

/* arm64 numbers the Android 11 app filter traps and Bun may call */
static int trapped(long nr) {
    switch (nr) {
    case 285: /* copy_file_range */
    case 424: /* pidfd_send_signal */
    case 434: /* pidfd_open */
    case 435: /* clone3 */
    case 436: /* close_range */
    case 437: /* openat2 */
    case 438: /* pidfd_getfd */
    case 439: /* faccessat2 */
    case 441: /* epoll_pwait2 */
    case 452: /* fchmodat2 */
        return 1;
    default:
        return 0;
    }
}

long syscall(long nr, ...) {
    va_list ap;
    va_start(ap, nr);
    long a0 = va_arg(ap, long), a1 = va_arg(ap, long), a2 = va_arg(ap, long);
    long a3 = va_arg(ap, long), a4 = va_arg(ap, long), a5 = va_arg(ap, long);
    va_end(ap);
    if (trapped(nr)) {
        errno = ENOSYS;
        return -1;
    }
    register long x8 __asm__("x8") = nr;
    register long x0 __asm__("x0") = a0;
    register long x1 __asm__("x1") = a1;
    register long x2 __asm__("x2") = a2;
    register long x3 __asm__("x3") = a3;
    register long x4 __asm__("x4") = a4;
    register long x5 __asm__("x5") = a5;
    __asm__ volatile("svc #0" : "+r"(x0) : "r"(x8), "r"(x1), "r"(x2), "r"(x3), "r"(x4), "r"(x5) : "memory", "cc");
    if ((unsigned long)x0 > -4096UL) {
        errno = (int)-x0;
        return -1;
    }
    return x0;
}

static void on_sigsys(int sig, siginfo_t *info, void *context) {
    if (info == NULL || info->si_code != SYS_SECCOMP) {
        struct sigaction dfl;
        memset(&dfl, 0, sizeof dfl);
        dfl.sa_handler = SIG_DFL;
        real_sigaction(sig, &dfl, NULL);
        raise(sig);
        return;
    }
    // the kernel resumes after the svc instruction; x0 holds the result
    ucontext_t *uc = (ucontext_t *)context;
    uc->uc_mcontext.regs[0] = (unsigned long long)(-ENOSYS);
}

static void resolve(void) {
    if (!real_sigaction) real_sigaction = (sigaction_fn)dlsym(RTLD_NEXT, "sigaction");
    if (!real_signal) real_signal = (signal_fn)dlsym(RTLD_NEXT, "signal");
}

int sigaction(int sig, const struct sigaction *act, struct sigaction *old) {
    if (!real_sigaction) resolve();
    if (sig == SIGSYS && real_sigaction) {
        if (old) *old = sigsys_action;
        return 0;
    }
    return real_sigaction(sig, act, old);
}

sighandler_t signal(int sig, sighandler_t handler) {
    if (!real_signal) resolve();
    if (sig == SIGSYS) return SIG_DFL;
    return real_signal(sig, handler);
}

__attribute__((constructor)) static void install_sigsys_handler(void) {
    resolve();
    memset(&sigsys_action, 0, sizeof sigsys_action);
    sigsys_action.sa_sigaction = on_sigsys;
    sigsys_action.sa_flags = SA_SIGINFO;
    sigemptyset(&sigsys_action.sa_mask);
    if (real_sigaction) real_sigaction(SIGSYS, &sigsys_action, NULL);
}
