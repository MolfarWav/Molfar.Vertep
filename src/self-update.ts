/**
 * A downloaded copy of Molfar Vertep (Windows, macOS, Linux, portable or not)
 * updates itself: an admin presses Update, the engine downloads its release
 * archive, checks it, swaps its own program file and resources/ for the new
 * ones, and restarts. config.yaml and data/ are never replaced, so a portable
 * copy stays portable with nothing to move.
 *
 * Nothing is swapped in that has not proven itself: the download must match
 * the release's size and checksum, and the new program must run on this
 * computer and report the version it claims before the old one is moved.
 *
 * The swap renames rather than overwrites: a running program can be renamed
 * on every platform (Windows included) but not replaced. The old files stay
 * as *.old until the next update, so `molfar-vertep rollback` (src/rollback.ts)
 * can still go back to them days later.
 *
 * The restart keeps this process as a thin parent: it stops serving, runs the
 * new program with the same arguments and terminal, passes Ctrl+C along, and
 * exits with the new program's code. A terminal, a double-clicked window or a
 * service manager keeps watching the same process it started. Until the new
 * version has served for a while, the parent also stands guard: if it exits
 * first, the parent moves the old program back, restores the account files
 * it saved before the restart, and runs the old version again, which reports
 * what went wrong in Settings.
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { Unzip, UnzipInflate } from "fflate";
import { ENGINE_VERSION, INSTALL_KIND, IN_CONTAINER } from "./install.js";
import { readLock } from "./lock.js";
import { log } from "./logger.js";
import type { ReleaseAsset } from "./updates.js";

const run = promisify(execFile);

/** This copy can replace itself: a downloaded program, not a container,
 *  source checkout, npm package or Android app. */
export const SELF_UPDATE = INSTALL_KIND === "binary" && !IN_CONTAINER;

/** The download name for this computer, as the release archives use it. */
export function platformTarget(platform: string = process.platform, arch: string = process.arch): string {
  const os = platform === "win32" ? "windows" : platform === "darwin" ? "macos" : "linux";
  return `${os}-${arch === "arm64" ? "arm64" : "x64"}`;
}

/** This computer's archive among a release's assets. An asset still being
 *  uploaded is not offered. */
export function pickAsset(assets: unknown, target: string = platformTarget()): ReleaseAsset | null {
  if (!Array.isArray(assets)) return null;
  for (const a of assets as { name?: unknown; browser_download_url?: unknown; size?: unknown; state?: unknown; digest?: unknown }[]) {
    if (typeof a?.name !== "string" || typeof a.browser_download_url !== "string" || typeof a.size !== "number") continue;
    if (a.state !== undefined && a.state !== "uploaded") continue;
    // archives are named Chrysalis-* up to 0.9.0 and Molfar-Vertep-* from 0.9.1
    if (!/^(?:Chrysalis|Molfar-Vertep)-.+\.(?:zip|tar\.gz)$/.test(a.name) || !a.name.replace(/\.(?:zip|tar\.gz)$/, "").endsWith(`-${target}`)) continue;
    if (!a.browser_download_url.startsWith("https://github.com/")) continue;
    const sha256 = typeof a.digest === "string" ? /^sha256:([0-9a-f]{64})$/i.exec(a.digest)?.[1]?.toLowerCase() : undefined;
    return { name: a.name, url: a.browser_download_url, size: a.size, ...(sha256 ? { sha256 } : {}) };
  }
  return null;
}

export type UpdatePhase = "idle" | "downloading" | "installing" | "restarting" | "failed";
export interface UpdateState {
  phase: UpdatePhase;
  version?: string;
  error?: string;
}

/** Set by the parent when it had to go back to this version. */
const FAILED_ENV = "MOLFAR_VERTEP_UPDATE_FAILED";
/** Set on the new version's first run, while the parent can still undo it. */
const UPDATED_ENV = "MOLFAR_VERTEP_UPDATED";
/** The names up to 1.7.x. A parent that goes back to such a version passes
 *  them too: that version knows no other. */
const LEGACY_FAILED_ENV = "CHRYSALIS_UPDATE_FAILED";
const LEGACY_UPDATED_ENV = "CHRYSALIS_UPDATED";

