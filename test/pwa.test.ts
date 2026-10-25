/**
 * Installing the shell as an app (#56): the manifest and the service worker
 * are served at the root without a session, the manifest's icons exist, and
 * the worker stays out of everything but a top-level page load.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Hono } from "hono";
import { buildApp, SHELL_MANIFEST, type AppEnv } from "../src/server/app.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { UserService } from "../src/users.js";
import { defaultInstanceConfig } from "../src/config.js";
import { ENGINE_VERSION } from "../src/install.js";

const repo = path.resolve(import.meta.dir, "..");
const workerSource = fs.readFileSync(path.join(repo, "client/public/sw.js"), "utf8");

describe("installable shell", () => {
  let dataDir: string;
  let app: Hono<AppEnv>;
  beforeAll(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pwa-"));
    const users = new UserService(dataDir);
    users.create("admin", "admin", { password: "admin-pass-1" });
    app = buildApp({ users, sessions: new SessionService(dataDir), config: defaultInstanceConfig(), dataDir, bus: new EventBus() });
  });
  afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  it("serves the manifest at the root, without a session", async () => {
    const res = await app.request("/manifest.webmanifest");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/manifest+json");
    const m = (await res.json()) as { icons: { purpose: string }[] };
    expect(m as object).toMatchObject({ name: "Molfar Vertep", start_url: "/", scope: "/", display: "standalone" });
    expect(m.icons.map((i) => i.purpose).sort()).toEqual(["any", "any", "maskable"]);
  });

  it("every manifest icon is a file the shell ships", () => {
    for (const icon of SHELL_MANIFEST.icons) {
      expect(icon.src.startsWith("/client/")).toBe(true);
      expect(fs.existsSync(path.join(repo, "client/public", icon.src.slice("/client/".length)))).toBe(true);
    }
  });

  it("the worker answers only page loads and its own offline files", () => {
    expect(workerSource).toContain('req.mode !== "navigate" || req.destination !== "document"');
    // no generic caching: the only cache writes are the offline files at install
    expect(workerSource.match(/cache\.(put|add|addAll)\(/g)).toEqual(["cache.addAll("]);
    expect(workerSource).toContain("__ENGINE_VERSION__");
  });

  // the route reads the built client; CI tests run before a build
  const built = fs.existsSync(path.join(repo, "client/dist/sw.js"));
  it.skipIf(!built)("serves the worker at the root with the engine version in it", async () => {
    const res = await app.request("/sw.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    expect(res.headers.get("cache-control")).toBe("no-cache");
    const body = await res.text();
    expect(body).toContain(`const VERSION = "${ENGINE_VERSION}"`);
    expect(body).not.toContain("__ENGINE_VERSION__");
  });

  it("index.html links the manifest", () => {
    const html = fs.readFileSync(path.join(repo, "client/index.html"), "utf8");
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  });
});
