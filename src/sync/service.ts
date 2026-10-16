/**
 * What the HTTP routes need around push and pull: one job per account at a
 * time (a sync of megabytes outlives a request), the store a device is
 * connected to, and the view of the settings the shell shows.
 */
import fs from "node:fs";
import path from "node:path";
import type { UserPaths } from "../paths.js";
import { DriveAuth, DriveStore, driveClient } from "./drive.js";
import { ConflictError, type CheckResult, type Progress, type PullResult, type PushResult } from "./engine.js";
import { type ConflictGroup, type Scope, SyncError } from "./manifest.js";
import { type SyncState, readState } from "./state.js";
import { FolderStore, type SyncStore } from "./store.js";

export type JobKind = "check" | "push" | "pull";

export interface Job {
  id: number;
  kind: JobKind;
  running: boolean;
  progress: Progress;
  startedAt: string;
  finishedAt?: string;
  error?: { message: string; status: number; conflicts?: ConflictGroup[]; rev?: number };
  result?: CheckResult | PushResult | PullResult;
}

export class SyncJobs {
  private jobs = new Map<string, Job>();
  private seq = 0;

  get(username: string): Job | null {
    return this.jobs.get(username) ?? null;
  }

  busy(username: string): boolean {
    return !!this.jobs.get(username)?.running;
  }

  /** Start `work` as this account's job; refused while one runs. `done`
   *  runs after a success, before the job reports finished. */
  start<T extends Job["result"]>(username: string, kind: JobKind, work: (progress: (p: Progress) => void) => Promise<T>, done?: (r: T) => Promise<void> | void): Job {
    if (this.busy(username)) throw new SyncError("a sync is already running", 409);
    const job: Job = { id: ++this.seq, kind, running: true, progress: { phase: "scan", done: 0, total: 0, bytes: 0 }, startedAt: new Date().toISOString() };
    this.jobs.set(username, job);
    void (async () => {
      try {
        const r = await work((p) => {
          job.progress = p;
        });
        await done?.(r);
        job.result = r;
      } catch (e) {
        job.error = e instanceof ConflictError
          ? { message: e.message, status: 409, conflicts: e.groups, rev: e.rev }
          : { message: (e as Error).message, status: e instanceof SyncError ? e.status : 500 };
      } finally {
        job.running = false;
        job.finishedAt = new Date().toISOString();
      }
    })();
    return job;
  }
}

export const credDirOf = (p: UserPaths): string => path.dirname(p.auth);

export function storeFor(state: SyncState): SyncStore {
  const t = state.target;
  if (!t) throw new SyncError("choose where to sync first", 400);
  if (t.kind === "folder") {
    if (!fs.existsSync(t.path)) throw new SyncError(`the sync folder ${t.path} is not there (a drive not plugged in?)`, 404);
    return new FolderStore(t.path);
  }
  const client = driveClient(state.client);
  if (!client) throw new SyncError("this build has no Google client: add your own in Advanced", 400);
  if (!t.folderId) throw new SyncError("sign in with Google again", 400);
  return new DriveStore(new DriveAuth(client, t.refreshToken), t.folderId);
}

export interface SyncView {
  device: { id: string; name: string };
  scope: Scope;
  target: { kind: "drive"; account: string } | { kind: "folder"; path: string } | null;
  /** a Google client is available (built in, from the environment, or the user's) */
  drive: { available: boolean; ownClient: boolean };
  passphrase: boolean;
  last: SyncState["last"] | null;
  base: number | null;
  job: Job | null;
}

export function viewOf(p: UserPaths, jobs: SyncJobs, username: string): SyncView {
  const s = readState(credDirOf(p));
  const t = s.target;
  return {
    device: { id: s.deviceId, name: s.deviceName },
    scope: s.scope,
    target: t ? (t.kind === "drive" ? { kind: "drive", account: t.account ?? "" } : { kind: "folder", path: t.path }) : null,
    drive: { available: !!driveClient(s.client), ownClient: !!s.client },
    passphrase: !!s.passphrase,
    last: s.last ?? null,
    base: s.base?.rev ?? null,
    job: jobs.get(username),
  };
}
