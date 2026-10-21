import { describe, expect, it } from "bun:test";
import { depsOf, sessionStale } from "../src/builder/browser/stale.js";

describe("a builder session that no longer matches dist (#26)", () => {
  const meta = (depsJs: string) => ({ format: 1, depsKey: "k", depsJs, depsCss: null, snapshot: "dev/snap-1.js", hot: [], seq: 0, retired: [] });

  it("reads the deps bundle of a meta, whatever else is there", () => {
    expect(depsOf(meta("dev/deps-a.js"))).toBe("dev/deps-a.js");
    expect(depsOf(null)).toBeNull();
    expect(depsOf(undefined)).toBeNull();
    expect(depsOf({ depsJs: 3 })).toBeNull();
  });

  it("a session on the deps bundle dist holds is current", () => {
    expect(sessionStale(meta("dev/deps-a.js"), "dev/deps-a.js")).toBe(false);
    // no dev build at all, and a fresh session that knows none
    expect(sessionStale(null, null)).toBe(false);
  });

  it("another build moved dist to a new deps bundle, or removed it: the session is stale", () => {
    expect(sessionStale(meta("dev/deps-b.js"), "dev/deps-a.js")).toBe(true);
    expect(sessionStale(null, "dev/deps-a.js")).toBe(true);
    expect(sessionStale(meta("dev/deps-b.js"), null)).toBe(true);
  });
});
