/**
 * Going back to the version before the last update (src/rollback.ts): the old
 * program comes back, and the saved account files only when the data format
 * moved past them.
 */
import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recordDataFormat } from "../src/data-format.js";
import { rollBack, snapshotOnVersionChange } from "../src/rollback.js";
import { readSnapshot, saveEngineFiles } from "../src/self-update.js";

const tmp = (name: string) => fs.mkdtempSync(path.join(os.tmpdir(), `chrysalis-${name}-`));

/** A data folder 1.0.0 used, and a program folder updated from it to 1.1.0. */
function updated() {
  const data = tmp("rollback-data");
  const dir = tmp("rollback-program");
  fs.writeFileSync(path.join(data, "users.json"), "before");
  recordDataFormat(data, "1.0.0", 1);
  saveEngineFiles(data, { from: "1.0.0", to: "1.1.0" });
  fs.writeFileSync(path.join(dir, "chrysalis"), "new");
  fs.writeFileSync(path.join(dir, "chrysalis.old"), "old");
  fs.mkdirSync(path.join(dir, "resources"));
  fs.mkdirSync(path.join(dir, "resources.old"));
  return { data, dir, program: { dir, exe: "chrysalis" } };
}

describe("rollback", () => {
  it("puts the old program back and leaves data an older version reads", () => {
    const { data, dir, program } = updated();
    fs.writeFileSync(path.join(data, "users.json"), "changed since");
    recordDataFormat(data, "1.1.0", 1);
    const done = rollBack(data, { program });
    expect(fs.readFileSync(path.join(dir, "chrysalis"), "utf8")).toBe("old");
    expect(fs.readFileSync(path.join(data, "users.json"), "utf8")).toBe("changed since");
    expect(done.join("\n")).toContain("1.0.0");
  });

  it("puts the account files back when the newer version moved the data format", () => {
    const { data, program } = updated();
    fs.writeFileSync(path.join(data, "users.json"), "migrated");
    recordDataFormat(data, "1.1.0", 2);
    rollBack(data, { program });
    expect(fs.readFileSync(path.join(data, "users.json"), "utf8")).toBe("before");
    expect(JSON.parse(fs.readFileSync(path.join(data, "format.json"), "utf8")).format).toBe(1);
    expect(readSnapshot(data)).toBeNull();
  });

  it("refuses a version the saved files do not belong to, changing nothing", () => {
    const { data } = updated();
    fs.writeFileSync(path.join(data, "users.json"), "migrated");
    recordDataFormat(data, "1.1.0", 2);
    expect(() => rollBack(data, { to: "0.9.0" })).toThrow(/belong to Molfar Vertep 1.0.0/);
    expect(fs.readFileSync(path.join(data, "users.json"), "utf8")).toBe("migrated");
  });

  it("refuses without an old program, changing nothing", () => {
    const { data, dir, program } = updated();
    fs.rmSync(path.join(dir, "resources.old"), { recursive: true });
    recordDataFormat(data, "1.1.0", 2);
    expect(() => rollBack(data, { program })).toThrow(/no earlier version/);
    expect(fs.readFileSync(path.join(dir, "chrysalis"), "utf8")).toBe("new");
    expect(JSON.parse(fs.readFileSync(path.join(data, "format.json"), "utf8")).format).toBe(2);
  });

  it("from source, only the data is handled", () => {
    const { data, dir } = updated();
    recordDataFormat(data, "1.1.0", 1);
    rollBack(data, { to: "1.0.0" });
    expect(fs.readFileSync(path.join(dir, "chrysalis"), "utf8")).toBe("new");
  });
});

describe("snapshot on a change of version", () => {
  it("copies the account files once per new version, before it migrates", () => {
    const data = tmp("version-change");
    expect(snapshotOnVersionChange(data, "1.0.0")).toBe(false);
    recordDataFormat(data, "1.0.0", 1);
    fs.writeFileSync(path.join(data, "users.json"), "from 1.0.0");
    expect(snapshotOnVersionChange(data, "1.0.0")).toBe(false);
    expect(snapshotOnVersionChange(data, "1.1.0")).toBe(true);
    expect(readSnapshot(data)).toMatchObject({ from: "1.0.0", to: "1.1.0" });
    // the update's own copy is not taken twice
    expect(snapshotOnVersionChange(data, "1.1.0")).toBe(false);
  });
});
