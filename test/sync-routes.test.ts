// The sync routes (GitHub #38): two engines with one shared folder, push and
// pull as jobs, a conflict answered through the route, the folder store for
// admins only, and the public Google callback that takes only a live state.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir } from "../src/paths.js";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-routes-"));
});
afterEach(() => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* watcher races */ }
});

async function engine(name: string) {
  const { buildApp } = await import("../src/server/app.js");
  const { UserService } = await import("../src/users.js");
  const { SessionService } = await import("../src/sessions.js");
  const { EventBus } = await import("../src/server/ws.js");
  const dataDir = path.join(dir, name);
  fs.mkdirSync(dataDir, { recursive: true });
  const users = new UserService(dataDir);
  const admin = users.create("mia", "admin", { password: "admin-pass-1" });
  const plain = users.create("bob", "user", { password: "user-pass-1" });
  const p = bootstrapUserDir(dataDir, "mia");
  bootstrapUserDir(dataDir, "bob");
  const config = { ...defaultInstanceConfig(), apps: { ...defaultInstanceConfig().apps, packageDownloads: false } };
  const app = buildApp({ users, sessions: new SessionService(dataDir), config, dataDir, bus: new EventBus() as never });
  const call = (method: string, route: string, body?: unknown, token = admin.token) =>
    app.request(route, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  /** start a job and wait for it to end */
  const job = async (route: string, body?: unknown) => {
    const r = await call("POST", route, body ?? {});
    expect(r.status).toBe(200);
    for (;;) {
      const j = ((await (await call("GET", "/v1/sync/job")).json()) as { job: { running: boolean; error?: { message: string; conflicts?: { id: string }[]; rev?: number }; result?: Record<string, unknown> } }).job;
      if (!j.running) return j;
      await new Promise((res) => setTimeout(res, 20));
    }
  };
  const put = (rel: string, body: string) => {
    fs.mkdirSync(path.dirname(path.join(p.root, rel)), { recursive: true });
    fs.writeFileSync(path.join(p.root, rel), body);
  };
  return { app, call, job, put, p, plainToken: plain.token };
}

describe("sync routes", () => {
  it("push on one engine, pull on the other, a conflict answered by its group", async () => {
    const store = path.join(dir, "shared");
    const desk = await engine("desk");
    const phone = await engine("phone");
    for (const e of [desk, phone]) expect((await e.call("POST", "/v1/sync/folder", { path: store })).status).toBe(200);
    expect((await desk.call("PUT", "/v1/sync/settings", { deviceName: "Desktop" })).status).toBe(200);

    desk.put("apps/roleplay/data/chats/c1.jsonl", "hello\n");
    const pushed = await desk.job("/v1/sync/push");
    expect(pushed.error).toBeUndefined();
    expect(pushed.result).toMatchObject({ rev: 1 });

    // both start from the same starter files: nothing collides the first time
    const done = await phone.job("/v1/sync/pull");
    expect(done.error).toBeUndefined();
    expect(fs.readFileSync(path.join(phone.p.root, "apps/roleplay/data/chats/c1.jsonl"), "utf8")).toBe("hello\n");

    phone.put("apps/roleplay/data/chats/c1.jsonl", "phone\n");
    expect((await phone.job("/v1/sync/push")).error).toBeUndefined();
    desk.put("apps/roleplay/data/chats/c1.jsonl", "desk\n");
    const refused = await desk.job("/v1/sync/push");
    expect(refused.error?.message).toMatch(/pull first/);
    const conflict = await desk.job("/v1/sync/pull");
    expect(conflict.error?.conflicts?.map((g) => g.id)).toEqual(["w/apps/roleplay/data/chats/c1"]);
    const answered = await desk.job("/v1/sync/pull", { rev: conflict.error!.rev, resolutions: { "w/apps/roleplay/data/chats/c1": "mine" } });
    expect(answered.error).toBeUndefined();
    expect(fs.readFileSync(path.join(desk.p.root, "apps/roleplay/data/chats/c1.jsonl"), "utf8")).toBe("desk\n");

    const check = await desk.job("/v1/sync/check");
    expect(check.result).toMatchObject({ push: { files: 1 }, pull: { files: 0 }, behind: false });
    const view = (await (await desk.call("GET", "/v1/sync")).json()) as { device: { name: string }; target: { kind: string }; last: { direction: string } };
    expect(view).toMatchObject({ device: { name: "Desktop" }, target: { kind: "folder" }, last: { direction: "pull" } });
  });

  it("a folder target is for admins, outside the data folder; the passphrase has a minimum", async () => {
    const e = await engine("one");
    expect((await e.call("POST", "/v1/sync/folder", { path: path.join(dir, "x") }, e.plainToken)).status).toBe(403);
    expect((await e.call("POST", "/v1/sync/folder", { path: "relative/dir" })).status).toBe(400);
    expect((await e.call("POST", "/v1/sync/folder", { path: path.join(dir, "one", "inside") })).status).toBe(400);
    expect((await e.call("PUT", "/v1/sync/settings", { passphrase: "short" })).status).toBe(400);
    const ok = (await (await e.call("PUT", "/v1/sync/settings", { passphrase: "long enough", scope: { secrets: true } })).json()) as { passphrase: boolean; scope: { secrets: boolean } };
    expect(ok).toMatchObject({ passphrase: true, scope: { secrets: true } });
    expect((await e.call("PUT", "/v1/sync/settings", { client: { id: "nope", secret: "" } })).status).toBe(400);
    // nothing chosen yet: a push says so
    expect((await e.call("POST", "/v1/sync/push")).status).toBe(400);
  });

  it("the Google callback needs no login but only accepts a state an account started", async () => {
    const e = await engine("cb");
    const r = await e.app.request("/v1/sync/drive/callback?state=forged&code=x");
    expect(r.status).toBe(400);
    expect(await r.text()).toContain("expired");
    // without a client the sign-in does not start
    const start = await e.call("POST", "/v1/sync/drive/start");
    expect(start.status).toBe(400);
    process.env.CHRYSALIS_DRIVE_CLIENT_ID = "test.apps.googleusercontent.com";
    try {
      const s = (await (await e.call("POST", "/v1/sync/drive/start")).json()) as { url: string; redirect: string };
      expect(new URL(s.url).searchParams.get("redirect_uri")).toBe(s.redirect);
      expect(s.redirect).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+\/v1\/sync\/drive\/callback$/);
    } finally {
      delete process.env.CHRYSALIS_DRIVE_CLIENT_ID;
    }
  });
});
