/**
 * Going back to the version before the last update, days after it.
 *
 * Code never needs a backup of its own: a downloaded program keeps the one it
 * replaced as *.old until the next update (src/self-update.ts), and a source
 * checkout goes back by checking out the previous release tag
 * (`Molfar-Vertep.bat previous`). What can stand in the way is data a newer
 * version migrated: every change of version first copies the engine's own
 * account files aside (`data/.update-snapshot`), and the copy stays until the
 * next change of version.
 *
 * The copy goes back only when the folder's data format moved past it, since
 * that is the one case the older version refuses to start (src/data-format.ts).
 * Otherwise the data is left as it is: putting a days-old users.json or an
 * expired sign-in back would undo what was done since. Workspaces are git
 * repositories and are never touched.
 */
import { lastUsedBy } from "./data-format.js";
import { dropEngineFiles, hasPreviousProgram, readSnapshot, restoreEngineFiles, restoreProgram, saveEngineFiles, snapshotFormat } from "./self-update.js";

/** Before a start migrates anything: when the folder was last used by another
 *  version, copy its account files aside for a later rollback. A downloaded
 *  program's update already took the copy before restarting. */
export function snapshotOnVersionChange(dataDir: string, version: string): boolean {
  const last = lastUsedBy(dataDir);
  if (!last || last.version === version) return false;
  if (readSnapshot(dataDir)?.to === version) return false;
  saveEngineFiles(dataDir, { from: last.version, to: version });
  return true;
}

export interface RollbackOptions {
  /** The version being gone back to, when known (a source checkout's tag). */
  to?: string;
  /** Swap the program files back too (a downloaded program). */
  program?: { dir: string; exe: string };
}

/** Undo the last update: the account files when they must go back, then the
 *  program. Every check runs before anything changes; returns what was done,
 *  one line each. */
export function rollBack(dataDir: string, opts: RollbackOptions): string[] {
  const done: string[] = [];
  const snap = readSnapshot(dataDir);
  const to = opts.to ?? snap?.from;
  if (opts.program && !hasPreviousProgram(opts.program.dir, opts.program.exe)) {
    throw new Error("there is no earlier version next to this one. Only an update made by Molfar Vertep 1.2.2 or newer keeps it. Download the version you want from the releases page instead.");
  }
  const now = lastUsedBy(dataDir)?.format ?? 1;
  const restore = !!snap && now > snapshotFormat(dataDir);
  if (restore && to && snap?.from && snap.from !== to) {
    throw new Error(`the saved account files belong to Molfar Vertep ${snap.from}, not ${to}, and ${to} cannot read the data as it is now. Install ${snap.from} instead. Nothing was changed.`);
  }
  if (restore) {
    restoreEngineFiles(dataDir);
    dropEngineFiles(dataDir);
    done.push(`Accounts, sign-ins and keys are back as they were before the update${snap?.at ? ` (${new Date(snap.at).toLocaleString()})` : ""}: the newer version stored them in a way the older one cannot read.`);
  } else {
    done.push("Your data stays as it is: the older version reads it.");
  }
  if (opts.program) {
    restoreProgram(opts.program.dir, opts.program.exe);
    done.push(`Molfar Vertep ${to ?? "from before the last update"} is back in ${opts.program.dir}. Start it as usual.`);
  }
  return done;
}
