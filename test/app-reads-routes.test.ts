// Read access between apps through the engine's routes (issue #310, step 2): the app asks in its manifest, the shell
// answers, and the plugin's host.peer follows the answer, including a revoke and the removal of the app.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Hono } from "hono";
import { buildApp, type AppEnv } from "../src/server/app.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { UserService } from "../src/users.js";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir, userPaths } from "../src/paths.js";
import { invalidatePluginCache } from "../src/plugins/runtime.js";

let dataDir: string;
let token: string;
let app: Hono<AppEnv>;
let apps: string;

const PLUGIN = `export function handleRoute(req, host) {
  if (req.path !== "/peek") return null;
  try {
    return { status: 200, json: { ok: true, card: JSON.parse(host.peer.read("roleplay", "characters/mavka/card.json")), apps: host.peer.apps() } };
  } catch (e) {
    return { status: 200, json: { ok: false, error: String(e && e.message || e) } };
  }
}`;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "reads-routes-"));
  const users = new UserService(dataDir);
  users.create("admin", "admin", { password: "admin-pass-1" });
  token = users.create("alice", "user", { password: "test-pass-1" }).token;
  bootstrapUserDir(dataDir, "alice");
  apps = userPaths(dataDir, "alice").apps;
  // the reading app: its manifest asks for two kinds of file of roleplay; its plugin may use host.peer
  fs.mkdirSync(path.join(apps, "social", "plugins", "p"), { recursive: true });
  fs.writeFileSync(
    path.join(apps, "social", "manifest.json"),
    JSON.stringify({ name: "Social", version: "1", kind: "app", reads: [{ app: "roleplay", paths: ["characters/*/card.json"], why: "Import characters" }] }),
  );
  fs.writeFileSync(path.join(apps, "social", "plugins", "p", "manifest.json"), JSON.stringify({ name: "p", version: "1", origin: "local", permissions: ["routes", "peer"] }));
  fs.writeFileSync(path.join(apps, "social", "plugins", "p", "plugin.js"), PLUGIN);
  // the app being read
  fs.mkdirSync(path.join(apps, "roleplay", "data", "characters", "mavka"), { recursive: true });
  fs.writeFileSync(path.join(apps, "roleplay", "manifest.json"), JSON.stringify({ name: "Roleplay", version: "1", kind: "app" }));
  fs.writeFileSync(path.join(apps, "roleplay", "data", "characters", "mavka", "card.json"), JSON.stringify({ name: "Мавка" }));
  fs.writeFileSync(path.join(apps, "roleplay", "data", "settings.json"), '{"key":"sk-secret"}');
  invalidatePluginCache();
  app = buildApp({ users, sessions: new SessionService(dataDir), config: defaultInstanceConfig(), dataDir, bus: new EventBus() });
});
afterEach(() => {
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* watcher races */
  }
  invalidatePluginCache();
});

const h = () => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
const get = (p: string) => app.request(p, { headers: h() });
const put = (p: string, body: unknown) => app.request(p, { method: "PUT", headers: h(), body: JSON.stringify(body) });
const peek = async () => (await (await get("/v1/apps/social/peek")).json()) as { ok: boolean; error?: string; card?: { name: string }; apps?: unknown[] };

describe("app reads: the shell's routes and the plugin", () => {
  it("asks first, reads after the user allows, stops when the user revokes", async () => {
    const list = (await (await get("/v1/apps/social/reads")).json()) as { reads: { app: string; name: string; installed: boolean; state: string; paths: string[]; why: string }[] };
    expect(list.reads).toEqual([{ app: "roleplay", name: "Roleplay", installed: true, paths: ["characters/*/card.json"], why: "Import characters", state: "ask" }]);
    // nothing is readable before the user answers
    expect((await peek()).ok).toBe(false);

    const yes = await put("/v1/apps/social/reads/roleplay", { granted: true });
    expect(yes.status).toBe(200);
    const after = await peek();
    expect(after.ok).toBe(true);
    expect(after.card).toEqual({ name: "Мавка" });
    expect(after.apps).toEqual([{ app: "roleplay", paths: ["characters/*/card.json"] }]);
    expect(((await (await get("/v1/apps/social/reads")).json()) as { reads: { state: string }[] }).reads[0]!.state).toBe("granted");

    expect((await put("/v1/apps/social/reads/roleplay", { granted: false })).status).toBe(200);
    expect((await peek()).ok).toBe(false);
    expect(((await (await get("/v1/apps/social/reads")).json()) as { reads: { state: string }[] }).reads[0]!.state).toBe("denied");
  });

  it("the grant sits outside the workspace, and a bad answer changes nothing", async () => {
    expect((await put("/v1/apps/social/reads/roleplay", { granted: "yes" })).status).toBe(400);
    expect((await put("/v1/apps/social/reads/other", { granted: true })).status).toBe(404); // not asked for in the manifest
    expect((await put("/v1/apps/missing/reads/roleplay", { granted: true })).status).toBe(404);
    expect((await get("/v1/apps/missing/reads")).status).toBe(404);
    expect((await peek()).ok).toBe(false);
    await put("/v1/apps/social/reads/roleplay", { granted: true });
    const file = userPaths(dataDir, "alice").appReads;
    expect(fs.existsSync(file)).toBe(true);
    expect(path.relative(userPaths(dataDir, "alice").root, file).startsWith("..")).toBe(true); // not in the workspace
  });

  it("a manifest that asks for more paths asks again", async () => {
    await put("/v1/apps/social/reads/roleplay", { granted: true });
    expect((await peek()).ok).toBe(true);
    const mf = path.join(apps, "social", "manifest.json");
    const m = JSON.parse(fs.readFileSync(mf, "utf8"));
    m.reads[0].paths.push("personas/*.json");
    fs.writeFileSync(mf, JSON.stringify(m));
    invalidatePluginCache();
    expect((await peek()).ok).toBe(false);
    expect(((await (await get("/v1/apps/social/reads")).json()) as { reads: { state: string }[] }).reads[0]!.state).toBe("ask");
  });

  it("the grant goes with the app, and with the app that was read", async () => {
    await put("/v1/apps/social/reads/roleplay", { granted: true });
    const file = userPaths(dataDir, "alice").appReads;
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toHaveProperty("social.roleplay");
    // the app being read is removed: nothing carries over to a new app of that name
    expect((await app.request("/v1/apps/roleplay", { method: "DELETE", headers: h() })).status).toBe(200);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).social ?? {}).not.toHaveProperty("roleplay");
    // the reading app is removed
    await put("/v1/apps/social/reads/roleplay", { granted: true });
    expect((await app.request("/v1/apps/social", { method: "DELETE", headers: h() })).status).toBe(200);
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({});
  });

  it("a relayed request from an app frame cannot read or change the answer", async () => {
    // the bridge blocks the path first; the route refuses a relayed request as well
    const relayed = { ...h(), "x-molfar-app": "social" };
    expect((await app.request("/v1/apps/social/reads", { headers: relayed })).status).not.toBe(200);
    expect((await app.request("/v1/apps/social/reads/roleplay", { method: "PUT", headers: relayed, body: JSON.stringify({ granted: true }) })).status).not.toBe(200);
    expect((await peek()).ok).toBe(false);
  });
});
