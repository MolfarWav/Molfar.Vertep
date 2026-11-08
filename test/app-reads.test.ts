// Read access between apps (issue #310, step 2): the manifest's `reads`, the user's decision kept outside the
// workspace, and `host.peer` in the plugin sandbox: read only, only the declared paths of an allowed app, no way out of
// the peer's data folder (src/apps/reads.ts, the "peerSvc" in src/plugins/sandbox-worker.mjs).
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateAppManifest } from "../src/apps/manager.js";
import {
  cleanRel,
  forgetGrants,
  forgetPeer,
  listAllowed,
  moveGrants,
  parseReads,
  patternMatches,
  peerMounts,
  readGrants,
  readState,
  setGrant,
  validPattern,
} from "../src/apps/reads.js";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "app-reads-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const decl = { app: "roleplay", paths: ["characters/*/card.json", "personas/*.json"], why: "Import characters" };

describe("the manifest's reads", () => {
  it("keeps good entries and drops bad patterns, apps and duplicates", () => {
    expect(parseReads([decl])).toEqual([decl]);
    expect(parseReads("x")).toEqual([]);
    expect(parseReads([{ app: "../x", paths: ["a.json"] }, { app: "ok", paths: [] }, { app: "ok2", paths: ["../up.json", "/abs.json", "a\\b.json", "a//b.json"] }])).toEqual([]);
    expect(parseReads([{ app: "roleplay", paths: ["a.json", "a.json", "../b.json"] }, { app: "roleplay", paths: ["c.json"] }])).toEqual([{ app: "roleplay", paths: ["a.json"], why: "" }]);
    expect(parseReads(Array.from({ length: 9 }, (_, i) => ({ app: `a${i}`, paths: ["x.json"] }))).length).toBe(4);
  });

  it("is part of the validated app manifest", () => {
    const m = validateAppManifest({ name: "Social", version: "1", kind: "app", reads: [decl, { app: "bad app", paths: ["a"] }] });
    expect(m?.reads).toEqual([decl]);
    expect(validateAppManifest({ name: "Plain", version: "1", kind: "app" })?.reads).toBeUndefined();
  });

  it("patterns: one segment per star group, no dots, no depth beyond 6", () => {
    for (const ok of ["a.json", "characters/*/card.json", "personas/*.json", "x/*.*", ".hidden/a"]) expect(validPattern(ok)).toBe(true);
    for (const bad of ["", "..", "../a", "a/..", ".", "a/./b", "/a", "a/", "a//b", "a\\b", "a b", "a/b/c/d/e/f/g", "*/../x", "a\0b"]) expect(validPattern(bad)).toBe(false);
  });
});

describe("matching", () => {
  it("a pattern matches a whole path segment by segment", () => {
    expect(patternMatches("characters/*/card.json", "characters/mavka/card.json")).toBe(true);
    expect(patternMatches("characters/*/card.json", "characters/mavka/other.json")).toBe(false);
    expect(patternMatches("characters/*/card.json", "characters/card.json")).toBe(false);
    expect(patternMatches("characters/*/card.json", "characters/a/b/card.json")).toBe(false);
    expect(patternMatches("personas/*.json", "personas/me.json")).toBe(true);
    expect(patternMatches("personas/*.json", "personas/me.json.bak")).toBe(false);
    expect(patternMatches("personas/*.json", "personasX/me.json")).toBe(false);
    expect(patternMatches("a.b", "aXb")).toBe(false); // the dot is a dot
  });

  it("a listing shows only what leads to a declared path", () => {
    const p = decl.paths;
    expect(listAllowed(p, "", ["characters", "personas", "settings.json", "chats"])).toEqual(["characters", "personas"]);
    expect(listAllowed(p, "characters", ["mavka", "yaryna"])).toEqual(["mavka", "yaryna"]);
    expect(listAllowed(p, "characters/mavka", ["card.json", "avatar.png", "notes.md"])).toEqual(["card.json"]);
    expect(listAllowed(p, "personas", ["me.json", "me.png"])).toEqual(["me.json"]);
    expect(listAllowed(p, "chats", ["x"])).toEqual([]);
    expect(listAllowed(p, "characters/mavka/deeper", ["x"])).toEqual([]);
  });

  it("a relative path is cleaned or refused", () => {
    expect(cleanRel("characters/a/card.json")).toBe("characters/a/card.json");
    expect(cleanRel("/characters/")).toBe("characters");
    expect(cleanRel("")).toBe("");
    for (const bad of ["..", "a/../b", "a//b", "a\\b", "a\0b", 5, null, "x".repeat(400)]) expect(cleanRel(bad as unknown as string)).toBeNull();
  });
});

