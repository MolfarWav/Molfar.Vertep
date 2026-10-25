/**
 * Checkpoints: a named point an app's code can go back to.
 *
 * Every file write is already a commit, so history was never the problem;
 * finding the right commit and putting one app back was. A checkpoint is a
 * recorded commit for one app (agent/checkpoints.json, outside git). The
 * engine takes one before the first change to an app in each agent run, and
 * the agent takes one before building a feature. Restore puts back the app's
 * CODE: apps/<id>/ without data/ (chats, characters, saves), .project/
 * (uploads) and the confirmed memory and skills. Data files go back only when
 * named one by one (an agent's bad edit of a card): a blanket data restore
 * would also throw away chats written since. It commits the current state
 * first and records it as a checkpoint too, so a restore is itself undoable.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import * as git from "../git.js";
import type { AskRequest } from "./tools.js";

export interface Checkpoint {
  id: string;
  app: string;
  label: string;
  /** The commit the app's code is restored to. */
  oid: string;
  at: number;
  /** Taken by the engine before a run's first change, not asked for. */
  auto: boolean;
}

const FILE = "agent/checkpoints.json";
const KEEP_PER_APP = 30;
const APP_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/** What a restore leaves alone inside apps/<id>/. */
const KEPT = /^apps\/[^/]+\/(data|\.project|\.memory|\.skills|node_modules|dist)(\/|$)/;

function readAll(root: string): Checkpoint[] {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(root, FILE), "utf8")) as unknown;
    return Array.isArray(v) ? (v as Checkpoint[]).filter((c) => c && typeof c.id === "string" && typeof c.oid === "string" && APP_ID.test(c.app)) : [];
  } catch {
    return [];
  }
}

