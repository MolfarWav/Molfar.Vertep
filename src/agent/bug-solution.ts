/**
 * A bug fixed in the user's copy, handed back to the maintainers.
 *
 * The shell's "Report a bug" dialog can ask Molfar first. Molfar takes a
 * checkpoint, finds and fixes the bug in the user's apps, and closes with
 * `bug_solution`: the agent page shows a card from the tool's arguments. When
 * the user says it works, the page asks the engine for the patch (the app's
 * code since that checkpoint, never data/, memory or uploads) and opens a
 * pre-filled GitHub issue; nothing is sent from the engine. When Molfar could
 * not fix it, the same card opens the ordinary bug form with what it found.
 */
import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { createTwoFilesPatch } from "diff";
import * as git from "../git.js";
import { changedSince, codeAt, getCheckpoint } from "./checkpoints.js";

/** Bigger than this, a file is listed but not diffed. */
const MAX_FILE_BYTES = 256 * 1024;
/** The whole patch: past this, files are listed without their diff. */
const MAX_PATCH_CHARS = 400_000;
const LOCKFILE = /(^|\/)(bun\.lockb?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/;

const isText = (b: Uint8Array): boolean => !Buffer.from(b.subarray(0, 8000)).includes(0);

/** What a reader should look at before a file leaves the workspace (an app
 *  release, a bug fix sent to GitHub). Shared with scripts/publish-app.ts. */
export function patchWarnings(rel: string, body: Uint8Array | undefined, username: string): string[] {
  const out: string[] = [];
  if (LOCKFILE.test(rel)) out.push("lockfile: do not copy, run bun install in the clone");
  if (rel.startsWith(".skills/")) out.push("app skill: publish only if it is general, not about this user");
  if (!body) return out;
  if (body.length > 1024 * 1024) out.push(`large (${Math.round(body.length / 1024)} KB)`);
  if (!isText(body)) return out;
  const text = Buffer.from(body).toString("utf8");
  if (/^(<<<<<<<|>>>>>>>) /m.test(text)) out.push("conflict markers");
  if (/(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|secret|token|password)["']?\s*[:=]\s*["'][^"'\s]{8,})/i.test(text)) out.push("looks like a secret");
  if (/[A-Za-z]:[\\/]{1,2}Users[\\/]|\/home\/[a-z]|\/Users\/[a-z]/.test(text)) out.push("absolute local path");
  if (username && new RegExp(`\\b${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text)) out.push(`mentions the user name "${username}"`);
  return out;
}

export interface SolutionFile {
  /** App-relative, as in the app's own repository. */
  path: string;
  status: "added" | "modified" | "deleted";
  warnings: string[];
}

export interface SolutionPatch {
  app: string;
  appVersion: string | null;
  checkpoint: { id: string; label: string; at: number };
  files: SolutionFile[];
  /** Unified diff, paths relative to the app (applies with `git apply` in its repository). */
  patch: string;
}

/** The app's code changes since a checkpoint, as a patch the user can send. */
export async function solutionPatch(root: string, username: string, app: string, checkpointId: string): Promise<SolutionPatch> {
  const cp = getCheckpoint(root, checkpointId);
  if (!cp || cp.app !== app) throw new Error(`no checkpoint "${checkpointId}" for ${app}`);
  const prefix = `apps/${app}/`;
  const [changed, then] = await Promise.all([changedSince(root, cp), codeAt(root, cp.oid, app)]);
  const files: SolutionFile[] = [];
  const parts: string[] = [];
  let size = 0;
  for (const p of changed) {
    if (!p.startsWith(prefix)) continue;
    const rel = p.slice(prefix.length);
    const was = then.get(p);
    const before = was ? await git.readBlobOid(root, was) : null;
    let after: Uint8Array | null = null;
    try {
      after = fs.readFileSync(path.join(root, p));
    } catch {
      after = null;
    }
    if (!before && !after) continue;
    const status = !before ? "added" : !after ? "deleted" : "modified";
    const warnings = patchWarnings(rel, after ?? undefined, username);
    files.push({ path: rel, status, warnings });
    if (LOCKFILE.test(rel)) continue;
    const a = before ?? new Uint8Array();
    const b = after ?? new Uint8Array();
    let piece: string;
    if (!isText(a) || !isText(b)) piece = `diff --git a/${rel} b/${rel}\nBinary files differ\n`;
    else if (a.length + b.length > MAX_FILE_BYTES) piece = `diff --git a/${rel} b/${rel}\n(too large to include: ${a.length} -> ${b.length} bytes)\n`;
    else {
      const body = createTwoFilesPatch(before ? `a/${rel}` : "/dev/null", after ? `b/${rel}` : "/dev/null", Buffer.from(a).toString("utf8"), Buffer.from(b).toString("utf8"), "", "", { context: 3 });
      // git's own shape, so `git apply` takes it: mode lines, no tab after the names
      const mode = !before ? "new file mode 100644\n" : !after ? "deleted file mode 100644\n" : "";
      piece = `diff --git a/${rel} b/${rel}\n${mode}${body.replace(/^(Index [^\n]*\n)?={10,}\n/, "").replace(/^(---|\+\+\+) (.*)\t$/gm, "$1 $2")}`;
    }
    if (size + piece.length > MAX_PATCH_CHARS) piece = `diff --git a/${rel} b/${rel}\n(left out: the patch is already too long)\n`;
    size += piece.length;
    parts.push(piece.endsWith("\n") ? piece : `${piece}\n`);
  }
  let appVersion: string | null = null;
  try {
    const m = JSON.parse(fs.readFileSync(path.join(root, "apps", app, "manifest.json"), "utf8")) as { version?: unknown };
    if (typeof m.version === "string") appVersion = m.version;
  } catch {
    // a missing manifest leaves the version unknown
  }
  return { app, appVersion, checkpoint: { id: cp.id, label: cp.label, at: cp.at }, files, patch: parts.join("") };
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

export function buildBugSolutionTool(username: string, root: string): AgentTool {
  return {
    name: "bug_solution",
    label: "Bug solution",
    description:
      "Close work on a bug the user reported (skill fix-bug). Shows the user a card: solved = true gives \"It works, send the fix\", which turns your text and the app's code changes since `checkpoint` into a GitHub issue the user reviews and posts; solved = false gives \"Report it\" with what you found. Call it once the user has tried the fix (or you are sure you cannot fix it: an engine bug, nothing to reproduce). Write the texts in English: they go to the maintainers.",
    parameters: Type.Object({
      solved: Type.Boolean({ description: "true: fixed and the user confirmed it works. false: not fixed." }),
      problem: Type.String({ description: "The bug as the user reported it, one or two sentences." }),
      cause: Type.String({ description: "What caused it, as far as you found. Name files and functions." }),
      fix: Type.String({ description: "solved: what you changed and why. Not solved: what you tried and what is still unknown." }),
      verify: Type.Optional(Type.String({ description: "How to check the fix (steps)." })),
      app: Type.Optional(Type.String({ description: "The app the fix changed, e.g. roleplay. Omit when no app code changed." })),
      checkpoint: Type.Optional(Type.String({ description: "The checkpoint id you created before the fix: the patch is the app's code since it." })),
    }),
    async execute(_id, params) {
      const p = params as { solved: boolean; problem: string; cause: string; fix: string; verify?: string; app?: string; checkpoint?: string };
      if (!p.problem?.trim() || !p.cause?.trim() || !p.fix?.trim()) throw new Error("problem, cause and fix are required");
      if (!p.app) return text(`The user sees the ${p.solved ? "solution" : "report"} card. No app code goes with it.`);
      if (!p.checkpoint) throw new Error(`name the checkpoint taken before the fix: checkpoint { action: "list", app: "${p.app}" }`);
      const sp = await solutionPatch(root, username, p.app, p.checkpoint);
      if (!sp.files.length) {
        return text(
          p.solved
            ? `No code of ${p.app} changed since checkpoint "${sp.checkpoint.label}": the card sends the description only. If the fix was in code, the checkpoint is too late: pass an older one.`
            : `The user sees the report card; no code of ${p.app} changed since checkpoint "${sp.checkpoint.label}".`,
        );
      }
      const warned = sp.files.filter((f) => f.warnings.length);
      return text(
        `The user sees the ${p.solved ? "solution" : "report"} card. ${p.solved ? "The patch carries" : "Changed since the checkpoint (not sent with a report)"}: ${sp.files.map((f) => `${f.status} ${f.path}`).join(", ")}.` +
          (warned.length ? ` Check before the user sends it: ${warned.map((f) => `${f.path} (${f.warnings.join("; ")})`).join(", ")}.` : ""),
      );
    },
  };
}
