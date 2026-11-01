/**
 * Molfar's mailbox (issue #175): the store, "Later" on a live card, a card nobody answered, and what a yes in
 * the mailbox writes.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MAILBOX_MAX, dropMail, getMail, listMail, mailCount, mailSig, queueMail, wasDeclined } from "../src/agent/mailbox.js";
import { acceptMail, proposeEntry, proposeRetire, readMemory, resolveScope } from "../src/agent/memory.js";
import { agentWriteDenied, bootstrapUserDir, userPaths } from "../src/paths.js";
import { UserService } from "../src/users.js";
import { buildApp } from "../src/server/app.js";
import { EventBus } from "../src/server/ws.js";
import { SessionService } from "../src/sessions.js";
import { defaultInstanceConfig } from "../src/config.js";

let dataDir: string;
let root: string;
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mailbox-"));
  root = bootstrapUserDir(dataDir, "alice").root;
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));

const global = () => readMemory(root, resolveScope(root, "global"));
const add = (entry: string, extra: Record<string, unknown> = {}) => ({ kind: "add" as const, scope: "global", entry, from: "later" as const, ...extra });

describe("the mailbox store", () => {
  it("keeps items oldest first and counts them", () => {
    expect(mailCount(root)).toBe(0);
    const a = queueMail(root, add("first"));
    const b = queueMail(root, add("second"));
    expect(a.ok && b.ok).toBe(true);
    expect(listMail(root).map((m) => (m.kind === "add" ? m.entry : ""))).toEqual(["first", "second"]);
    expect(mailCount(root)).toBe(2);
    expect(getMail(root, (a as { item: { id: string } }).item.id)?.kind).toBe("add");
    expect(getMail(root, "../etc/passwd")).toBeUndefined();
  });
  it("does not queue the same proposal twice, even with other spacing or case", () => {
    expect(queueMail(root, add("The user likes   tea")).ok).toBe(true);
    expect(queueMail(root, add("the user likes tea"))).toEqual({ ok: false, reason: "duplicate" });
    // another scope or kind is another proposal
    expect(queueMail(root, add("the user likes tea", { scope: "app:x" })).ok).toBe(true);
    expect(mailSig({ kind: "retire", scope: "global", match: "Tea " })).toBe("retire|global|tea");
  });
  it("remembers a skip, and stops at the cap", () => {
    const r = queueMail(root, add("skip me")) as { item: { id: string } };
    expect(dropMail(root, r.item.id, true)).toBe(true);
    expect(wasDeclined(root, add("skip me"))).toBe(true);
    expect(queueMail(root, add("skip me"))).toEqual({ ok: false, reason: "declined" });
    for (let i = 0; i < MAILBOX_MAX; i++) queueMail(root, add(`entry number ${i}`));
    expect(queueMail(root, add("one more"))).toEqual({ ok: false, reason: "full" });
    expect(dropMail(root, "mb-nothere1")).toBe(false);
  });
  it("ignores files that are not valid items", () => {
    queueMail(root, add("real"));
    fs.writeFileSync(path.join(root, "memory/mailbox/mb-bogus0001.json"), JSON.stringify({ id: "mb-bogus0001", kind: "add", scope: "global" }));
    fs.writeFileSync(path.join(root, "memory/mailbox/mb-badjson01.json"), "{not json");
    expect(listMail(root)).toHaveLength(1);
  });
  it("the agent's file tools and shell cannot write into it", () => {
    expect(agentWriteDenied("memory/mailbox/mb-x.json")).not.toBeNull();
    expect(agentWriteDenied("memory/mailbox/declined.json")).not.toBeNull();
  });
});

describe("a live card has a third answer", () => {
  it("'Later' leaves the entry in the mailbox and tells the model not to wait or repeat", async () => {
    let options: unknown[] = [];
    const r = await proposeEntry(root, "alice", async (q) => { options = q.options ?? []; return "Later"; }, { scope: "global", entry: "a fact for later" });
    expect(options).toEqual(["Save", "Later", "Skip"]);
    expect(r.saved).toBe(false);
    expect(r.text).toContain("mailbox");
    expect(global()).not.toContain("a fact for later");
    expect(listMail(root).map((m) => m.from)).toEqual(["later"]);
  });
  it("a Skip is remembered: the agent cannot bring the same entry back", async () => {
    await proposeEntry(root, "alice", async () => "Skip", { scope: "global", entry: "unwanted fact" });
    let asked = false;
    const again = await proposeEntry(root, "alice", async () => { asked = true; return "Save"; }, { scope: "global", entry: "Unwanted  fact" });
    expect(asked).toBe(false);
    expect(again.saved).toBe(false);
    expect(again.text).toContain("skipped");
  });
  it("with nobody to ask, the entry waits in the mailbox instead of being lost", async () => {
    const r = await proposeEntry(root, "alice", undefined, { scope: "global", entry: "unattended fact" });
    expect(r.saved).toBe(false);
    expect(listMail(root).map((m) => m.from)).toEqual(["unanswered"]);
  });
  it("a replace and a retire keep their shape in the mailbox", async () => {
    fs.mkdirSync(path.join(root, "memory"), { recursive: true });
    fs.writeFileSync(path.join(root, "memory/MEMORY.md"), "# Memory\n\n- 2026-10-01: old build note\n- 2026-10-01: lives in Kyiv\n");
    await proposeEntry(root, "alice", async () => "Later", { scope: "global", entry: "build uses bun", replaces: "old build" });
    await proposeRetire(root, "alice", async () => "Later", { scope: "global", match: "Kyiv" });
    expect(listMail(root).map((m) => m.kind)).toEqual(["replace", "retire"]);
  });
});

describe("a yes in the mailbox", () => {
  it("add: writes the entry, in the user's own words when they edited it, and takes the item out", async () => {
    const r = queueMail(root, add("the agent's wording")) as { item: { id: string } };
    const out = await acceptMail(root, "alice", r.item.id, "my own wording");
    expect(out.saved).toBe(true);
    expect(global()).toContain("my own wording");
    expect(global()).not.toContain("the agent's wording");
    expect(mailCount(root)).toBe(0);
  });
  it("replace and retire act on the entry they name; a retire whose entry is gone just clears", async () => {
    fs.mkdirSync(path.join(root, "memory"), { recursive: true });
    fs.writeFileSync(path.join(root, "memory/MEMORY.md"), "# Memory\n\n- 2026-10-01: old build note\n- 2026-10-01: lives in Kyiv\n");
    const rep = queueMail(root, { kind: "replace", scope: "global", entry: "build uses bun", match: "old build", from: "after-run" }) as { item: { id: string } };
    const ret = queueMail(root, { kind: "retire", scope: "global", match: "Kyiv", from: "after-run" }) as { item: { id: string } };
    const gone = queueMail(root, { kind: "retire", scope: "global", match: "never existed", from: "after-run" }) as { item: { id: string } };
    expect((await acceptMail(root, "alice", rep.item.id)).saved).toBe(true);
    expect((await acceptMail(root, "alice", ret.item.id)).saved).toBe(true);
    expect((await acceptMail(root, "alice", gone.item.id)).saved).toBe(false);
    expect(global()).toContain("build uses bun");
    expect(global()).not.toContain("old build note");
    expect(global()).not.toContain("Kyiv");
    expect(mailCount(root)).toBe(0);
  });
  it("an item that is already gone is an error, and an empty edit does not write", async () => {
    await expect(acceptMail(root, "alice", "mb-gone00001")).rejects.toThrow("not in the mailbox");
    const r = queueMail(root, add("keep")) as { item: { id: string } };
    await expect(acceptMail(root, "alice", r.item.id, "   ")).rejects.toThrow("empty");
    expect(mailCount(root)).toBe(1);
  });
});

describe("the mailbox routes", () => {
  it("list with what a replace or retire touches, accept (edited), skip, skip all", async () => {
    const users = new UserService(dataDir);
    const token = users.create("mia", "user", { password: "test-pass-1" }).token;
    const app = buildApp({ users, sessions: new SessionService(dataDir), config: defaultInstanceConfig(), dataDir, bus: new EventBus() });
    const call = (url: string, body?: unknown) =>
      app.request(url, { method: body === undefined ? "GET" : "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const miaRoot = userPaths(dataDir, "mia").root;
    fs.mkdirSync(path.join(miaRoot, "memory"), { recursive: true });
    fs.writeFileSync(path.join(miaRoot, "memory/MEMORY.md"), "# Memory\n\n- 2026-10-01: lives in Kyiv\n");
    const a = queueMail(miaRoot, add("tea, no sugar")) as { item: { id: string } };
    queueMail(miaRoot, { kind: "retire", scope: "global", match: "Kyiv", from: "after-run" });
    queueMail(miaRoot, add("to skip"));
    const list = (await (await call("/v1/agent/mailbox")).json()) as { items: { id: string; kind: string; target?: string; scopeLabel: string }[] };
    expect(list.items.map((i) => i.kind)).toEqual(["add", "retire", "add"]);
    expect(list.items[1]!.target).toBe("2026-10-01: lives in Kyiv");
    expect(list.items[0]!.scopeLabel).toBeTruthy();
    const done = await call("/v1/agent/mailbox/accept", { id: a.item.id, entry: "tea with no sugar" });
    expect(done.status).toBe(200);
    expect(readMemory(miaRoot, resolveScope(miaRoot, "global"))).toContain("tea with no sugar");
    expect((await call("/v1/agent/mailbox/accept", { id: a.item.id })).status).toBe(400);
    const skipOne = await call("/v1/agent/mailbox/skip", { id: list.items[2]!.id });
    expect(skipOne.status).toBe(200);
    expect((await call("/v1/agent/mailbox/skip", { id: list.items[2]!.id })).status).toBe(404);
    expect(wasDeclined(miaRoot, add("to skip"))).toBe(true);
    await call("/v1/agent/mailbox/skip", { all: true });
    expect(mailCount(miaRoot)).toBe(0);
    // another user's mailbox is a different folder
    expect(mailCount(root)).toBe(0);
  });
});
