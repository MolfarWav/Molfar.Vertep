// Removing a leftover folder (an install's staging copy) on Windows can fail while
// anything holds a file in it: an antivirus scanning a fresh clone, an indexer, File
// Explorer, an editor (EPERM, EBUSY). Such a folder is only a leftover, so the removal
// is retried, then the folder is moved aside, and only then reported, in words a user
// can act on instead of a raw error code.
import fs from "node:fs";

const BUSY = new Set(["EPERM", "EBUSY", "ENOTEMPTY", "EACCES"]);

/** A folder that could not be removed nor moved aside; the message says what to do. */
export class FolderBusyError extends Error {
  constructor(
    readonly dir: string,
    readonly code: string,
  ) {
    super(
      `Windows would not let Molfar Vertep remove the leftover folder ${dir} (${code}). ` +
        "Something may still have it open: an antivirus scan, File Explorer, an editor. " +
        "Close it or delete that folder yourself, then try again.",
    );
  }
}

export interface ClearDirOptions {
  tries?: number;
  delayMs?: number;
  rm?: (dir: string) => void;
  rename?: (from: string, to: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

/** Remove `dir` (absent is fine). Busy: retry with a growing pause, then rename it to
 *  `<dir>.old-<time>` so a new copy can take its place; throws FolderBusyError when
 *  neither works. Any other error is thrown as it is. */
export async function clearDir(dir: string, opts: ClearDirOptions = {}): Promise<void> {
  const tries = opts.tries ?? 5;
  const delayMs = opts.delayMs ?? 200;
  const rm = opts.rm ?? ((d: string) => fs.rmSync(d, { recursive: true, force: true }));
  const rename = opts.rename ?? fs.renameSync;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let i = 1; ; i++) {
    try {
      rm(dir);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code ?? "";
      if (!BUSY.has(code)) throw e;
      if (i < tries) {
        await sleep(delayMs * i);
        continue;
      }
      try {
        rename(dir, `${dir}.old-${Date.now()}`);
        return;
      } catch {
        throw new FolderBusyError(dir, code);
      }
    }
  }
}

/** Best effort: drop folders an earlier clearDir moved aside under `root`. */
export function sweepMovedAside(root: string): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(root);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!/\.old-\d+$/.test(entry)) continue;
    try {
      fs.rmSync(`${root}/${entry}`, { recursive: true, force: true });
    } catch {
      // still held: the next sweep tries again
    }
  }
}
