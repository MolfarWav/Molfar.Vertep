/**
 * The shell's guide (client/src/guide): the pure logic and the registry. The registry is
 * checked against the client source, so a tip never points at an element nobody draws.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  GUIDE_BASELINE,
  HELP_GROUPS,
  compareVersions,
  markSeen,
  markTourDone,
  resetTours,
  searchHelp,
  tipText,
  tourFor,
  tourSteps,
  whatsNew,
  type Tip,
  type Tour,
} from "../client/src/guide/guide.js";
import { ONLY_WITHOUT_MODEL, TIPS, TOURS } from "../client/src/guide/tips.js";

const CLIENT = join(import.meta.dir, "..", "client", "src");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

const code = sources(CLIENT)
  .filter((p) => !p.endsWith("tips.ts") && !p.includes("i18n"))
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

/** Every name some element carries in its `data-guide` (a space-separated list). */
const drawn = new Set<string>();
for (const m of code.matchAll(/data-guide=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
  const v = m[1] ?? m[2] ?? "";
  if (v.includes("$" + "{")) {
    // settings.${t.value}: one per Settings section
    for (const tab of ["general", "backup", "api", "speech", "agent", "memory", "mcp", "developer", "server", "users"]) drawn.add(v.replace("$" + "{t.value}", tab));
  } else for (const name of v.split(/\s+/)) drawn.add(name);
}

const tip = (id: string, extra: Partial<Tip> = {}): Tip => ({
  id,
  title: { en: id, uk: id },
  body: { en: "", uk: "" },
  ...extra,
});

describe("compareVersions", () => {
  it("compares numerically, not as text", () => {
    expect(compareVersions("1.0.9", "1.0.10")).toBe(-1);
    expect(compareVersions("1.1", "1.0.9")).toBe(1);
    expect(compareVersions("1.0.8", "1.0.8.0")).toBe(0);
  });
});

describe("whatsNew", () => {
  const tips = [tip("a", { since: "1.0.9" }), tip("b", { since: "1.0.8" }), tip("c", { since: "1.1.0" }), tip("d")];

  it("a fresh install gets nothing and records the version", () => {
    expect(whatsNew(tips, undefined, "1.0.9", false)).toEqual({ tips: [], lastVersion: "1.0.9" });
  });
  it("someone who used the engine before the guide gets what is newer than the baseline", () => {
    expect(GUIDE_BASELINE).toBe("1.0.8");
    const r = whatsNew(tips, undefined, "1.0.9", true);
    expect(r.tips.map((t) => t.id)).toEqual(["a"]);
    expect(r.lastVersion).toBe("1.0.9");
  });
  it("never shows a tip from a version this build does not have yet", () => {
    expect(whatsNew(tips, { lastVersion: "1.0.8" }, "1.0.8", true).tips).toEqual([]);
  });
  it("skips tips already seen and older than lastVersion", () => {
    expect(whatsNew(tips, { lastVersion: "1.0.8", seen: ["a"] }, "1.1.0", true).tips.map((t) => t.id)).toEqual(["c"]);
    expect(whatsNew(tips, { lastVersion: "1.0.9" }, "1.1.0", false).tips.map((t) => t.id)).toEqual(["c"]);
  });
  it("tips without `since` are never in What's new", () => {
    expect(whatsNew(tips, { lastVersion: "0.1.0" }, "9.9.9", false).tips.map((t) => t.id)).not.toContain("d");
  });
});

describe("tours", () => {
  const tours: Tour[] = [
    { id: "t1", place: "shell.home", steps: ["x", "missing", "y"] },
    { id: "t2", place: "shell.app", steps: ["x"] },
  ];
  it("tourFor gives the first undone tour of the place, nothing when switched off", () => {
    expect(tourFor(tours, "shell.home", undefined)?.id).toBe("t1");
    expect(tourFor(tours, "shell.home", { tours: ["t1"] })).toBeNull();
    expect(tourFor(tours, "shell.home", { showTours: false })).toBeNull();
    expect(tourFor(tours, "shell.store", undefined)).toBeNull();
  });
  it("tourSteps drops ids that are not tips", () => {
    expect(tourSteps(tours[0] as Tour, [tip("x"), tip("y")]).map((t) => t.id)).toEqual(["x", "y"]);
  });
  it("state helpers add without losing the rest", () => {
    expect(markSeen({ tours: ["t"] }, ["a", "a"], "1.0.9")).toEqual({ tours: ["t"], seen: ["a"], lastVersion: "1.0.9" });
    expect(markTourDone({ seen: ["a"] }, "t1").tours).toEqual(["t1"]);
    expect(resetTours({ tours: ["t1"], showTours: false })).toEqual({ tours: [], showTours: false });
  });
});

describe("text and search", () => {
  const t: Tip = tip("z", { help: "start", title: { en: "Tabs", uk: "Вкладки" }, body: { en: "Open tabs.", uk: "" }, keywords: { en: "strip", uk: "стрічка" } });
  it("tipText reads Ukrainian for uk and English for every other locale or a missing text", () => {
    expect(tipText(t.title, "uk")).toBe("Вкладки");
    expect(tipText(t.title, "de")).toBe("Tabs");
    expect(tipText(t.body, "uk")).toBe("Open tabs.");
  });
  it("searchHelp matches every word in either language and lists everything for an empty query", () => {
    expect(searchHelp([t, tip("hidden")], "").map((x) => x.id)).toEqual(["z"]);
    expect(searchHelp([t], "tabs strip").length).toBe(1);
    expect(searchHelp([t], "вкладки стрічка").length).toBe(1);
    expect(searchHelp([t], "tabs nothing")).toEqual([]);
  });
  it("the real registry finds the bug report and connecting a model", () => {
    expect(searchHelp(TIPS, "bug").map((x) => x.id)).toEqual(expect.arrayContaining(["help.bug.menu", "help.bug.footer", "new.ask-molfar"]));
    expect(searchHelp(TIPS, "помилка").length).toBeGreaterThan(2);
    expect(searchHelp(TIPS, "model key").map((x) => x.id)).toContain("help.models.connect");
    expect(searchHelp(TIPS, "xyzzy-nothing")).toEqual([]);
  });
});

describe("registry", () => {
  const ids = TIPS.map((x) => x.id);
  const ID = /^[a-z0-9][a-z0-9.-]{0,63}$/; // what src/guide-state.ts accepts

  it("ids are unique and acceptable to the server", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !ID.test(id))).toEqual([]);
    expect(TOURS.map((x) => x.id).filter((id) => !ID.test(id))).toEqual([]);
  });
  it("every tip has English and Ukrainian title and body", () => {
    for (const x of TIPS) {
      expect([x.id, x.title.en.trim() !== "", x.title.uk.trim() !== "", x.body.en.trim() !== "", x.body.uk.trim() !== ""]).toEqual([x.id, true, true, true, true]);
    }
  });
  it("every target is drawn by some element", () => {
    const missing = TIPS.filter((x) => x.target && !drawn.has(x.target)).map((x) => `${x.id} -> ${x.target}`);
    expect(missing).toEqual([]);
  });
  it("every tour step is a tip, and a tour has 2-5 steps", () => {
    for (const tour of TOURS) {
      expect(tour.steps.filter((s) => !ids.includes(s))).toEqual([]);
      expect(tour.steps.length).toBeGreaterThanOrEqual(2);
      expect(tour.steps.length).toBeLessThanOrEqual(5);
    }
    expect(new Set(TOURS.map((x) => x.place)).size).toBe(TOURS.length);
  });
  it("the model-only steps are tour steps", () => {
    const steps = TOURS.flatMap((x) => x.steps);
    expect(ONLY_WITHOUT_MODEL.filter((s) => !steps.includes(s))).toEqual([]);
  });
  it("a What's new tip with a target can be shown (`open`), and sits in the help list", () => {
    const news = TIPS.filter((x) => x.since);
    expect(news.length).toBeGreaterThan(0);
    for (const x of news) {
      if (x.target) expect([x.id, x.open !== undefined]).toEqual([x.id, true]);
      expect([x.id, x.help !== undefined]).toEqual([x.id, true]);
    }
  });
  it("help tips are in a known group, and every group has at least one", () => {
    const helpTips = TIPS.filter((x) => x.help);
    expect(helpTips.length).toBeGreaterThanOrEqual(15);
    expect(helpTips.length).toBeLessThanOrEqual(30);
    for (const g of HELP_GROUPS) expect(helpTips.some((x) => x.help === g)).toBe(true);
  });
  it("Show me opens a place a screen can reach", () => {
    for (const x of TIPS) {
      if (!x.open) continue;
      expect(["home", "app", "agent", "settings", "store"]).toContain(x.open.view);
      if (x.open.section) expect(["general", "backup", "api", "speech", "agent", "memory", "mcp", "developer", "server", "users"]).toContain(x.open.section);
    }
  });
});