function initialState(): UpdateState {
  const raw = process.env[FAILED_ENV] || process.env[LEGACY_FAILED_ENV];
  delete process.env[FAILED_ENV];
  delete process.env[LEGACY_FAILED_ENV];
  if (!raw) return { phase: "idle" };
  try {
    const failed = JSON.parse(raw) as { version?: unknown; error?: unknown };
    return {
      phase: "failed",
      ...(typeof failed.version === "string" ? { version: failed.version } : {}),
      error: typeof failed.error === "string" ? failed.error : "the update did not start",
    };
  } catch {
    return { phase: "failed", error: "the update did not start" };
  }
}

let state: UpdateState = initialState();
export const updateState = (): UpdateState => state;

const programDir = () => path.dirname(process.execPath);
const OLD = ".old";
const FAILED = ".failed";
/** Files a still-running process holds are set aside under a stamped name
 *  rather than deleted. */
const OLD_STAMPED = /\.old-\d+$/;
const FAILED_NAME = /\.failed(?:-\d+)?$/;

/** Remove what an earlier update left behind. The program before the update
 *  (*.old) stays until the next update replaces it: it is what a rollback
 *  goes back to. A file still held by a previous process stays until the
 *  next start. */
export function cleanUpAfterUpdate(dir: string = programDir()): void {
  if (!SELF_UPDATE && dir === programDir()) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".update" || FAILED_NAME.test(name) || OLD_STAMPED.test(name)) {
      try {
        fs.rmSync(path.join(dir, name), { recursive: true, force: true });
      } catch { /* in use: next start */ }
    }
  }
}

/**
 * The names the program has had, newest first, beside the one running. Up to
 * 1.2.x it shipped as chrysalis[.exe]; it is to ship as molfar-vertep[.exe]
 * (#66). Copies that only know the old name look for it in the archive, so
 * every name this list knows has to be accepted before any release ships the
 * new one: an update may bring a program under another name, and a rollback
 * may go back to one.
 */
export function programNames(exe: string): string[] {
  const known = ["molfar-vertep", "chrysalis"].map((n) => (/\.exe$/i.test(exe) ? `${n}.exe` : n));
  const own = known.find((n) => n.toLowerCase() === exe.toLowerCase());
  return own ? [own, ...known.filter((n) => n !== own)] : [exe, ...known];
}

/** The folder inside an unpacked archive that holds the program, and the
 *  program's name there: the newest known name first. */
function findProgram(unpacked: string, exe: string): { dir: string; exe: string } {
  const candidates = [unpacked, ...fs.readdirSync(unpacked).map((n) => path.join(unpacked, n))];
  const names = programNames(exe);
  const newestFirst = [...names].sort((a, b) => (a.startsWith("molfar-vertep") ? -1 : 0) - (b.startsWith("molfar-vertep") ? -1 : 0));
  for (const name of newestFirst) {
    for (const dir of candidates) {
      if (fs.existsSync(path.join(dir, name)) && fs.existsSync(path.join(dir, "resources"))) return { dir, exe: name };
    }
  }
  throw new Error(`the download has no ${names.join(" or ")} with a resources folder`);
}

async function extract(archive: string, into: string): Promise<void> {
  fs.mkdirSync(into, { recursive: true });
  if (archive.endsWith(".zip")) return unzipTo(archive, into);
  await run("tar", ["-xf", archive, "-C", into], { maxBuffer: 16 * 1024 * 1024 });
}

/** Unpack a zip (the Windows download) without an outside program. Windows'
 *  tar.exe reads zip, but on some Windows 10 computers it warns "Can't set
 *  time" for every file and exits with an error, which failed the update.
 *  The release zip is written by fflate, so fflate reads it back. Streams
 *  the archive, so the program file is never held in memory whole. */