describe("the user's decision", () => {
  it("is kept per app and peer, covers only the paths that were shown, and is forgotten with the app", () => {
    const file = path.join(dir, "credentials", "u", "app-reads.json");
    expect(readGrants(file)).toEqual({});
    expect(readState(decl, undefined)).toBe("ask");
    setGrant(file, "social", decl, true, 1);
    const g = readGrants(file);
    expect(readState(decl, g.social?.roleplay)).toBe("granted");
    // the app now asks for more: a new question
    expect(readState({ ...decl, paths: [...decl.paths, "lorebooks/*.json"] }, g.social?.roleplay)).toBe("ask");
    // asking for less is still covered
    expect(readState({ ...decl, paths: ["personas/*.json"] }, g.social?.roleplay)).toBe("granted");
    setGrant(file, "social", decl, false, 2);
    expect(readState(decl, readGrants(file).social?.roleplay)).toBe("denied");
    setGrant(file, "social", decl, true, 3);
    moveGrants(file, "social", "social2");
    expect(readGrants(file).social).toBeUndefined();
    expect(readState(decl, readGrants(file).social2?.roleplay)).toBe("granted");
    forgetPeer(file, "roleplay"); // the peer was removed or renamed: nothing may carry over to a new app of that name
    expect(readState(decl, readGrants(file).social2?.roleplay)).toBe("ask");
    setGrant(file, "social2", decl, true);
    forgetGrants(file, "social2");
    expect(readGrants(file)).toEqual({});
  });

  it("an unreadable or hostile file is no decision", () => {
    const file = path.join(dir, "g.json");
    fs.writeFileSync(file, "{not json");
    expect(readGrants(file)).toEqual({});
    fs.writeFileSync(file, JSON.stringify({ social: { roleplay: { decided: "granted", paths: ["../x", "a.json"], at: 1 }, "../evil": { decided: "granted", paths: ["a"] }, other: { decided: "maybe", paths: [] } }, "../up": {} }));
    expect(readGrants(file)).toEqual({ social: { roleplay: { decided: "granted", paths: ["a.json"], at: 1 } } });
  });

  it("only a granted, installed peer is mounted, with the declared patterns", () => {
    const apps = path.join(dir, "apps");
    fs.mkdirSync(path.join(apps, "roleplay", "data"), { recursive: true });
    fs.writeFileSync(path.join(apps, "roleplay", "manifest.json"), "{}");
    const grants = { social: { roleplay: { decided: "granted" as const, paths: decl.paths, at: 1 } } };
    expect(peerMounts("social", [decl], grants, apps)).toEqual([{ app: "roleplay", root: path.join(apps, "roleplay", "data"), allow: decl.paths }]);
    expect(peerMounts("social", [decl], {}, apps)).toEqual([]);
    expect(peerMounts("social", [decl], { social: { roleplay: { decided: "denied", paths: decl.paths, at: 1 } } }, apps)).toEqual([]);
    expect(peerMounts("other", [decl], grants, apps)).toEqual([]); // a grant is for one app
    expect(peerMounts("roleplay", [decl], { roleplay: { roleplay: { decided: "granted", paths: decl.paths, at: 1 } } }, apps)).toEqual([]); // not itself
    fs.rmSync(path.join(apps, "roleplay"), { recursive: true });
    expect(peerMounts("social", [decl], grants, apps)).toEqual([]); // the peer is gone
  });
});

