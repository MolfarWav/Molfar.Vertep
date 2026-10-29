// #66: the internal names (program, folder, log, env) moved from chrysalis to molfar-vertep;
// what an install of 1.7.x left behind is carried over, never dropped.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { adoptLegacyDir } from "../src/install.js";
import { logToFile } from "../src/logger.js";
import { clearEnv, readEnv } from "../src/env.js";
import { programNames } from "../src/self-update.js";

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rename66-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("the app-data folder", () => {
  it("moves a folder left by 1.7.x to the new name, with everything in it", () => {
    const legacy = path.join(tmp, "Chrysalis");
    const current = path.join(tmp, "MolfarVertep");
    fs.mkdirSync(path.join(legacy, "data", "users"), { recursive: true });
    fs.writeFileSync(path.join(legacy, "config.yaml"), "port: 9000\n");
    expect(adoptLegacyDir(current, legacy)).toBe(current);
    expect(fs.readFileSync(path.join(current, "config.yaml"), "utf8")).toBe("port: 9000\n");
    expect(fs.existsSync(path.join(current, "data", "users"))).toBe(true);
    expect(fs.existsSync(legacy)).toBe(false);
  });

  it("leaves both alone when the new one already exists", () => {
    const legacy = path.join(tmp, "Chrysalis");
    const current = path.join(tmp, "MolfarVertep");
    fs.mkdirSync(legacy);
    fs.mkdirSync(current);
    fs.writeFileSync(path.join(legacy, "old.txt"), "x");
    expect(adoptLegacyDir(current, legacy)).toBe(current);
    expect(fs.existsSync(path.join(legacy, "old.txt"))).toBe(true);
  });

  it("uses the new name for a fresh install", () => {
    const current = path.join(tmp, "MolfarVertep");
    expect(adoptLegacyDir(current, path.join(tmp, "Chrysalis"))).toBe(current);
    expect(fs.existsSync(current)).toBe(false);
  });

  it("keeps using the old folder when the move fails, so nothing looks lost", () => {
    const legacy = path.join(tmp, "Chrysalis");
    fs.mkdirSync(legacy);
    // the parent of the new name does not exist: the rename cannot happen
    expect(adoptLegacyDir(path.join(tmp, "missing", "MolfarVertep"), legacy)).toBe(legacy);
    expect(fs.existsSync(legacy)).toBe(true);
  });
});

describe("the log file", () => {
  it("carries chrysalis.log (and its rolled copy) over under the new name", () => {
    fs.mkdirSync(path.join(tmp, "logs"));
    fs.writeFileSync(path.join(tmp, "logs", "chrysalis.log"), "current\n");
    fs.writeFileSync(path.join(tmp, "logs", "chrysalis.log.1"), "older\n");
    const file = logToFile(tmp);
    expect(path.basename(file)).toBe("molfar-vertep.log");
    expect(fs.readFileSync(file, "utf8")).toBe("current\n");
    expect(fs.readFileSync(`${file}.1`, "utf8")).toBe("older\n");
    expect(fs.existsSync(path.join(tmp, "logs", "chrysalis.log"))).toBe(false);
  });

  it("does not overwrite a log already under the new name", () => {
    fs.mkdirSync(path.join(tmp, "logs"));
    fs.writeFileSync(path.join(tmp, "logs", "chrysalis.log"), "old\n");
    fs.writeFileSync(path.join(tmp, "logs", "molfar-vertep.log"), "new\n");
    const file = logToFile(tmp);
    expect(fs.readFileSync(file, "utf8")).toBe("new\n");
    expect(fs.readFileSync(path.join(tmp, "logs", "chrysalis.log"), "utf8")).toBe("old\n");
  });
});

describe("environment variables", () => {
  it("reads MOLFAR_VERTEP_* first and CHRYSALIS_* after", () => {
    expect(readEnv("PORT", { CHRYSALIS_PORT: "1", MOLFAR_VERTEP_PORT: "2" })).toBe("2");
    expect(readEnv("PORT", { CHRYSALIS_PORT: "1" })).toBe("1");
    const env: NodeJS.ProcessEnv = { CHRYSALIS_PORT: "1", MOLFAR_VERTEP_PORT: "2" };
    clearEnv("PORT", env);
    expect(env).toEqual({});
  });
});

describe("the program's names", () => {
  it("accepts both, the running one first, so an update can cross the rename in either direction", () => {
    expect(programNames("chrysalis.exe")).toEqual(["chrysalis.exe", "molfar-vertep.exe"]);
    expect(programNames("molfar-vertep")).toEqual(["molfar-vertep", "chrysalis"]);
  });
});