export function unzipTo(archive: string, into: string): void {
  const root = path.resolve(into);
  let failure: Error | null = null;
  const open = new Set<number>();
  const unzipper = new Unzip();
  unzipper.register(UnzipInflate);
  unzipper.onfile = (file) => {
    if (failure) return;
    const parts = file.name.split(/[\\/]/).filter((p) => p !== "" && p !== ".");
    if (parts.some((p) => p === ".." || p.includes(":")) || /^[\\/]/.test(file.name)) {
      failure = new Error(`the download holds an unsafe path: ${file.name}`);
      return;
    }
    if (parts.length === 0) return;
    const target = path.join(root, ...parts);
    if (/[\\/]$/.test(file.name)) {
      fs.mkdirSync(target, { recursive: true });
      return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const fd = fs.openSync(target, "wx");
    open.add(fd);
    file.ondata = (err, chunk, final) => {
      if (failure) return;
      try {
        if (err) throw new Error(`the download is damaged: ${err.message}`);
        fs.writeSync(fd, chunk);
        if (final) {
          open.delete(fd);
          fs.closeSync(fd);
        }
      } catch (e) {
        failure = e as Error;
      }
    };
    file.start();
  };
  const fd = fs.openSync(archive, "r");
  try {
    for (;;) {
      // a fresh buffer each time: the unzipper may keep part of the last one
      const buf = Buffer.allocUnsafe(1024 * 1024);
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      unzipper.push(buf.subarray(0, n), n === 0);
      if (failure) throw failure;
      if (n === 0) break;
    }
    if (open.size > 0) throw new Error("the download is incomplete: a file in it ends early");
  } finally {
    fs.closeSync(fd);
    for (const f of open) fs.closeSync(f);
  }
}

/** The new program must start on this computer and say it is the version the
 *  release names. A build for the wrong CPU, a missing system library or a
 *  mislabelled archive fails here, while the old program is still in place. */
export async function checkProgram(program: string, version: string): Promise<void> {
  if (process.platform !== "win32") fs.chmodSync(program, 0o755);
  let out: string;
  try {
    ({ stdout: out } = await run(program, ["--version"], { timeout: 60_000, maxBuffer: 1024 * 1024 }));
  } catch (e) {
    throw new Error(`the new version does not run on this computer: ${(e as Error).message.split("\n")[0]}`);
  }
  const said = out.trim().split("\n").pop()?.trim() ?? "";
  if (said !== version) throw new Error(`the download says it is Molfar Vertep ${said || "(nothing)"}, not ${version}`);
}

/** Set aside a name an earlier version may still be running from. */
function setAside(target: string): void {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    fs.renameSync(target, `${target}-${Date.now()}`);
  }
}

/** Put the new program and resources/ in place of the old ones. The new
 *  program may carry another name (freshExe); the old one is then kept as
 *  <its own name>.old. Anything already moved is moved back if a later step
 *  fails. */
export function swapProgram(dir: string, fresh: string, exe: string, freshExe: string = exe): void {
  const done: [from: string, to: string][] = [];
  const move = (from: string, to: string) => {
    fs.renameSync(from, to);
    done.push([from, to]);
  };
  // one earlier version is kept, under whichever name it had
  for (const name of [...programNames(exe), "resources"]) setAside(path.join(dir, name + OLD));
  // a program under the new name left by an earlier, failed attempt
  if (freshExe !== exe) setAside(path.join(dir, freshExe));
  try {
    move(path.join(dir, exe), path.join(dir, exe + OLD));
    move(path.join(dir, "resources"), path.join(dir, "resources" + OLD));
    move(path.join(fresh, freshExe), path.join(dir, freshExe));
    move(path.join(fresh, "resources"), path.join(dir, "resources"));
  } catch (e) {
    for (const [from, to] of done.reverse()) {
      try {
        fs.renameSync(to, from);
      } catch { /* leave it for the error below */ }
    }
    throw e;
  }
  if (process.platform !== "win32") fs.chmodSync(path.join(dir, freshExe), 0o755);
  for (const extra of ["README.txt", "Restore-previous-version.cmd"]) {
    try {
      fs.copyFileSync(path.join(fresh, extra), path.join(dir, extra));
    } catch { /* optional */ }
  }
}

/** The name the program from before the last update was kept under, or
 *  null when there is none. */
export function previousProgram(dir: string, exe: string): string | null {
  if (!fs.existsSync(path.join(dir, "resources" + OLD))) return null;
  return programNames(exe).find((n) => fs.existsSync(path.join(dir, n + OLD))) ?? null;
}

