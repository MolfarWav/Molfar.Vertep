/**
 * Write a text file so that a reader never sees it half written (#243).
 *
 * `fs.writeFileSync` truncates the file first and fills it after, so a read that lands in between sees an empty or
 * partial file (a chat transcript being rewritten by a sidecar while the reader loads it). Here the content goes to a
 * temp file beside the target and is renamed over it: a reader gets the old file or the new one, never a gap.
 *
 * Windows: a rename over a file fails (EPERM / EBUSY / EACCES) when some process holds the target open without
 * FILE_SHARE_DELETE (Node's own reads do share it; a virus scanner or a backup tool may not). It is retried a few
 * times over ~150 ms, then the write falls back to the old in-place one, so a plugin never loses a save over this.
 *
 * Plain .mjs with no engine imports: the sandbox worker bundles it as a separate entry.
 */
import fs from "node:fs";
import path from "node:path";

const RETRY_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);
const RETRIES = 5;

const sleep = (ms) => {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* no SharedArrayBuffer: spin on */ }
};

/**
 * @param {string} full absolute path whose folder exists
 * @param {string} content
 */
export function writeFileAtomic(full, content) {
  let mode;
  try { mode = fs.statSync(full).mode & 0o777; } catch { /* a new file */ }
  const tmp = path.join(path.dirname(full), `.${path.basename(full)}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`);
  try {
    fs.writeFileSync(tmp, content, mode === undefined ? "utf8" : { encoding: "utf8", mode });
    for (let attempt = 0; ; attempt++) {
      try {
        fs.renameSync(tmp, full);
        return;
      } catch (e) {
        if (!RETRY_CODES.has(e?.code)) throw e;
        if (attempt >= RETRIES) break;
        sleep(10 * (attempt + 1));
      }
    }
    // the rename stayed blocked: write in place, as before this helper existed
    fs.writeFileSync(full, content, "utf8");
    fs.rmSync(tmp, { force: true });
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* best effort */ }
    throw e;
  }
}
