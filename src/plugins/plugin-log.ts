/**
 * Plugin output per user, in memory: `host.log` and guest console lines, plus
 * failed passes (a crashed route, hook or tool). The engine log has the same
 * lines, but Molfar cannot read the engine log; the `plugin_log` agent tool
 * reads this buffer instead. Nothing is written to disk; a restart forgets it.
 */

export interface PluginLogEntry {
  at: number;
  plugin: string;
  /** The app a bundled plugin belongs to; absent for top-level plugins. */
  app?: string;
  level: "log" | "error";
  text: string;
}

const KEEP = 500;
const LINE_MAX = 2000;
const buffers = new Map<string, PluginLogEntry[]>();

export function recordPluginLog(owner: string, entry: Omit<PluginLogEntry, "at">): void {
  let buf = buffers.get(owner);
  if (!buf) {
    buf = [];
    buffers.set(owner, buf);
  }
  const text = entry.text.length > LINE_MAX ? `${entry.text.slice(0, LINE_MAX)}…` : entry.text;
  buf.push({ ...entry, text, at: Date.now() });
  if (buf.length > KEEP) buf.splice(0, buf.length - KEEP);
}

/** Newest last. `app` and `plugin` narrow the list; `errors` keeps failures only. */
export function readPluginLog(owner: string, o: { app?: string; plugin?: string; errors?: boolean; limit?: number } = {}): PluginLogEntry[] {
  const limit = Math.min(Math.max(1, Math.floor(o.limit ?? 50)), KEEP);
  return (buffers.get(owner) ?? [])
    .filter((e) => (!o.app || e.app === o.app) && (!o.plugin || e.plugin === o.plugin) && (!o.errors || e.level === "error"))
    .slice(-limit);
}

export function clearPluginLog(owner?: string): void {
  if (owner) buffers.delete(owner);
  else buffers.clear();
}