/** The program from before the last update is still next to this one. */
export function hasPreviousProgram(dir: string, exe: string): boolean {
  return previousProgram(dir, exe) !== null;
}

/** Put the program and resources/ from before the update back, under the
 *  name it had; returns that name. `exe` is the program there now. The files
 *  that failed are kept as *.failed until the next start. */
export function restoreProgram(dir: string, exe: string): string {
  const previous = previousProgram(dir, exe);
  if (!previous) throw new Error(fs.existsSync(path.join(dir, "resources" + OLD)) ? `${exe + OLD} is missing` : `resources${OLD} is missing`);
  for (const [current, old] of [[exe, previous], ["resources", "resources"]] as const) {
    const at = path.join(dir, current);
    setAside(at + FAILED);
    if (fs.existsSync(at)) fs.renameSync(at, at + FAILED);
    fs.renameSync(path.join(dir, old + OLD), path.join(dir, old));
  }
  return previous;
}

/** The program the last update put in place, when it carries another name
 *  than this process: the restart has to run that one. */
let installedExe: string | null = null;

// ---------- account files saved across a restart ----------

const SNAPSHOT = ".update-snapshot";
/** Engine-owned files a new version's first start may migrate. Workspaces are
 *  git repositories and app baselines are rebuilt from them, so neither is
 *  copied. */
const SNAPSHOT_FILES = ["users.json", "sessions.json", "format.json"];

/** What a snapshot holds and which change of version it was taken for. */
export interface SnapshotInfo {
  files: string[];
  /** The version the files belong to (absent in snapshots before 1.2.2). */
  from?: string;
  /** The version about to start on them. */
  to?: string;
  at?: number;
}

/** The saved account files' record, or null when there is none. */
export function readSnapshot(dataDir: string): SnapshotInfo | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dataDir, SNAPSHOT, "files.json"), "utf8")) as SnapshotInfo;
    return Array.isArray(raw.files) ? raw : null;
  } catch {
    return null;
  }
}

/** The data format the snapshot's files were written in (1 for none recorded). */
export function snapshotFormat(dataDir: string): number {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dataDir, SNAPSHOT, "format.json"), "utf8")) as { format?: unknown };
    return typeof raw.format === "number" ? raw.format : 1;
  } catch {
    return 1;
  }
}

/** Copy the engine's own account files aside before a new version starts.
 *  The copy stays until the next change of version replaces it. */
export function saveEngineFiles(dataDir: string, versions: { from?: string; to?: string } = {}): void {
  const into = path.join(dataDir, SNAPSHOT);
  fs.rmSync(into, { recursive: true, force: true });
  fs.mkdirSync(into, { recursive: true });
  const present: string[] = [];
  for (const name of SNAPSHOT_FILES) {
    const from = path.join(dataDir, name);
    if (!fs.existsSync(from)) continue;
    fs.copyFileSync(from, path.join(into, name));
    present.push(name);
  }
  const credentials = path.join(dataDir, "credentials");
  if (fs.existsSync(credentials)) {
    fs.cpSync(credentials, path.join(into, "credentials"), {
      recursive: true,
      filter: (src) => !src.split(path.sep).includes("app-upstream"),
    });
  }
  const info: SnapshotInfo = { files: present, ...versions, at: Date.now() };
  fs.writeFileSync(path.join(into, "files.json"), JSON.stringify(info) + "\n", "utf8");
}

/** Put the saved account files back: files the snapshot had are restored and
 *  files it did not have (a format marker the new version wrote) are removed.
 *  Credential files the new version added are left alone. */
export function restoreEngineFiles(dataDir: string): void {
  const from = path.join(dataDir, SNAPSHOT);
  const listed = JSON.parse(fs.readFileSync(path.join(from, "files.json"), "utf8")) as { files: string[] };
  for (const name of SNAPSHOT_FILES) {
    const target = path.join(dataDir, name);
    if (listed.files.includes(name)) fs.copyFileSync(path.join(from, name), target);
    else fs.rmSync(target, { force: true });
  }
  const credentials = path.join(from, "credentials");
  if (fs.existsSync(credentials)) fs.cpSync(credentials, path.join(dataDir, "credentials"), { recursive: true, force: true });
}

