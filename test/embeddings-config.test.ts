/**
 * Embeddings config routes: GET shows provider, model and the choices with
 * readiness; PUT validates the provider; the OpenRouter key goes in through
 * the ordinary connections route (no key storage of its own).
 */
import { afterEach, describe, it, expect, beforeEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppEnv } from "../src/server/app.js";
import type { Hono } from "hono";
import { buildApp } from "../src/server/app.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { UserService } from "../src/users.js";
import { defaultInstanceConfig } from "../src/config.js";
import { bootstrapUserDir, userPaths } from "../src/paths.js";

let dataDir: string;
let token: string;
let app: Hono<AppEnv>;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "embed-config-"));
  const users = new UserService(dataDir);
  users.create("admin", "admin", { password: "admin-pass-1" });
  token = users.create("alice", "user", { password: "test-pass-1" }).token;
  bootstrapUserDir(dataDir, "alice");
  app = buildApp({ users, sessions: new SessionService(dataDir), config: defaultInstanceConfig(), dataDir, bus: new EventBus() });
});
afterEach(() => {
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* watcher races */ }
});

const h = () => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
const get = async () => (await app.request("/v1/embeddings/config", { headers: h() })).json() as Promise<{ model: string; modelSet: boolean; provider: string; providers: { id: string; name: string; kind: string; ready: boolean }[] }>;
const put = (body: unknown) => app.request("/v1/embeddings/config", { method: "PUT", headers: h(), body: JSON.stringify(body) });

describe("embeddings config routes", () => {
  it("defaults: automatic, the OpenAI-style model, OpenRouter listed but not ready", async () => {
    expect(await get()).toEqual({
      model: "text-embedding-3-small",
      modelSet: false,
      provider: "auto",
      providers: [{ id: "openrouter", name: "OpenRouter", kind: "builtin", ready: false }],
    });
  });

  it("choosing OpenRouter without a model setting shows the long-context default; a model setting wins", async () => {
    expect((await put({ provider: "openrouter" })).status).toBe(200);
    expect(await get()).toMatchObject({ provider: "openrouter", model: "qwen/qwen3-embedding-4b" });
    expect((await put({ model: " openai/text-embedding-3-small " })).status).toBe(200);
    expect(await get()).toMatchObject({ provider: "openrouter", model: "openai/text-embedding-3-small" });
    expect((await get()).modelSet).toBe(true);
    // null clears the model: the provider's default applies again
    expect((await put({ model: null })).status).toBe(200);
    expect(await get()).toMatchObject({ provider: "openrouter", model: "qwen/qwen3-embedding-4b", modelSet: false });
    await put({ model: "openai/text-embedding-3-small" });
    const saved = JSON.parse(fs.readFileSync(userPaths(dataDir, "alice").settings, "utf8")) as Record<string, unknown>;
    expect(saved).toMatchObject({ embedProvider: "openrouter", embedModel: "openai/text-embedding-3-small" });
  });

  it("validates: provider must be auto, openrouter or an existing custom connection; model a short string", async () => {
    expect((await put({})).status).toBe(400);
    expect((await put({ provider: "nope" })).status).toBe(400);
    expect((await put({ provider: 7 })).status).toBe(400);
    expect((await put({ provider: "openrouter", model: "" })).status).toBe(400);
    expect((await put({ model: "x".repeat(201) })).status).toBe(400);
    // a rejected request changes nothing
    expect(await get()).toMatchObject({ provider: "auto", model: "text-embedding-3-small" });
    const made = await app.request("/v1/settings/connections", {
      method: "POST",
      headers: h(),
      body: JSON.stringify({ name: "Embed Hub", api: "openai-completions", baseUrl: "https://hub.example/v1", models: [{ id: "m" }], key: "sk-hub" }),
    });
    const { connection } = (await made.json()) as { connection: { id: string } };
    expect((await put({ provider: connection.id })).status).toBe(200);
    const cfg = await get();
    expect(cfg.provider).toBe(connection.id);
    expect(cfg.providers).toContainEqual({ id: connection.id, name: "Embed Hub", kind: "custom", ready: true });
    // a builtin connection id is not a custom provider
    expect((await put({ provider: "anthropic" })).status).toBe(400);
  });

  it("the OpenRouter key saved through the connections route makes it ready", async () => {
    const made = await app.request("/v1/settings/connections", { method: "POST", headers: h(), body: JSON.stringify({ name: "OpenRouter", providerId: "openrouter", key: "sk-or-test" }) });
    expect(made.status).toBe(201);
    expect((await get()).providers[0]).toEqual({ id: "openrouter", name: "OpenRouter", kind: "builtin", ready: true });
  });
});
