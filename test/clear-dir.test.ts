import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { clearDir, FolderBusyError, sweepMovedAside } from "../src/clear-dir.js";

const busy = (code = "EPERM") => Object.assign(new Error(code), { code });
const noSleep = async () => {};
/** The error a call ends with (a call that succeeds fails the test). */
const failure = (p: Promise<void>): Promise<Error & { code?: string }> =>
  p.then(
    () => { throw new Error("expected a failure"); },
    (e: unknown) => e as Error & { code?: string },
  );

describe("clearDir (a staging leftover on Windows)", () => {
  it("removes a folder, and an absent one is fine", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clear-"));
    fs.writeFileSync(path.join(dir, "a.txt"), "x");
    await clearDir(dir);
    expect(fs.existsSync(dir)).toBe(false);
    await clearDir(dir);
  });

  it("retries a busy folder with a growing pause", async () => {
    let calls = 0;
    const waits: number[] = [];
    await clearDir("/x", {
      rm: () => { if (++calls < 3) throw busy("EBUSY"); },
      sleep: async (ms: number) => { waits.push(ms); },
      delayMs: 100,
    });
    expect(calls).toBe(3);
    expect(waits).toEqual([100, 200]);
  });

  it("moves it aside when it stays busy, and says what to do when it cannot", async () => {
    const moved: string[] = [];
    await clearDir("/s/roleplay", { rm: () => { throw busy(); }, rename: (_f: string, to: string) => { moved.push(to); }, sleep: noSleep });
    expect(moved[0]).toMatch(/^\/s\/roleplay\.old-\d+$/);
    const err = await failure(clearDir("/s/roleplay", { rm: () => { throw busy(); }, rename: () => { throw busy(); }, sleep: noSleep }));
    expect(err).toBeInstanceOf(FolderBusyError);
    expect(err.message).toContain("/s/roleplay");
    expect(err.message).toContain("delete that folder yourself");
  });

  it("does not hide other errors", async () => {
    const err = await failure(clearDir("/x", { rm: () => { throw busy("ENAMETOOLONG"); }, sleep: noSleep }));
    expect(err.code).toBe("ENAMETOOLONG");
  });

  it("sweeps folders moved aside, and only those", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sweep-"));
    fs.mkdirSync(path.join(root, "roleplay.old-1760000000000"));
    fs.mkdirSync(path.join(root, "roleplay"));
    sweepMovedAside(root);
    expect(fs.readdirSync(root)).toEqual(["roleplay"]);
    fs.rmSync(root, { recursive: true, force: true });
    sweepMovedAside(root);
  });
});
