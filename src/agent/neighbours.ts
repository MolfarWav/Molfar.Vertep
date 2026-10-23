/**
 * Chats that run at once (#69) write into one workspace. This registry lets a chat's write
 * tools see that another chat, still working, changed the same file, and say so in the result.
 * It lives only while runs live: a run that ended is history, which git already keeps.
 */

interface Neighbour {
  /** what the run was asked, shortened */
  task: string;
  /** workspace-relative path -> when this run last changed it */
  files: Map<string, number>;
}

/** username -> sessionId -> the run going in that chat */
const runs = new Map<string, Map<string, Neighbour>>();

export function beginWork(username: string, sessionId: string, task: string): void {
  let mine = runs.get(username);
  if (!mine) runs.set(username, (mine = new Map()));
  mine.set(sessionId, { task, files: new Map() });
}

export function endWork(username: string, sessionId: string): void {
  const mine = runs.get(username);
  mine?.delete(sessionId);
  if (mine && !mine.size) runs.delete(username);
}

/** A run holds this chat right now. */
export const isWorking = (username: string, sessionId: string): boolean => runs.get(username)?.has(sessionId) ?? false;

/** The key a file goes under: the same file reached as `./a//b` and `a/b` is one. */
const keyOf = (rel: string): string => rel.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^(\.\/)+/, "");

/** This chat's run changed `rel`. Returns the other working chats that changed it before, for the result. */
export function noteWrite(username: string, sessionId: string, rel: string, now = Date.now()): { task: string; agoMs: number }[] {
  const mine = runs.get(username);
  const key = keyOf(rel);
  const others: { task: string; agoMs: number }[] = [];
  for (const [id, run] of mine ?? []) {
    if (id === sessionId) continue;
    const at = run.files.get(key);
    if (at !== undefined) others.push({ task: run.task, agoMs: Math.max(0, now - at) });
  }
  mine?.get(sessionId)?.files.set(key, now);
  return others;
}

const ago = (ms: number): string => (ms < 90_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.round(ms / 60_000)} min`);

/**
 * The line a write tool adds to its result when another working chat changed the file too.
 * `replaced`: the tool wrote the whole file (write_file), so it may have dropped that change;
 * the other tools changed one place in the file as they found it.
 */
export function neighbourNote(others: readonly { task: string; agoMs: number }[], rel: string, replaced: boolean): string {
  if (!others.length) return "";
  const who = others.map((o) => `"${o.task}" (${ago(o.agoMs)} ago)`).join(", ");
  const look = `git log --oneline -n 5 -- ${rel}`;
  return replaced
    ? `\nNote: another chat that is still working changed ${rel} before this write: ${who}. This write replaced the file as that chat left it. If its change should stay, see what it did with the git tool ("${look}") and put it back.`
    : `\nNote: another chat that is still working changed ${rel} too: ${who}. Your change went into the file as it was then. Read the file again before editing it further; "${look}" shows what landed in between.`;
}