/** Forget saved account files (once they have been put back). */
export function dropEngineFiles(dataDir: string): void {
  fs.rmSync(path.join(dataDir, SNAPSHOT), { recursive: true, force: true });
}

/** Download and install a release, then restart into it. Runs in the
 *  background; updateState() reports progress. */
export function startUpdate(version: string, asset: ReleaseAsset, restart: () => Promise<void>): UpdateState {
  if (!SELF_UPDATE) return { phase: "failed", error: "this copy of Molfar Vertep cannot update itself" };
  if (state.phase === "downloading" || state.phase === "installing" || state.phase === "restarting") return state;
  state = { phase: "downloading", version };
  void installUpdate(programDir(), version, asset, restart);
  return state;
}

/**
 * Fetch, check and swap in a release, reporting through `state`. Separated
 * from startUpdate so the whole chain — the size and checksum guards, the
 * unpack, the does-it-even-run check, the swap — can be driven against a
 * directory that is not this program's own.
 */
export async function installUpdate(
  dir: string,
  version: string,
  asset: ReleaseAsset,
  restart: () => Promise<void>,
  exe: string = path.basename(process.execPath),
): Promise<UpdateState> {
  {
    const work = path.join(dir, ".update");
    try {
      fs.rmSync(work, { recursive: true, force: true });
      fs.mkdirSync(work, { recursive: true });
      const archive = path.join(work, asset.name);
      const res = await fetch(asset.url, { signal: AbortSignal.timeout(20 * 60_000), redirect: "follow" });
      if (!res.ok || !res.body) throw new Error(`download failed (HTTP ${res.status})`);
      // chunk by chunk: writing the whole response in one call stalls on
      // bodies this large
      const hash = crypto.createHash("sha256");
      const fd = fs.openSync(archive, "w");
      let written = 0;
      try {
        for await (const chunk of res.body) {
          written += chunk.length;
          if (written > asset.size) throw new Error("the download is larger than the release says");
          hash.update(chunk);
          fs.writeSync(fd, chunk);
        }
      } finally {
        fs.closeSync(fd);
      }
      if (written !== asset.size) throw new Error("the download was incomplete");
      if (asset.sha256 && hash.digest("hex") !== asset.sha256) throw new Error("the download does not match the release's checksum");
      state = { phase: "installing", version };
      await extract(archive, path.join(work, "unpacked"));
      const fresh = findProgram(path.join(work, "unpacked"), exe);
      await checkProgram(path.join(fresh.dir, fresh.exe), version);
      swapProgram(dir, fresh.dir, exe, fresh.exe);
      installedExe = fresh.exe;
      fs.rmSync(work, { recursive: true, force: true });
      log.info(`[update] installed Molfar Vertep ${version}, restarting`);
      state = { phase: "restarting", version };
      await restart();
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      const error = code === "EACCES" || code === "EPERM" || code === "EBUSY"
        ? `Molfar Vertep could not replace its own files in ${dir} (${code}). If another program has them open, close it and try again; if your account cannot write there, move the folder somewhere it can.`
        : (e as Error).message;
      log.warn(`[update] ${error}`);
      state = { phase: "failed", version, error };
      fs.rmSync(work, { recursive: true, force: true });
    }
  }
  return state;
}

/** How the restart runs. Everything but dataDir defaults to this process. */
export interface ReplacementOptions {
  dataDir: string;
  /** The program folder and file name the update replaced. */
  dir?: string;
  exe?: string;
  /** What to run: this program with this process's arguments. */
  command?: string;
  args?: string[];
  /** How long the new version must keep answering before the update counts. */
  proveMs?: number;
  /** Pass Ctrl+C and termination on to the child. */
  forwardSignals?: boolean;
  exit?: (code: number) => void;
}

/** Run the program in this process's place and mirror its life: its exit
 *  code becomes ours, and Ctrl+C and termination pass through. */
