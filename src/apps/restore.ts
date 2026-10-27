/**
 * Putting an installed app's code back to the version it shipped in.
 *
 * An app that does not start leaves no way into the interface to fix it: a
 * conflict marker left in a plugin by an update (strategy "agent"), a plugin
 * the built-in agent broke, an update cut short. Every app keeps the tree of
 * the version it was installed or last updated from (the baseline, outside the
 * workspace, src/apps/update.ts); this writes that tree over the app's code.
 * data/, the manifest and node_modules are never touched, and the workspace
 * history keeps the files being replaced (one commit says what was done).
 */
import fs from "node:fs";
import path from "node:path";
import { applyWrites, readBaseline, readCodeTree, replaceTree } from "./update.js";
import * as git from "../git.js";
import { userPaths } from "../paths.js";

export interface AppProblem {
  file: string;
  what: string;
}

export interface RestorePlan {
  app: string;
  user: string;
  /** the shipped version the code goes back to */
  version: string;
  /** what keeps the app from starting, as found now (empty: nothing found, the restore still replaces every edited file) */
  problems: AppProblem[];
  /** what the shipped tree itself would still have wrong: restoring would not help */
  shippedProblems: AppProblem[];
  changed: string[];
  added: string[];
  removed: string[];
}

const CODE_FILE = /\.(?:[cm]?js|jsx|tsx?)$/;
const MARKER = /^<<<<<<< .*$/m;

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;

/** Files that cannot run as they are: a merge marker left in the text, or a plugin that does not parse. */
export function codeProblems(tree: Map<string, Buffer>): AppProblem[] {
  const out: AppProblem[] = [];
  const transpiler = new Bun.Transpiler({ loader: "js" });
  for (const [rel, body] of [...tree].sort(([a], [b]) => a.localeCompare(b))) {
    if (!CODE_FILE.test(rel)) continue;
    const text = body.toString("utf8");
    const marker = MARKER.exec(text);
    if (marker) {
      out.push({ file: rel, what: `a merge conflict marker at line ${lineOf(text, marker.index)}` });
      continue;
    }
    // plugins run in a sandbox that reads plain JavaScript: a syntax error there stops the whole app
    if (/^plugins\/[^/]+\/plugin\.js$/.test(rel)) {
      try {
        transpiler.transformSync(text);
      } catch (e) {
        out.push({ file: rel, what: `does not parse (${(e as Error).message.split("\n")[0]})` });
      }
    }
  }
  return out;
}

/** What restoring `appId` for `username` would change, without changing anything. */
export function planRestore(dataDir: string, username: string, appId: string): RestorePlan {
  const p = userPaths(dataDir, username);
  const appDir = path.join(p.apps, appId);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(appId) || !fs.statSync(appDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`no app "${appId}" for ${username}`);
  }
  const baseline = readBaseline(p.appUpstream, appId);
  if (!baseline) throw new Error(`"${appId}" has no saved copy of the version it shipped in, so there is nothing to put back. Update it from its source instead.`);
  const current = readCodeTree(appDir);
  const { writes } = replaceTree(current, baseline.files);
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  for (const [rel, body] of writes) (body === null ? removed : current.has(rel) ? changed : added).push(rel);
  return {
    app: appId,
    user: username,
    version: baseline.version,
    problems: codeProblems(current),
    shippedProblems: codeProblems(baseline.files),
    changed: changed.sort(),
    added: added.sort(),
    removed: removed.sort(),
  };
}

/** Write the shipped code over the app's, drop its built interface (it rebuilds on the next open) and commit the change. */
export async function restoreApp(dataDir: string, username: string, appId: string): Promise<RestorePlan> {
  const plan = planRestore(dataDir, username, appId);
  if (plan.shippedProblems.length) throw new Error(`the saved copy has problems of its own (${plan.shippedProblems.map((x) => x.file).join(", ")}): restoring would not help`);
  const p = userPaths(dataDir, username);
  const appDir = path.join(p.apps, appId);
  const baseline = readBaseline(p.appUpstream, appId)!;
  applyWrites(appDir, replaceTree(readCodeTree(appDir), baseline.files).writes);
  fs.rmSync(path.join(appDir, "dist"), { recursive: true, force: true });
  await git.commitAll(p.root, username, `app(${appId}): restored to the shipped v${plan.version} by the launcher`);
  return plan;
}
