/*
 * libsigsys.so: loaded into the Bun server through LD_PRELOAD (EngineService).
 *
 * Android's app seccomp filter traps system calls newer than the device
 * allows (SECCOMP_RET_TRAP -> SIGSYS, which kills the process). Bun 1.4 calls
 * close_range (436) before main and pidfd_open / copy_file_range later; on
 * Android 11 each of them is fatal. This handler makes a trapped call return
 * -ENOSYS instead, the answer an old kernel gives, so Bun's own fallbacks run.
 * Calls the device allows never reach it. Any other SIGSYS keeps its default.
 */
#include <errno.h>
#include <signal.h>
#include <string.h>
#include <ucontext.h>

#ifndef SYS_SECCOMP
#define SYS_SECCOMP 1
#endif

static void on_sigsys(int sig, siginfo_t *info, void *context) {
    if (info == NULL || info->si_code != SYS_SECCOMP) {
        signal(sig, SIG_DFL);
        raise(sig);
        return;
    }
    // the kernel resumes after the svc instruction; x0 holds the result
    ucontext_t *uc = (ucontext_t *)context;
    uc->uc_mcontext.regs[0] = (unsigned long long)(-ENOSYS);
}

__attribute__((constructor)) static void install_sigsys_handler(void) {
    struct sigaction sa;
    memset(&sa, 0, sizeof sa);
    sa.sa_sigaction = on_sigsys;
    sa.sa_flags = SA_SIGINFO;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGSYS, &sa, NULL);
}