describe("host.peer in the plugin sandbox", () => {
  let peerData: string;
  let secretDir: string;
  beforeEach(() => {
    peerData = path.join(dir, "apps", "roleplay", "data");
    secretDir = path.join(dir, "secret");
    fs.mkdirSync(path.join(peerData, "characters", "mavka"), { recursive: true });
    fs.mkdirSync(path.join(peerData, "characters", "yaryna"), { recursive: true });
    fs.mkdirSync(path.join(peerData, "personas"), { recursive: true });
    fs.mkdirSync(path.join(peerData, "chats"), { recursive: true });
    fs.mkdirSync(secretDir, { recursive: true });
    fs.writeFileSync(path.join(peerData, "characters", "mavka", "card.json"), JSON.stringify({ name: "Мавка" }));
    fs.writeFileSync(path.join(peerData, "characters", "mavka", "notes.md"), "private notes");
    fs.writeFileSync(path.join(peerData, "characters", "yaryna", "card.json"), JSON.stringify({ name: "Ярина" }));
    fs.writeFileSync(path.join(peerData, "personas", "me.json"), JSON.stringify({ name: "Me" }));
    fs.writeFileSync(path.join(peerData, "chats", "c1.json"), "chat");
    fs.writeFileSync(path.join(peerData, "settings.json"), '{"key":"sk-secret"}');
    fs.writeFileSync(path.join(secretDir, "outside.json"), "outside");
  });

  const peers = () => [{ app: "roleplay", root: peerData, allow: decl.paths }];
  const PROBE = `export function uiPanel(ctx, host) {
    const out = {};
    const t = (name, fn) => { try { out[name] = { ok: true, value: fn() }; } catch (e) { out[name] = { ok: false, error: String(e && e.message || e) }; } };
    for (const c of ctx.calls) t(c[0] + ":" + JSON.stringify(c.slice(1)), () => host.peer[c[0]].apply(null, c.slice(1)));
    return out;
  }`;
  async function probe(calls: unknown[][], peerList: unknown[] | null = peers()) {
    const { sandbox } = await import("../src/plugins/sandbox.js");
    const r = await sandbox.eval({ source: PROBE, hook: "uiPanel", ctx: { calls }, storeSnapshot: {}, ...(peerList ? { peers: peerList as never } : {}) });
    expect(r.ok).toBe(true);
    return r.out as Record<string, { ok: boolean; value?: unknown; error?: string }>;
  }
  const one = async (...call: unknown[]) => Object.values(await probe([call]))[0]!;

  it("reads a declared file and lists only what leads to one", async () => {
    expect(JSON.parse((await one("read", "roleplay", "characters/mavka/card.json")).value as string)).toEqual({ name: "Мавка" });
    expect(JSON.parse((await one("read", "roleplay", "personas/me.json")).value as string)).toEqual({ name: "Me" });
    expect((await one("list", "roleplay", "")).value).toEqual(["characters", "personas"]);
    expect((await one("list", "roleplay", "characters")).value).toEqual(["mavka", "yaryna"]);
    expect((await one("list", "roleplay", "characters/mavka")).value).toEqual(["card.json"]);
    expect((await one("stat", "roleplay", "characters/mavka/card.json")).value).toMatchObject({ dir: false });
    expect((await one("apps")).value).toEqual([{ app: "roleplay", paths: decl.paths }]);
  });

  it("refuses a path the manifest did not declare, however it is spelled", async () => {
    for (const rel of ["settings.json", "chats/c1.json", "characters/mavka/notes.md", "characters/mavka", "characters", "", "personas/me.json.bak"]) {
      const r = await one("read", "roleplay", rel);
      expect(r.ok, rel).toBe(false);
      expect(r.error, rel).toMatch(/peer read refused/);
    }
    for (const rel of ["chats", "characters/mavka/x", "settings.json"]) expect((await one("list", "roleplay", rel)).ok, rel).toBe(false);
    for (const rel of ["settings.json", "chats/c1.json"]) expect((await one("stat", "roleplay", rel)).ok, rel).toBe(false);
  });

  it("cannot leave the peer's folder: dots, absolute paths, backslashes, other apps, odd types", async () => {
    const attempts: unknown[][] = [
      ["read", "roleplay", "../secret/outside.json"],
      ["read", "roleplay", "characters/../../secret/outside.json"],
      ["read", "roleplay", "characters/mavka/../../../secret/outside.json"],
      ["read", "roleplay", path.join(secretDir, "outside.json")],
      ["read", "roleplay", "characters\\mavka\\card.json"],
      ["read", "roleplay", "%2e%2e/secret/outside.json"],
      ["read", "social", "characters/mavka/card.json"], // an app that was not mounted
      ["read", "../roleplay", "characters/mavka/card.json"],
      ["read", "roleplay"],
      ["read", {}, "characters/mavka/card.json"],
      ["list", "roleplay", ".."],
      ["list", "roleplay", "../.."],
      ["write", "roleplay", "characters/mavka/card.json", "x"], // there is no write
      ["remove", "roleplay", "characters/mavka/card.json"],
    ];
    const out = await probe(attempts);
    for (const [k, v] of Object.entries(out)) expect(v.ok, k).toBe(false);
    expect(fs.readFileSync(path.join(peerData, "characters", "mavka", "card.json"), "utf8")).toContain("Мавка"); // untouched
  });

  it("follows no symlink out of the folder or to a file that was not declared", async () => {
    const link = (target: string, at: string, type: "file" | "dir" | "junction") => {
      try {
        fs.symlinkSync(target, at, type);
        return true;
      } catch {
        return false; // a Windows account without the privilege: nothing to test
      }
    };
    if (link(path.join(secretDir, "outside.json"), path.join(peerData, "characters", "yaryna", "link.json"), "file") && link(secretDir, path.join(peerData, "personas", "dirlink"), "junction")) {
      // the matching name, but the file is a link to outside
      fs.rmSync(path.join(peerData, "characters", "yaryna", "card.json"));
      expect(link(path.join(secretDir, "outside.json"), path.join(peerData, "characters", "yaryna", "card.json"), "file")).toBe(true);
      expect((await one("read", "roleplay", "characters/yaryna/card.json")).ok).toBe(false);
      expect((await one("read", "roleplay", "personas/dirlink/outside.json")).ok).toBe(false);
    }
    // a link that stays inside the folder but points at a file the manifest did not declare
    fs.rmSync(path.join(peerData, "personas", "me.json"));
    if (link(path.join(peerData, "settings.json"), path.join(peerData, "personas", "me.json"), "file")) {
      const r = await one("read", "roleplay", "personas/me.json");
      expect(r.ok).toBe(false);
      expect(JSON.stringify(r)).not.toContain("sk-secret");
    }
  });

  it("refuses a file over 2 MB", async () => {
    fs.writeFileSync(path.join(peerData, "personas", "big.json"), "x".repeat(2 * 1024 * 1024 + 10));
    const r = await one("read", "roleplay", "personas/big.json");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/too large/);
  });

  it("is empty and refuses everything when no peer is mounted (not allowed, not declared, or no permission)", async () => {
    for (const none of [[], null]) {
      const out = await probe([["read", "roleplay", "characters/mavka/card.json"], ["list", "roleplay", ""], ["apps"]], none);
      const vals = Object.values(out);
      expect(vals[0]!.ok).toBe(false);
      expect(vals[1]!.ok).toBe(false);
      expect(vals[2]).toEqual({ ok: true, value: [] });
    }
  });

  it("error text never carries the host's folder names", async () => {
    const r = await one("read", "roleplay", "characters/nobody/card.json");
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(os.tmpdir());
    expect(JSON.stringify(await one("read", "roleplay", "characters/mavka/notes.md"))).not.toContain(dir);
  });
});
