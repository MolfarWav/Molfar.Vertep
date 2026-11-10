/**
 * Molfar's mailbox (issue #175): a place where the agent leaves proposals for the user to settle when it suits
 * them, instead of a card that holds up the end of a run. Storage only; the writes a yes causes live in memory.ts.
 *
 * Files, in the user's workspace (under memory/, which the agent's file tools and shell cannot write, so a
 * model cannot forge an item):
 *   memory/mailbox/<id>.json      one item
 *   memory/mailbox/declined.json  normalized texts the user skipped, so the same suggestion is not queued again
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const MAILBOX_DIR = "memory/mailbox";
const DECLINED_FILE = `${MAILBOX_DIR}/declined.json`;
/** The mailbox holds this many items; a new one past it is dropped (the oldest stay, they were asked for first). */
export const MAILBOX_MAX = 50;
const DECLINED_KEEP = 300;
const ID = /^mb-[a-z0-9]{6,40}$/;

/** Where an item came from: the after-run pass, the user's "Later", or a card nobody answered. */
export type MailFrom = "after-run" | "later" | "unanswered";

/** A file that rides with a skill (references/..., scripts/...). */
export interface MailSkillFile {
  path: string;
  content: string;
}

export type MailItem =
  | { v: 1; id: string; kind: "skill"; scope: string; name: string; description: string; body: string; files: MailSkillFile[]; from: MailFrom; at: number }
  | { v: 1; id: string; kind: "add"; scope: string; entry: string; topic?: string; from: MailFrom; at: number }
  | { v: 1; id: string; kind: "replace"; scope: string; entry: string; match: string; topic?: string; from: MailFrom; at: number }
  | { v: 1; id: string; kind: "retire"; scope: string; match: string; from: MailFrom; at: number };

/** An item as the caller describes it (the id and the time are added here). */
export type MailDraft =
  | { kind: "skill"; scope: string; name: string; description: string; body: string; files: MailSkillFile[]; from: MailFrom }
  | { kind: "add"; scope: string; entry: string; topic?: string | undefined; from: MailFrom }
  | { kind: "replace"; scope: string; entry: string; match: string; topic?: string | undefined; from: MailFrom }
  | { kind: "retire"; scope: string; match: string; from: MailFrom };

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

/** What makes two proposals the same: the kind, the scope and the text they would write or remove. A skill is the
 *  same proposal when its name and its whole text are the same (a revised version is a new proposal). */
export function mailSig(d: Pick<MailDraft, "kind" | "scope"> & { entry?: string; match?: string; name?: string; description?: string; body?: string; files?: MailSkillFile[] }): string {
  if (d.kind === "skill") {
    const h = crypto.createHash("sha1");
    h.update(`${d.description ?? ""}|${d.body ?? ""}`);
    for (const f of d.files ?? []) h.update(`|${f.path}|${f.content}`);
    return `skill|${d.scope}|${d.name ?? ""}|${h.digest("hex").slice(0, 16)}`;
  }
  return `${d.kind}|${d.scope}|${norm(d.kind === "retire" ? (d.match ?? "") : (d.entry ?? ""))}`;
}

const dirOf = (root: string): string => path.join(root, MAILBOX_DIR);

function readJson<T>(file: string, dflt: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return dflt;
  }
}

function valid(x: unknown): x is MailItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || !ID.test(o.id) || typeof o.scope !== "string" || !o.scope) return false;
  if (o.kind === "skill") {
    return (
      typeof o.name === "string" && !!o.name && typeof o.description === "string" && typeof o.body === "string" && !!o.body &&
      Array.isArray(o.files) && o.files.every((f) => !!f && typeof f === "object" && typeof (f as MailSkillFile).path === "string" && typeof (f as MailSkillFile).content === "string")
    );
  }
  if (o.kind === "add") return typeof o.entry === "string" && !!o.entry;
  if (o.kind === "replace") return typeof o.entry === "string" && !!o.entry && typeof o.match === "string" && !!o.match;
  return o.kind === "retire" && typeof o.match === "string" && !!o.match;
}

/** The items waiting, oldest first. */
export function listMail(root: string): MailItem[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dirOf(root));
  } catch {
    return [];
  }
  const out: MailItem[] = [];
  for (const n of names) {
    if (!n.endsWith(".json") || n === "declined.json") continue;
    const item = readJson<unknown>(path.join(dirOf(root), n), null);
    if (valid(item)) out.push(item);
  }
  return out.sort((a, b) => a.at - b.at);
}

export const mailCount = (root: string): number => listMail(root).length;

export const getMail = (root: string, id: string): MailItem | undefined => (ID.test(id) ? listMail(root).find((m) => m.id === id) : undefined);

function declinedSigs(root: string): string[] {
  const list = readJson<unknown>(path.join(root, DECLINED_FILE), []);
  return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string") : [];
}

/** True when the user skipped this proposal before. */
export const wasDeclined = (root: string, d: Parameters<typeof mailSig>[0]): boolean => declinedSigs(root).includes(mailSig(d));

/**
 * Leave a proposal in the mailbox. Returns the item, or why it was not kept: `duplicate` (the same one waits),
 * `declined` (the user skipped it before) or `full`.
 */
export function queueMail(root: string, d: MailDraft): { ok: true; item: MailItem } | { ok: false; reason: "duplicate" | "declined" | "full" } {
  const sig = mailSig(d);
  if (declinedSigs(root).includes(sig)) return { ok: false, reason: "declined" };
  const waiting = listMail(root);
  if (waiting.some((m) => mailSig(m) === sig)) return { ok: false, reason: "duplicate" };
  if (waiting.length >= MAILBOX_MAX) return { ok: false, reason: "full" };
  const id = `mb-${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
  // strictly later than everything waiting, so items queued in the same millisecond keep the order they came in
  const at = Math.max(Date.now(), ...waiting.map((m) => m.at + 1));
  const item = { v: 1, id, ...d, at } as MailItem;
  fs.mkdirSync(dirOf(root), { recursive: true });
  fs.writeFileSync(path.join(dirOf(root), `${id}.json`), JSON.stringify(item, null, 2), "utf8");
  return { ok: true, item };
}

/** Take an item out (after a yes it is done; after a skip, `decline` remembers it). */
export function dropMail(root: string, id: string, decline = false): boolean {
  const item = getMail(root, id);
  if (!item) return false;
  fs.rmSync(path.join(dirOf(root), `${id}.json`), { force: true });
  if (decline) {
    rememberDeclined(root, item);
  }
  return true;
}

/** Remember a proposal the user skipped on a live card, so the agent is not allowed to bring it back. */
export function rememberDeclined(root: string, d: Parameters<typeof mailSig>[0]): void {
  const sig = mailSig(d);
  const sigs = [...declinedSigs(root).filter((s) => s !== sig), sig].slice(-DECLINED_KEEP);
  fs.mkdirSync(dirOf(root), { recursive: true });
  fs.writeFileSync(path.join(root, DECLINED_FILE), JSON.stringify(sigs), "utf8");
}