function writeAll(root: string, list: Checkpoint[]): void {
  const abs = path.join(root, FILE);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(list, null, 2)}\n`, "utf8");
}

function assertApp(root: string, app: string): void {
  if (!APP_ID.test(app) || !fs.existsSync(path.join(root, "apps", app, "manifest.json"))) throw new Error(`no installed app "${app}"`);
}

/** Newest first; one app's only when given. */
export function listCheckpoints(root: string, app?: string): Checkpoint[] {
  return readAll(root)
    .filter((c) => !app || c.app === app)
    .sort((a, b) => b.at - a.at);
}

export function getCheckpoint(root: string, id: string): Checkpoint | undefined {
  return readAll(root).find((c) => c.id === id);
}

/** Commit whatever is pending, then record HEAD for this app. When the app's
 *  newest checkpoint already points at HEAD, that one is returned instead of
 *  a duplicate. */
export async function createCheckpoint(root: string, username: string, app: string, rawLabel: string, auto = false): Promise<Checkpoint> {
  assertApp(root, app);
  const label = rawLabel.replace(/\s+/g, " ").trim().slice(0, 120) || "checkpoint";
  await git.commitAll(root, username, `checkpoint: ${label}`, true);
  const oid = await git.headOid(root);
  if (!oid) throw new Error("the workspace has no commits yet");
  const all = readAll(root);
  const newest = all.filter((c) => c.app === app).sort((a, b) => b.at - a.at)[0];
  if (newest && newest.oid === oid) return newest;
  const cp: Checkpoint = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, app, label, oid, at: Date.now(), auto };
  const mine = [cp, ...all.filter((c) => c.app === app)].sort((a, b) => b.at - a.at).slice(0, KEEP_PER_APP);
  writeAll(root, [...all.filter((c) => c.app !== app), ...mine]);
  return cp;
}

/** The app's code files at a commit (what a restore compares). */
export const codeAt = (root: string, oid: string, app: string) => git.treeFiles(root, oid, `apps/${app}`, (rel) => KEPT.test(rel));

/** The app's data files at a commit. */
const dataAt = (root: string, oid: string, app: string) => git.treeFiles(root, oid, `apps/${app}/data`);

/** Files that differ between two snapshots, plus pending changes under `prefix`. */
async function differing(
  root: string,
  at: (oid: string) => Promise<Map<string, string>>,
  cp: Checkpoint,
  pending: (p: string) => boolean,
): Promise<string[]> {
  const head = await git.headOid(root);
  if (!head) return [];
  const [then, now] = await Promise.all([at(cp.oid), at(head)]);
  const changed = new Set<string>();
  for (const [p, oid] of then) if (now.get(p) !== oid) changed.add(p);
  for (const p of now.keys()) if (!then.has(p)) changed.add(p);
  for (const p of await git.changedPaths(root)) if (pending(p)) changed.add(p);
  return [...changed].sort();
}

/** Code files that differ between a checkpoint and the working tree now
 *  (pending changes included). Empty: the app is where the checkpoint left it. */
export async function changedSince(root: string, cp: Checkpoint): Promise<string[]> {
  const prefix = `apps/${cp.app}/`;
  return differing(root, (oid) => codeAt(root, oid, cp.app), cp, (p) => p.startsWith(prefix) && !KEPT.test(p));
}

/** Data files (apps/<id>/data/) that differ between a checkpoint and now. */
export async function dataChangedSince(root: string, cp: Checkpoint): Promise<string[]> {
  const prefix = `apps/${cp.app}/data/`;
  return differing(root, (oid) => dataAt(root, oid, cp.app), cp, (p) => p.startsWith(prefix));
}

/** A data path as the agent may spell it (workspace-relative, app-relative,
 *  backslashes) in the workspace-relative form git uses. */
export function dataPath(app: string, raw: string): string {
  const p = raw.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
  return p.startsWith("apps/") ? p : `apps/${app}/${p.startsWith("data/") ? p : `data/${p}`}`;
}

/** A data file's content hash now ("" when it is gone): a run records it for each data file it
 *  changed, so a later Undo can tell a file nobody touched since from one edited afterwards. */
export function dataFileHash(root: string, rel: string): string {
  try {
    return crypto.createHash("sha1").update(fs.readFileSync(path.join(root, rel))).digest("hex");
  } catch {
    return "";
  }
}

export interface RestoreResult {
  checkpoint: Checkpoint;
  /** The state just before the restore, to undo it. */
  before: Checkpoint;
  changed: string[];
  /** package.json differs: the app's dependencies need reinstalling. */
  depsChanged: boolean;
  /** Data files left as they are: they changed after the hash the caller expected. */
  keptData: string[];
}

/** Put an app's code back to a checkpoint and commit it. `data` names data
 *  files (paths from dataChangedSince) to put back as well; any other data
 *  stays as it is. `expect` maps a data path to the content hash the caller
 *  saw (dataFileHash): a file that differs now was edited since, and stays. */
export async function restoreCheckpoint(
  root: string,
  username: string,
  id: string,
  data: string[] = [],
  expect: Record<string, string> = {},
): Promise<RestoreResult> {
  const cp = getCheckpoint(root, id);
  if (!cp) throw new Error(`no checkpoint "${id}"`);
  assertApp(root, cp.app);
  // the current state, pending changes included, becomes its own checkpoint
  // a flat label: quoting the restored one nests on every restore of a restore
  const before = await createCheckpoint(root, username, cp.app, `before a restore, ${when(Date.now())}`, true);
  const head = await git.headOid(root);
  if (!head) throw new Error("the workspace has no commits yet");
  const [then, now] = await Promise.all([codeAt(root, cp.oid, cp.app), codeAt(root, head, cp.app)]);
  const changed: string[] = [];
  const keptData: string[] = [];
  for (const [p, oid] of then) {
    if (now.get(p) === oid) continue;
    const abs = path.join(root, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, await git.readBlobOid(root, oid));
    changed.push(p);
  }
  for (const p of now.keys()) {
    if (then.has(p)) continue;
    fs.rmSync(path.join(root, p), { force: true });
    changed.push(p);
  }
  if (data.length) {
    const [dataThen, dataNow] = await Promise.all([dataAt(root, cp.oid, cp.app), dataAt(root, head, cp.app)]);
    for (const p of new Set(data.map((d) => dataPath(cp.app, d)))) {
      // only paths git knows at either point: nothing outside the app's data
      const was = dataThen.get(p);
      if (was === dataNow.get(p)) continue;
      if (typeof expect[p] === "string" && expect[p] !== dataFileHash(root, p)) {
        keptData.push(p);
        continue;
      }
      const abs = path.join(root, p);
      if (was) {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, await git.readBlobOid(root, was));
      } else fs.rmSync(abs, { force: true });
      changed.push(p);
    }
  }
  if (changed.length) await git.commitAll(root, username, `restore: ${cp.app} to "${cp.label}"`, false);
  const pkg = `apps/${cp.app}/package.json`;
  return { checkpoint: cp, before, changed: changed.sort(), depsChanged: then.get(pkg) !== now.get(pkg), keptData: keptData.sort() };
}

// ---------- the agent's tool ----------

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

const when = (at: number): string => new Date(at).toISOString().replace("T", " ").slice(0, 16);

export function buildCheckpointTool(username: string, root: string, ask?: (q: AskRequest) => Promise<string>): AgentTool {
  return {
    name: "checkpoint",
    label: "Checkpoint",
    description:
      'Save or restore a point an app can go back to. action "create" (before building a feature or a risky change; commits pending changes first), "list" (newest first), "restore" (puts the app\'s code back to a checkpoint after the user confirms). Restore leaves data/ alone unless you name data files in `data`: to undo your own edit of a card, lorebook or settings file, pass that file (restore without it lists the data files changed since). The engine also takes one automatically before your first change to an app in each request.',
    parameters: Type.Object({
      action: Type.Union([Type.Literal("create"), Type.Literal("list"), Type.Literal("restore")]),
      app: Type.String({ description: "App id" }),
      label: Type.Optional(Type.String({ description: "create: what you are about to do, e.g. \"before quest tracker\"" })),
      id: Type.Optional(Type.String({ description: "restore: the checkpoint id from list" })),
      data: Type.Optional(
        Type.Array(Type.String(), {
          description: "restore: data files to put back too, e.g. \"data/characters/abc/card.json\". Only files you changed: chats and saves written since would be lost.",
        }),
      ),
    }),
    async execute(_id, params) {
      const { action, app, label, id, data } = params as { action: string; app: string; label?: string; id?: string; data?: string[] };
      if (action === "create") {
        const cp = await createCheckpoint(root, username, app, label ?? "checkpoint");
        return text(`Checkpoint ${cp.id} for ${app}: "${cp.label}". Restore it with checkpoint { action: "restore", app: "${app}", id: "${cp.id}" } if this goes wrong.`);
      }
      if (action === "list") {
        const list = listCheckpoints(root, app).slice(0, 15);
        if (!list.length) return text(`No checkpoints for ${app} yet.`);
        return text(list.map((c) => `- ${c.id} · ${when(c.at)} · ${c.label}${c.auto ? " (auto)" : ""}`).join("\n"));
      }
      if (action === "restore") {
        const cp = id ? getCheckpoint(root, id) : listCheckpoints(root, app)[0];
        if (!cp || cp.app !== app) throw new Error(`no checkpoint "${id ?? ""}" for ${app}: call checkpoint { action: "list" } first`);
        const [changed, dataChanged] = await Promise.all([changedSince(root, cp), dataChangedSince(root, cp)]);
        const asked = [...new Set((data ?? []).map((d) => dataPath(app, d)))];
        const unknown = asked.filter((p) => !dataChanged.includes(p));
        if (unknown.length) {
          const known = dataChanged.length ? `Data files changed since it:\n${dataChanged.slice(0, 40).join("\n")}` : "No data file changed since it.";
          return text(`Not restored: ${unknown.join(", ")} did not change since checkpoint "${cp.label}" (or is not under apps/${app}/data/). ${known}`);
        }
        if (!changed.length && !asked.length) {
          if (!dataChanged.length) return text(`${app} is already as checkpoint "${cp.label}" left it: nothing to restore.`);
          return text(
            `${app}'s code is as checkpoint "${cp.label}" left it. These data files changed since:\n${dataChanged.slice(0, 40).join("\n")}` +
              `${dataChanged.length > 40 ? `\n… and ${dataChanged.length - 40} more` : ""}\n` +
              'To put back the ones you changed, call restore again with data: [their paths]. Leave out chats and saves the user wrote since.',
          );
        }
        if (!ask) return text("Not restored: the user is not available to confirm right now.");
        const files = [...changed, ...asked];
        const shown = files.slice(0, 30).join("\n");
        const what = asked.length ? (changed.length ? "code and the listed data files" : "the listed data files") : "code";
        const answer = (
          await ask({
            question: `Restore ${app}'s ${what} to "${cp.label}" (${when(cp.at)})? ${asked.length ? "Other data, chats" : "Data, chats"} and uploads stay as they are. The current state is saved as a checkpoint first.`,
            options: ["Restore", "Keep as is"],
            detail: `${files.length} file(s) go back:\n${shown}${files.length > 30 ? `\n… and ${files.length - 30} more` : ""}`,
          })
        ).trim();
        if (answer !== "Restore") return text(`Not restored.${answer && answer !== "Keep as is" && answer !== "(no answer)" ? ` The user said: ${answer}` : ""}`);
        const r = await restoreCheckpoint(root, username, cp.id, asked);
        const codeBack = r.changed.some((p) => !p.startsWith(`apps/${app}/data/`));
        return text(
          `Restored ${r.changed.length} file(s) of ${app} to "${cp.label}". The state before is checkpoint ${r.before.id}.` +
            (r.depsChanged ? " package.json changed: reinstall dependencies with app_deps, then run app_check." : codeBack ? " Run app_check to confirm it builds." : ""),
        );
      }
      throw new Error('action must be "create", "list" or "restore"');
    },
  };
}
