// An unchanged build records its revision (Discord tracker BUG-018, GitHub #32): an edit no
// module reads must not leave the build "needed", or the next open runs a full build and
// reloads the app for nothing.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir } from "../src/paths.js";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-ack-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

async function setup() {
  const { buildApp } = await import("../src/server/app.js");
  const { UserService } = await import("../src/users.js");
  const { SessionService } = await import("../src/sessions.js");
  const { EventBus } = await import("../src/server/ws.js");
  const { sourceRev } = await import("../src/builder/server.js");
  const users = new UserService(dir);
  users.create("admin", "admin", { password: "admin-pass-1" });
  const { token } = users.create("alice", "user", { password: "test-pass-1" });
  const p = bootstrapUserDir(dir, "alice");
  const app = buildApp({ users, sessions: new SessionService(dir), config: defaultInstanceConfig(), dataDir: dir, bus: new EventBus() as never });
  const appDir = path.join(p.apps, "w");
  fs.mkdirSync(path.join(appDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(appDir, "dist", "dev"), { recursive: true });
  fs.writeFileSync(path.join(appDir, "manifest.json"), JSON.stringify({ name: "W", version: "1", kind: "app" }));
  fs.writeFileSync(path.join(appDir, "index.html"), '<script type="module" src="/src/main.ts"></script>');
  fs.writeFileSync(path.join(appDir, "src", "main.ts"), "console.log(1)");
  // a good development build of these sources
  fs.writeFileSync(path.join(appDir, "dist", "index.html"), "<html></html>");
  fs.writeFileSync(path.join(appDir, "dist", "dev", "snap-1.js"), "");
  fs.writeFileSync(path.join(appDir, "dist", "dev", "deps-1.js"), "");
  fs.writeFileSync(path.join(appDir, "dist", "dev", "meta.json"), JSON.stringify({ snapshot: "dev/snap-1.js", depsJs: "dev/deps-1.js", depsCss: null }));
  const writeStatus = (extra: Record<string, unknown> = {}) =>
    fs.writeFileSync(path.join(appDir, "dist", ".chrysalis-build.json"), JSON.stringify({ rev: sourceRev(appDir), ok: true, mode: "development", errors: [], warnings: 0, at: 1, builder: "b1", ...extra }));
  writeStatus();
  const call = (method: string, route: string, body?: unknown) =>
    app.request(route, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const status = async () => (await (await call("GET", "/v1/apps/w/build")).json()) as { rev: string; needsBuild: boolean; status: { rev: string; builder?: string } };
  return { appDir, call, status, writeStatus, token, app };
}

describe("build ack", () => {
  it("an edit no module reads, acknowledged by the lease holder, leaves the build current", async () => {
    const { appDir, call, status } = await setup();
    expect((await status()).needsBuild).toBe(false);
    // a test file changes: the fingerprint moves
    await new Promise((r) => setTimeout(r, 20));
    fs.mkdirSync(path.join(appDir, "test"));
    fs.writeFileSync(path.join(appDir, "test", "a.test.ts"), "// edited");
    const before = await status();
    expect(before.needsBuild).toBe(true);
    const holder = "holder1234";
    expect(((await (await call("POST", "/v1/apps/w/build/lease", { holder, busy: true })).json()) as { granted: boolean }).granted).toBe(true);
    const r = await call("POST", "/v1/apps/w/build/ack", { holder, rev: before.rev });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ acked: true });
    const after = await status();
    expect(after.needsBuild).toBe(false);
    expect(after.status.rev).toBe(before.rev);
    // the stamp of the builder that made dist stays
    expect(after.status.builder).toBe("b1");
  });

  it("refuses another holder, a revision the sources moved past, and a build with errors", async () => {
    const { appDir, call, status, writeStatus } = await setup();
    await new Promise((r) => setTimeout(r, 20));
    fs.writeFileSync(path.join(appDir, "notes.md"), "x");
    const rev = (await status()).rev;
    await call("POST", "/v1/apps/w/build/lease", { holder: "holder1234", busy: true });
    expect((await call("POST", "/v1/apps/w/build/ack", { holder: "someoneelse", rev })).status).toBe(409);
    expect((await call("POST", "/v1/apps/w/build/ack", { holder: "holder1234", rev: "stale" })).status).toBe(409);
    expect((await call("POST", "/v1/apps/w/build/ack", { holder: "holder1234" })).status).toBe(409);
    writeStatus({ rev: "old", errors: [{ text: "boom" }] });
    expect(await (await call("POST", "/v1/apps/w/build/ack", { holder: "holder1234", rev })).json()).toEqual({ acked: false });
    expect((await status()).needsBuild).toBe(true);
    // a dist whose deps bundle is gone is not carried forward either
    writeStatus({ rev: "old" });
    fs.rmSync(path.join(appDir, "dist", "dev", "deps-1.js"));
    expect(await (await call("POST", "/v1/apps/w/build/ack", { holder: "holder1234", rev })).json()).toEqual({ acked: false });
  });

  it("an app frame cannot reach it through the bridge relay", async () => {
    const { app, token } = await setup();
    const r = await app.request("/v1/apps/w/build/ack", { method: "POST", headers: { authorization: `Bearer ${token}`, "x-chrysalis-app": "w", "content-type": "application/json" }, body: "{}" });
    expect(r.status).toBe(403);
  });
});