function mirror(
  opts: Required<Omit<ReplacementOptions, "dataDir" | "proveMs">>,
  env: NodeJS.ProcessEnv,
  onExit: (code: number | null, signal: NodeJS.Signals | null, stopRequested: boolean) => void,
): ChildProcess {
  const child = spawn(opts.command, opts.args, { stdio: "inherit", env });
  let stopRequested = false;
  if (opts.forwardSignals) {
    for (const sig of ["SIGINT", "SIGTERM"] as const) {
      process.removeAllListeners(sig);
      process.on(sig, () => {
        stopRequested = true;
        child.kill(sig);
      });
    }
  }
  let ended = false;
  const end = (code: number | null, signal: NodeJS.Signals | null) => {
    if (ended) return;
    ended = true;
    onExit(code, signal, stopRequested);
  };
  child.on("exit", end);
  child.on("error", (e) => {
    log.error(`[update] could not start Molfar Vertep: ${e.message}`);
    end(1, null);
  });
  return child;
}

/**
 * Run the installed program in this one's place. Call after this process has
 * stopped serving and released its port. Until the new version has answered
 * on its address for proveMs, an exit is treated as a failed update and this
 * version comes back instead.
 */
export function runReplacement(options: ReplacementOptions): void {
  const { dataDir } = options;
  const dir = options.dir ?? programDir();
  // the update may have brought the program under its new name
  const exe = options.exe ?? installedExe ?? path.basename(process.execPath);
  const opts = {
    dir,
    exe,
    command: options.command ?? (installedExe ? path.join(dir, installedExe) : process.execPath),
    args: options.args ?? process.argv.slice(2),
    forwardSignals: options.forwardSignals ?? true,
    exit: options.exit ?? ((code: number) => process.exit(code)),
  };
  const proveMs = options.proveMs ?? 15_000;
  const exitWith = (code: number | null, signal: NodeJS.Signals | null) => opts.exit(code ?? (signal ? 1 : 0));
  const target = state.version ?? "";
  let saved = false;
  try {
    saveEngineFiles(dataDir, { from: ENGINE_VERSION, to: target });
    saved = true;
  } catch (e) {
    log.warn(`[update] could not save account files before restarting: ${(e as Error).message}`);
  }
  let proven = false;
  let answeringSince = 0;
  const child = mirror(opts, { ...process.env, [UPDATED_ENV]: "1", [LEGACY_UPDATED_ENV]: "1" }, (code, signal, stopRequested) => {
    clearInterval(watch);
    if (proven || stopRequested) return exitWith(code, signal);
    const reason = signal ? `stopped by ${signal}` : `exited with code ${code}`;
    const error = `Molfar Vertep ${target} stopped before it finished starting (${reason}), so Molfar Vertep went back to ${ENGINE_VERSION}. The log has the details.`;
    log.error(`[update] ${error}`);
    try {
      // the program that comes back may have the other name
      const restored = restoreProgram(opts.dir, opts.exe);
      if (!options.command) opts.command = path.join(opts.dir, restored);
    } catch (e) {
      log.error(`[update] could not put Molfar Vertep ${ENGINE_VERSION} back: ${(e as Error).message}`);
      return exitWith(1, null);
    }
    if (saved) {
      try {
        restoreEngineFiles(dataDir);
        dropEngineFiles(dataDir);
      } catch (e) {
        log.error(`[update] could not restore account files: ${(e as Error).message}`);
      }
    }
    const failed = JSON.stringify({ version: target, error });
    mirror(opts, { ...process.env, [UPDATED_ENV]: "", [LEGACY_UPDATED_ENV]: "", [FAILED_ENV]: failed, [LEGACY_FAILED_ENV]: failed }, exitWith);
  });
  const watch = setInterval(() => {
    void (async () => {
      const lock = readLock(dataDir);
      if (!lock || lock.pid !== child.pid || proven) return;
      try {
        const res = await fetch(`${lock.url}/v1/health`, { signal: AbortSignal.timeout(2000), tls: { rejectUnauthorized: false } });
        const body = (await res.json()) as { instance?: string };
        if (body.instance !== lock.instance) return;
      } catch {
        answeringSince = 0;
        return;
      }
      answeringSince ||= Date.now();
      if (Date.now() - answeringSince < proveMs || proven) return;
      proven = true;
      clearInterval(watch);
      log.info(`[update] Molfar Vertep ${target} is running`);
    })();
  }, Math.min(1000, Math.max(100, proveMs / 5)));
  watch.unref();
}
