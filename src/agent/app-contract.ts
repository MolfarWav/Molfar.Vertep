/**
 * The active app's contract on demand (issue #174).
 *
 * By default the app's AGENTS.md and data/README.md ride the system prompt of
 * every model call (agent.ts, instructionDocs). That is ~6k tokens a call, and
 * most calls of a run never needed them. With the switch `appContractOnDemand`
 * in settings.json ON (default OFF), the system prompt carries a one-line
 * pointer instead, and the contract is delivered on the first tool call of a
 * task that touches `apps/<id>/`, riding on that tool result like
 * projectContextFor does. A chat inside the app's own project gets it in the
 * prompt from the start.
 *
 * This file holds the pure parts: the switch, the contract text with its
 * markers, first-touch detection, and the markers' use by context folding.
 */
import fs from "node:fs";
import path from "node:path";

/** The user's switch, `appContractOnDemand` in settings.json; off unless set to true. */
export function appContractOnDemandEnabled(settingsFile: string): boolean {
  try {
    return (JSON.parse(fs.readFileSync(settingsFile, "utf8")) as { appContractOnDemand?: unknown }).appContractOnDemand === true;
  } catch {
    return false;
  }
}

const APP_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
export const isAppId = (s: string): boolean => APP_ID.test(s);

/** The files of an app's contract, with the caps instructionDocs has always used. */
export const CONTRACT_FILES = [
  { rel: (id: string) => `apps/${id}/AGENTS.md`, cap: 14_000, heading: "own contract" },
  { rel: (id: string) => `apps/${id}/data/README.md`, cap: 6_000, heading: "data shapes" },
] as const;

/** A documentation file, capped; past the cap the model is told which file holds the rest. */
export function readContractDoc(root: string, rel: string, cap: number): string | null {
  let body: string;
  try {
    body = fs.readFileSync(path.join(root, rel), "utf8").trim();
  } catch {
    return null;
  }
  if (!body) return null;
  return body.length <= cap ? body : `${body.slice(0, cap)}\n\n[cut here — read ${rel} for the rest]`;
}

/** The system-prompt pointer that stands in for an app's contract while the switch is on. */
export function contractPointer(appId: string): string {
  return (
    `# The active app's own contract: ${appId} (not in this prompt)\n` +
    `The rules of apps/${appId}/ (apps/${appId}/AGENTS.md and apps/${appId}/data/README.md) are NOT written here. ` +
    `They are delivered, once per task, with the first tool result that touches anything under apps/${appId}/ ` +
    `(a file read, search, edit or write, a git or app_* tool, or a shell command that names a path there). ` +
    `A first call that would CHANGE the app is held back once and answered with the rules instead: read them, then repeat the call. ` +
    `Those rules bind you exactly as if they stood in this prompt; follow them, and where they disagree with a guess of yours, they win.`
  );
}

const OPEN = (id: string): string => `[App contract: apps/${id} — delivered on first touch; it binds you for the rest of this task]`;
const CLOSE = (id: string): string => `[End of the contract of apps/${id}]`;

/** The contract of an app as it rides a tool result; null when the app has neither file. */
export function appContractText(root: string, appId: string): string | null {
  if (!isAppId(appId) || !fs.existsSync(path.join(root, "apps", appId, "manifest.json"))) return null;
  const docs: string[] = [];
  for (const f of CONTRACT_FILES) {
    const rel = f.rel(appId);
    const body = readContractDoc(root, rel, f.cap);
    if (body) docs.push(`# The app's ${f.heading}: ${appId} (${rel})\n${body}`);
  }
  if (!docs.length) return null;
  return `${OPEN(appId)}\n${docs.join("\n\n")}\n${CLOSE(appId)}`;
}

const BLOCK = /\n*\[App contract: apps\/([A-Za-z0-9][A-Za-z0-9_-]*) —[^\]]*\][\s\S]*?\[End of the contract of apps\/\1\]/g;

/** A tool result's text split into what is not a delivered contract and the contract blocks (with their ids). */
export function splitContracts(text: string): { body: string; blocks: string; ids: string[] } {
  if (!text.includes("[App contract: apps/")) return { body: text, blocks: "", ids: [] };
  const ids: string[] = [];
  const blocks: string[] = [];
  const body = text.replace(BLOCK, (m, id: string) => {
    ids.push(id);
    blocks.push(m.replace(/^\n+/, ""));
    return "";
  });
  return { body, blocks: blocks.length ? `\n\n${blocks.join("\n\n")}` : "", ids };
}

/** Whether a delivered contract of the app is still in these messages (a window trim can cut it out). */
export function carriesContract(messages: readonly unknown[], appId: string): boolean {
  const open = `[App contract: apps/${appId} `;
  return messages.some((m) => {
    const c = (m as { role?: string; content?: unknown }).content;
    return (m as { role?: string }).role === "toolResult" && Array.isArray(c) && c.some((b) => typeof (b as { text?: unknown }).text === "string" && ((b as { text: string }).text.includes(open)));
  });
}

const APP_PATH = /(?:^|[\s"'`=(/,:;])apps\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})(?=[/\s"'`)\],:;]|$)/g;

/**
 * Every app a tool call names: an app_* tool's `id`, and any string anywhere
 * in the arguments (paths, `paths` and `edits` arrays, a shell command or a
 * git command line) that contains `apps/<id>`. Misses: a path built inside a
 * script (`cd apps; cat roleplay/x`, a variable), and a tool that reaches the
 * app by some other name than its folder.
 */
export function appsNamed(toolName: string, args: unknown): string[] {
  const found = new Set<string>();
  const a = args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : undefined;
  if (a && toolName.startsWith("app_") && typeof a.id === "string" && APP_ID.test(a.id)) found.add(a.id);
  const scan = (v: unknown, depth: number): void => {
    if (typeof v === "string") {
      for (const m of v.replace(/\\/g, "/").matchAll(APP_PATH)) if (m[1]) found.add(m[1]);
    } else if (depth < 4 && v && typeof v === "object") {
      for (const x of Array.isArray(v) ? v : Object.values(v)) scan(x, depth + 1);
    }
  };
  scan(args, 0);
  found.delete(".staging");
  return [...found];
}

/** A shell command that looks like it changes something. */
const SHELL_WRITES = /(?:^|[^<>=&|-])>{1,2}(?!&)|\b(?:sed\s+-[a-z]*i|rm|mv|cp|tee|touch|mkdir|rmdir|patch|truncate|dd|install|chmod|ln|python3?|node|bun|npm|git\s+(?:commit|checkout|restore|revert|reset|apply|clone|merge|rebase|cherry-pick|stash|clean|rm|mv|add))\b/;

/** A call that would change the app (so the contract must come before it, not after). */
export function isMutatingCall(toolName: string, args: unknown): boolean {
  if (toolName === "write_file" || toolName === "edit_file" || toolName === "json_set") return true;
  if (toolName === "app_create" || toolName === "app_deps" || toolName === "app_rebuild") return true;
  const a = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  if (toolName === "bash") return typeof a.command === "string" && SHELL_WRITES.test(a.command);
  if (toolName === "git") return typeof a.args === "string" && /^\s*(?:commit|checkout|restore|revert|reset|apply|clone|merge|rebase|cherry-pick|clean|rm|mv|add)\b/.test(a.args);
  return false;
}
