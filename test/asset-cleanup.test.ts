/** Clean up pictures nothing links to (issue #171): what counts as a
 *  reference, the 7-day grace, the trash and its restore, the server-side
 *  rescan, and the shell-only routes. A wrong answer here deletes a user's
 *  pictures, so each rule has a test. */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { putAsset, getAsset, readManifest, writeManifest } from "../src/assets/store.js";
import { cleanAssets, planCleanup, listTrash, restoreFromTrash, emptyTrash, purgeExpiredTrash, GRACE_MS, TRASH_MS, CleanupError } from "../src/assets/cleanup.js";
import { bootstrapUserDir, type UserPaths } from "../src/paths.js";
import { defaultInstanceConfig } from "../src/config.js";

const DAY = 24 * 3600 * 1000;
let dir: string;
let p: UserPaths;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "asset-cleanup-"));
  p = bootstrapUserDir(dir, "alice");
});
afterEach(() => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* watcher races */ }
});

const sha = (s: string) => crypto.createHash("sha256").update(Buffer.from(s)).digest("hex");

/** Store a picture and make it `days` old (record times and the file's own mtime). */
function pic(content: string, days = 10): string {
  const rec = putAsset(p, Buffer.from(content), "image/png", `${content}.png`);
  age(rec.id, days);
  return rec.id;
}
function age(id: string, days: number): void {
  const m = readManifest(p);
  const t = Date.now() - days * DAY;
  m[id] = { ...m[id]!, createdAt: t, storedAt: t };
  writeManifest(p, m);
  const when = new Date(t);
  fs.utimesSync(path.join(p.assetsStore, id.slice(0, 2), id), when, when);
}
function write(rel: string, text: string): void {
  const f = path.join(p.root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
}
const ids = (): string[] => Object.keys(readManifest(p)).sort();

describe("what counts as a reference", () => {
  it("a referenced asset is never a candidate, whatever its age", async () => {
    const id = pic("kept", 400);
    write("apps/roleplay/data/characters/c1/card.json", JSON.stringify({ avatar: `/v1/assets/${id}` }));
    const plan = await planCleanup(p);
    expect(plan.count).toBe(0);
    expect(plan.referenced).toBe(1);
    const r = await cleanAssets(p);
    expect(r.trashed).toBe(0);
    expect(getAsset(p, id)).not.toBeNull();
  });

  it("a bare id, an uppercase id, an id in a URL or glued to other hex all keep the picture", async () => {
    const a = pic("bare");
    const b = pic("upper");
    const c = pic("url");
    const d = pic("glued");
    const e = pic("unreferenced");
    write("apps/x/data/a.json", JSON.stringify({ sprite: a }));
    write("notes/b.md", `see ${b.toUpperCase()} here`);
    write("apps/x/data/c.json", JSON.stringify({ img: `https://localhost:8788/v1/assets/${c}?x=1` }));
    write("apps/x/data/d.txt", `deadbeef${d}cafebabe`);
    const plan = await planCleanup(p);
    expect(plan.referenced).toBe(4);
    expect(plan.sample.map((s) => s.id)).toEqual([e]);
    await cleanAssets(p);
    expect(ids()).toEqual([a, b, c, d].sort());
  });

  it("an id split across a read block is still found", async () => {
    const id = pic("seam");
    // the id straddles the 1 MiB block boundary
    write("apps/x/data/big.json", "x".repeat(1024 * 1024 - 20) + id + "y");
    expect((await planCleanup(p)).referenced).toBe(1);
  });

  it("chats, Molfar's files and plugin stores count; built output, dependencies and the store itself do not", async () => {
    const chat = pic("chat");
    const agentLog = pic("agent");
    const store = pic("pluginstore");
    const dist = pic("dist");
    const mods = pic("mods");
    const self = pic("selfref");
    write("apps/rp/data/chats/1.jsonl", `{"m":"/v1/assets/${chat}"}\n`);
    write("agent/sessions/s.jsonl", `{"u":"${agentLog}"}\n`);
    write("store/rp/state.json", `{"x":"${store}"}`);
    write("apps/rp/dist/index.js", `"${dist}"`);
    write("apps/rp/node_modules/pkg/i.js", `"${mods}"`);
    // the store's own manifest names every id and must not protect them
    expect(fs.readFileSync(path.join(p.assetsStore, "manifest.json"), "utf8")).toContain(self);
    await cleanAssets(p);
    expect(ids()).toEqual([chat, agentLog, store].sort());
  });

  it("pictures and other binary files are not read", async () => {
    const id = pic("in-a-png");
    fs.mkdirSync(path.join(p.root, "apps/x"), { recursive: true });
    fs.writeFileSync(path.join(p.root, "apps/x/pic.png"), Buffer.from(id));
    expect((await planCleanup(p)).count).toBe(1);
  });
});

describe("the grace period and the trash", () => {
  it("a young unreferenced asset is skipped, an old one is trashed and comes back on Restore", async () => {
    const young = pic("young", 6);
    const old = pic("old", 8);
    const plan = await planCleanup(p);
    expect(plan.count).toBe(1);
    expect(plan.tooYoung).toBe(1);
    const r = await cleanAssets(p);
    expect(r.trashed).toBe(1);
    expect(ids()).toEqual([young]);
    expect(getAsset(p, old)).toBeNull();
    const t = listTrash(p);
    expect(t.items.map((i) => i.id)).toEqual([old]);
    expect(t.items[0]!.name).toBe("old.png");
    const back = restoreFromTrash(p, [old]);
    expect(back.restored).toEqual([old]);
    const got = getAsset(p, old);
    expect(got?.bytes.toString()).toBe("old");
    expect(got?.record.name).toBe("old.png");
    expect(got?.record.mime).toBe("image/png");
    expect(listTrash(p).count).toBe(0);
    // restored means young again: the next cleanup leaves it alone
    expect((await cleanAssets(p)).trashed).toBe(0);
  });

  it("a file touched since (a re-upload refreshes it) is young however old the record", async () => {
    const id = pic("again", 30);
    putAsset(p, Buffer.from("again"), "image/png", null, "someapp");
    expect(readManifest(p)[id]!.storedAt!).toBeGreaterThan(Date.now() - 5000);
    expect(readManifest(p)[id]!.createdAt).toBeLessThan(Date.now() - 20 * DAY);
    expect((await planCleanup(p)).count).toBe(0);
    // a record from before storedAt existed is judged by createdAt and the file's mtime
    const legacy = pic("legacy", 30);
    const m = readManifest(p);
    delete m[legacy]!.storedAt;
    writeManifest(p, m);
    expect((await planCleanup(p)).count).toBe(1);
    const now = new Date();
    fs.utimesSync(path.join(p.assetsStore, legacy.slice(0, 2), legacy), now, now);
    expect((await planCleanup(p)).count).toBe(0);
  });

  it("the server scans again on act: a reference added after the plan protects the asset", async () => {
    const id = pic("late");
    const other = pic("other");
    expect((await planCleanup(p)).count).toBe(2);
    write("apps/x/data/new.json", JSON.stringify({ pic: id }));
    const r = await cleanAssets(p);
    expect(r.trashed).toBe(1);
    expect(ids()).toEqual([id]);
    expect(listTrash(p).items.map((i) => i.id)).toEqual([other]);
  });

  it("a client's id list can only narrow the set, never widen it", async () => {
    const a = pic("a");
    const b = pic("b");
    const kept = pic("kept");
    write("apps/x/data/k.json", `"${kept}"`);
    const r = await cleanAssets(p, { ids: [a, kept, sha("never stored")] });
    expect(r.trashed).toBe(1);
    expect(ids()).toEqual([b, kept].sort());
  });

  it("a reference written while the pictures are being moved puts them back", async () => {
    const id = pic("racy");
    // the file appears in the middle of the cleanup, after the scan has passed
    let wrote = false;
    const r = await cleanAssets(p, {
      progress: (pr) => {
        if (pr.phase === "move" && !wrote) {
          wrote = true;
          write("apps/x/data/racy.json", JSON.stringify({ pic: id }));
        }
      },
    });
    expect(wrote).toBe(true);
    expect(r.putBack).toBe(1);
    expect(r.trashed).toBe(0);
    expect(getAsset(p, id)).not.toBeNull();
    expect(listTrash(p).count).toBe(0);
  });

  it("an upload of the same bytes while earlier batches are moving keeps that picture", async () => {
    // 101 old pictures: the move goes in batches of 100, and the last picture
    // waits for the second batch, which re-reads the record before it moves
    const all: string[] = [];
    for (let i = 0; i < 101; i++) all.push(pic(`bulk ${i}`));
    const last = all[100]!;
    let uploaded = false;
    const r = await cleanAssets(p, {
      progress: (pr) => {
        if (pr.phase === "move" && !uploaded) {
          uploaded = true;
          putAsset(p, Buffer.from("bulk 100"), "image/png", null, "app");
        }
      },
    });
    expect(uploaded).toBe(true);
    expect(r.trashed).toBe(100);
    expect(r.spared).toBe(1);
    expect(getAsset(p, last)).not.toBeNull();
    expect(listTrash(p).items.map((i) => i.id)).not.toContain(last);
  }, 30_000);

  it("trash expiry purges after 30 days, not before", () => {
    const old = pic("expire");
    return cleanAssets(p).then(() => {
      expect(listTrash(p, Date.now() + 29 * DAY).count).toBe(1);
      const view = listTrash(p, Date.now() + TRASH_MS + DAY);
      expect(view.count).toBe(0);
      expect(view.purged).toBe(1);
      expect(fs.existsSync(path.join(p.assetsStore, ".trash", old.slice(0, 2), old))).toBe(false);
      expect(purgeExpiredTrash(p)).toBe(0);
    });
  });

  it("re-uploading trashed content works, and restoring then drops only an equal trash copy", async () => {
    const id = pic("twice");
    await cleanAssets(p);
    expect(getAsset(p, id)).toBeNull();
    // uploaded again while the trash holds it
    const rec = putAsset(p, Buffer.from("twice"), "image/png", "again.png", "app");
    expect(rec.id).toBe(id);
    expect(getAsset(p, id)?.bytes.toString()).toBe("twice");
    const back = restoreFromTrash(p, [id]);
    expect(back.already).toEqual([id]);
    expect(back.restored).toEqual([]);
    expect(listTrash(p).count).toBe(0);
    const got = getAsset(p, id)!;
    expect(got.bytes.toString()).toBe("twice");
    expect(got.record.name).toBe("again.png"); // the live record is not clobbered
    expect(got.record.apps).toEqual(["app"]);
  });

  it("restore keeps a trash copy whose bytes do not match the live file's id", async () => {
    const id = pic("keepme");
    await cleanAssets(p);
    putAsset(p, Buffer.from("keepme"), "image/png");
    // damage the trash copy: it no longer hashes to its id
    fs.writeFileSync(path.join(p.assetsStore, ".trash", id.slice(0, 2), id), "something else");
    const back = restoreFromTrash(p, [id]);
    expect(back.kept).toEqual([id]);
    expect(listTrash(p).count).toBe(1);
    expect(getAsset(p, id)?.bytes.toString()).toBe("keepme");
  });

  it("restore refuses when the store has no room, and reports ids it does not hold", async () => {
    const id = pic("big");
    await cleanAssets(p);
    const none = restoreFromTrash(p, [id], { limits: { maxBytes: 100, maxTotalBytes: 1 } });
    expect(none.kept).toEqual([id]);
    expect(listTrash(p).count).toBe(1);
    expect(restoreFromTrash(p, [sha("nothing")]).missing).toEqual([sha("nothing")]);
    expect(restoreFromTrash(p, null).restored).toEqual([id]);
  });

  it("emptying the trash removes the files for good", async () => {
    const id = pic("gone");
    await cleanAssets(p);
    const r = emptyTrash(p);
    expect(r.removed).toBe(1);
    expect(listTrash(p).count).toBe(0);
    expect(fs.existsSync(path.join(p.assetsStore, ".trash", id.slice(0, 2), id))).toBe(false);
  });

  it("a trash index that cannot be read is never overwritten", async () => {
    pic("x");
    await cleanAssets(p);
    fs.writeFileSync(path.join(p.assetsStore, ".trash", "manifest.json"), "{ not json");
    pic("y");
    await expect(cleanAssets(p)).rejects.toBeInstanceOf(CleanupError);
    expect(fs.readFileSync(path.join(p.assetsStore, ".trash", "manifest.json"), "utf8")).toBe("{ not json");
  });
});

describe("files the scan could not read", () => {
  it("a file over the size cap is reported and blocks the cleanup unless overridden", async () => {
    const id = pic("blocked");
    write("apps/x/data/huge.json", "y".repeat(200_000));
    const plan = await planCleanup(p, { maxFileBytes: 100_000 });
    expect(plan.skippedCount).toBe(1);
    expect(plan.skipped[0]).toEqual({ path: "apps/x/data/huge.json", reason: "too-large" });
    await expect(cleanAssets(p, { maxFileBytes: 100_000 })).rejects.toMatchObject({ code: "skipped" });
    expect(getAsset(p, id)).not.toBeNull();
    expect(listTrash(p).count).toBe(0);
    const forced = await cleanAssets(p, { maxFileBytes: 100_000, overrideSkipped: true });
    expect(forced.trashed).toBe(1);
  });

  it("links are not followed out of the folder", async () => {
    const id = pic("outside");
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
    try {
      fs.writeFileSync(path.join(outside, "refs.json"), JSON.stringify({ id }));
      try {
        fs.symlinkSync(outside, path.join(p.root, "linked"), "dir");
      } catch {
        return; // no permission to make links here (Windows without developer mode)
      }
      const plan = await planCleanup(p);
      expect(plan.links).toBe(1);
      expect(plan.count).toBe(1);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("the shell-only routes", () => {
  async function appFor() {
    const { buildApp } = await import("../src/server/app.js");
    const { UserService } = await import("../src/users.js");
    const { SessionService } = await import("../src/sessions.js");
    const { EventBus } = await import("../src/server/ws.js");
    const users = new UserService(dir);
    users.create("admin", "admin", { password: "admin-pass-1" });
    const { token } = users.create("alice", "user", { password: "test-pass-1" });
    const app = buildApp({ users, sessions: new SessionService(dir), config: defaultInstanceConfig(), dataDir: dir, bus: new EventBus() as never });
    const up = bootstrapUserDir(dir, "alice");
    return { app, token, up };
  }

  it("plan, clean, trash list, thumbnail, restore and empty work for the shell, and the picture leaves /v1/assets", async () => {
    const { app, token, up } = await appFor();
    p = up;
    const old = pic("route picture");
    pic("route kept");
    write("apps/x/data/k.json", `"${sha("route kept")}"`);
    const h = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const json = async (url: string, init?: RequestInit) => {
      const res = await app.request(url, { ...init, headers: { ...h, ...(init?.headers as Record<string, string> | undefined) } });
      return { status: res.status, body: (await res.json().catch(() => null)) as any };
    };
    const waitJob = async () => {
      for (let i = 0; i < 100; i++) {
        const { body } = await json("/v1/storage/assets/job");
        if (body.job && !body.job.running) return body.job;
        await new Promise((r) => setTimeout(r, 20));
      }
      throw new Error("job did not finish");
    };
    const summary = await json("/v1/storage/assets");
    expect(summary.body.store.count).toBe(2);
    const started = await json("/v1/storage/assets/plan", { method: "POST" });
    expect(started.status).toBe(200);
    const planned = await waitJob();
    expect(planned.result.count).toBe(1);
    expect(planned.result.sample[0].id).toBe(old);
    // a client list cannot name a picture the fresh scan protects
    await json("/v1/storage/assets/clean", { method: "POST", body: JSON.stringify({ ids: [old, sha("route kept")] }) });
    const cleaned = await waitJob();
    expect(cleaned.result.trashed).toBe(1);
    expect((await app.request(`/v1/assets/${old}`, { headers: h })).status).toBe(404);
    const trash = await json("/v1/storage/assets/trash");
    expect(trash.body.items.map((i: any) => i.id)).toEqual([old]);
    const thumb = await app.request(`/v1/storage/assets/trash/${old}/file`, { headers: h });
    expect(thumb.status).toBe(200);
    expect(thumb.headers.get("content-type")).toBe("image/png");
    expect(await thumb.text()).toBe("route picture");
    expect((await json("/v1/storage/assets/trash/restore", { method: "POST", body: "{}" })).status).toBe(400);
    expect((await json("/v1/storage/assets/trash/restore", { method: "POST", body: JSON.stringify({ ids: ["../../x"] }) })).status).toBe(400);
    const restored = await json("/v1/storage/assets/trash/restore", { method: "POST", body: JSON.stringify({ ids: [old] }) });
    expect(restored.body.restored).toEqual([old]);
    expect((await app.request(`/v1/assets/${old}`, { headers: h })).status).toBe(200);
    await json("/v1/storage/assets/clean", { method: "POST", body: JSON.stringify({ ids: [old] }) });
    expect((await waitJob()).result.trashed).toBe(0); // restored means young
    // emptying needs the explicit flag
    age(old, 20);
    await json("/v1/storage/assets/clean", { method: "POST", body: "{}" });
    await waitJob();
    expect((await json("/v1/storage/assets/trash/empty", { method: "POST", body: "{}" })).status).toBe(400);
    expect((await json("/v1/storage/assets/trash")).body.count).toBe(1);
    const emptied = await json("/v1/storage/assets/trash/empty", { method: "POST", body: JSON.stringify({ confirm: true }) });
    expect(emptied.body.removed).toBe(1);
    expect((await json("/v1/storage/assets/trash")).body.count).toBe(0);
  }, 30_000);

  it("an app, shipped or not, is refused on every route", async () => {
    const { app, token, up } = await appFor();
    p = up;
    for (const id of ["one", "roleplay"]) {
      fs.mkdirSync(path.join(up.apps, id), { recursive: true });
      fs.writeFileSync(path.join(up.apps, id, "manifest.json"), JSON.stringify({ name: id, version: "1", kind: "app" }));
    }
    const old = pic("app cannot reach");
    const routes: Array<[string, string]> = [
      ["GET", "/v1/storage/assets"],
      ["GET", "/v1/storage/assets/job"],
      ["POST", "/v1/storage/assets/plan"],
      ["POST", "/v1/storage/assets/clean"],
      ["GET", "/v1/storage/assets/trash"],
      ["GET", `/v1/storage/assets/trash/${old}/file`],
      ["POST", "/v1/storage/assets/trash/restore"],
      ["POST", "/v1/storage/assets/trash/empty"],
    ];
    for (const appId of ["one", "roleplay"]) {
      for (const [method, url] of routes) {
        const res = await app.request(url, {
          method,
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-molfar-app": appId },
          ...(method === "POST" ? { body: JSON.stringify({ all: true, confirm: true, overrideSkipped: true }) } : {}),
        });
        expect(res.status, `${appId} ${method} ${url}`).toBe(403);
      }
    }
    // nothing happened
    expect(getAsset(p, old)).not.toBeNull();
    expect(listTrash(p).count).toBe(0);
  }, 30_000);
});

describe("constants", () => {
  it("the grace is 7 days and the trash 30", () => {
    expect(GRACE_MS).toBe(7 * DAY);
    expect(TRASH_MS).toBe(30 * DAY);
  });
});
