import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makePathGuard } from "../src/sandbox/workspace.js";

// junctions need no rights on Windows; elsewhere the type is ignored
const link = (target: string, at: string) => fs.symlinkSync(target, at, "junction");

describe("workspace path guard", () => {
  it("accepts files of a workspace reached through a link (Android's /data/user/0)", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "guard-"));
    const real = path.join(base, "data", "app");
    fs.mkdirSync(path.join(real, "apps", "roleplay"), { recursive: true });
    fs.writeFileSync(path.join(real, "apps", "roleplay", "package.json"), "{}");
    const viaLink = path.join(base, "user0");
    link(real, viaLink);
    const guard = makePathGuard(viaLink);
    const file = path.join(viaLink, "apps", "roleplay", "package.json");
    expect(() => guard.assertReadable(file, "apps/roleplay/package.json")).not.toThrow();
    expect(() => guard.assertWritable(path.join(viaLink, "apps", "roleplay", "new.json"), "apps/roleplay/new.json")).not.toThrow();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("still refuses a link inside the workspace that points out of it", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "guard-"));
    const ws = path.join(base, "ws");
    const outside = path.join(base, "secrets");
    fs.mkdirSync(ws);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "key.txt"), "x");
    link(outside, path.join(ws, "escape"));
    const guard = makePathGuard(ws);
    expect(() => guard.assertReadable(path.join(ws, "escape", "key.txt"), "escape/key.txt")).toThrow(/outside the workspace/);
    expect(() => guard.assertWritable(path.join(ws, "escape", "new.txt"), "escape/new.txt")).toThrow(/outside the workspace/);
    fs.rmSync(base, { recursive: true, force: true });
  });
});
