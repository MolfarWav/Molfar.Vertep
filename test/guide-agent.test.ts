/**
 * The Molfar page's guide (client-agent/src/guide): its registry against the page's source,
 * the copies of the shell's shared files, and the state store two frames share.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AGENT_HELP_GROUPS, HELP_GROUPS, searchHelp, type GuideState } from "../client/src/guide/guide.js";
import { createGuideStore } from "../client/src/guide/store-core.js";
import { AGENT_TIPS, AGENT_TOURS } from "../client-agent/src/guide/tips.js";

const ROOT = join(import.meta.dir, "..");
const AGENT = join(ROOT, "client-agent", "src");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

const code = sources(AGENT)
  .filter((p) => !p.endsWith("tips.ts"))
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

/** Every name some element carries in its `data-guide` (a space-separated list). */
const drawn = new Set<string>();
for (const m of code.matchAll(/data-guide=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
  const v = m[1] ?? m[2] ?? "";
  if (v.includes("$" + "{id}")) {
    // agent.section.${id}: one per section of the project page
    for (const id of ["instructions", "memory", "skills", "checkpoints", "files", "chats", "model"]) drawn.add(v.replace("$" + "{id}", id));
  } else for (const name of v.split(/\s+/)) drawn.add(name);
}

describe("the copies of the shell's shared guide files", () => {
  // the frontends build apart (the builder reads nothing above a project folder), so these are copies
  for (const f of ["guide.ts", "store-core.ts", "target.ts", "place.ts"]) {
    it(`${f} is the shell's, line for line`, () => {
      const copy = readFileSync(join(AGENT, "guide", f), "utf8").split("\n").slice(2).join("\n");
      expect(copy).toBe(readFileSync(join(ROOT, "client", "src", "guide", f), "utf8"));
    });
  }
});

describe("registry", () => {
  const ids = AGENT_TIPS.map((x) => x.id);
  const ID = /^[a-z0-9][a-z0-9.-]{0,63}$/; // what src/guide-state.ts accepts

  it("ids are unique, acceptable to the server, and none is a What's new tip", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !ID.test(id))).toEqual([]);
    expect(AGENT_TOURS.map((x) => x.id).filter((id) => !ID.test(id))).toEqual([]);
    expect(AGENT_TIPS.filter((x) => x.since)).toEqual([]);
  });
  it("every tip has English and Ukrainian title and body", () => {
    for (const x of AGENT_TIPS) {
      expect([x.id, x.title.en.trim() !== "", x.title.uk.trim() !== "", x.body.en.trim() !== "", x.body.uk.trim() !== ""]).toEqual([x.id, true, true, true, true]);
    }
  });
  it("every target is drawn by some element of the page", () => {
    const missing = AGENT_TIPS.filter((x) => x.target && !drawn.has(x.target)).map((x) => `${x.id} -> ${x.target}`);
    expect(missing).toEqual([]);
  });
  it("tours: steps are tips, 2-5 steps, one per place", () => {
    for (const tour of AGENT_TOURS) {
      expect(tour.steps.filter((s) => !ids.includes(s))).toEqual([]);
      expect(tour.steps.length).toBeGreaterThanOrEqual(2);
      expect(tour.steps.length).toBeLessThanOrEqual(5);
      expect(["agent.chat", "agent.project"]).toContain(tour.place);
    }
    expect(new Set(AGENT_TOURS.map((x) => x.place)).size).toBe(AGENT_TOURS.length);
  });
  it("help tips are in the page's groups, every group has one, 12-25 in all", () => {
    const help = AGENT_TIPS.filter((x) => x.help);
    expect(help.length).toBeGreaterThanOrEqual(12);
    expect(help.length).toBeLessThanOrEqual(25);
    for (const x of help) expect(AGENT_HELP_GROUPS as readonly string[]).toContain(x.help as string);
    for (const g of AGENT_HELP_GROUPS) expect(help.some((x) => x.help === g)).toBe(true);
  });
  it("Show me only asks for panels the host knows", () => {
    const known = ["chat", "sidebar", "memory", "skills", "inspector", "project", "project-app", "project-chat"];
    for (const x of AGENT_TIPS) if (x.open) expect([x.id, x.open.panel === undefined || known.includes(x.open.panel)]).toEqual([x.id, true]);
  });
  it("a tip with a target can be shown (it has `open`)", () => {
    for (const x of AGENT_TIPS.filter((t) => t.help && t.target)) expect([x.id, x.open !== undefined]).toEqual([x.id, true]);
  });
  it("search uses the page's groups: the shell's list is untouched", () => {
    expect(searchHelp(AGENT_TIPS, "undo", AGENT_HELP_GROUPS).map((x) => x.id)).toContain("help.safety.undo");
    expect(searchHelp(AGENT_TIPS, "undo")).toEqual([]); // the shell's groups know none of these
    expect(searchHelp(AGENT_TIPS, "скасувати", AGENT_HELP_GROUPS).length).toBeGreaterThan(0);
    expect(searchHelp(AGENT_TIPS, "", AGENT_HELP_GROUPS).length).toBe(AGENT_TIPS.filter((x) => x.help).length);
    expect(HELP_GROUPS).not.toContain("chat");
  });
});

describe("the state two frames share", () => {
  /** A fake settings endpoint holding the one `guide` value. */
  function server(initial?: GuideState) {
    const s = { value: initial, reads: 0, writes: [] as GuideState[], failReads: false };
    return {
      s,
      io: {
        get: async () => {
          s.reads++;
          if (s.failReads) throw new Error("offline");
          return s.value ? structuredClone(s.value) : undefined;
        },
        put: async (g: GuideState) => {
          s.writes.push(structuredClone(g));
          s.value = structuredClone(g);
        },
      },
    };
  }
  const done = (id: string) => (g: GuideState | undefined): GuideState => ({ ...g, tours: [...new Set([...(g?.tours ?? []), id])] });

  it("a save never drops the ids the other frame wrote meanwhile", async () => {
    const srv = server({ tours: ["shell.home"], seen: ["new.x"], lastVersion: "1.0.9" });
    const agent = createGuideStore(srv.io);
    await agent.load();
    // the shell finishes another tour after the agent page loaded
    srv.s.value = { tours: ["shell.home", "shell.app"], seen: ["new.x", "new.y"], lastVersion: "1.0.9" };
    await agent.save(done("agent.chat"));
    expect(srv.s.value).toEqual({ tours: ["shell.home", "shell.app", "agent.chat"], seen: ["new.x", "new.y"], lastVersion: "1.0.9" });
    // and the page's own copy now has them too
    expect(agent.state()?.tours).toEqual(["shell.home", "shell.app", "agent.chat"]);
  });
  it("an explicit reset replaces the list; it is not undone by a stale copy", async () => {
    const srv = server({ tours: ["a", "b"] });
    const store = createGuideStore(srv.io);
    await store.load();
    srv.s.value = { tours: ["a", "b", "c"] };
    await store.save((g) => ({ ...g, tours: [] }));
    expect(srv.s.value).toEqual({ tours: [] });
  });
  it("shows the change at once, writes after reading, and serializes quick saves", async () => {
    const srv = server();
    const store = createGuideStore(srv.io);
    await store.load();
    const a = store.save(done("one"));
    expect(store.state()?.tours).toEqual(["one"]); // before any write
    const b = store.save(done("two"));
    await Promise.all([a, b]);
    expect(srv.s.value?.tours).toEqual(["one", "two"]);
    expect(srv.s.writes.length).toBe(2);
  });
  it("a settings read that fails keeps this frame's copy and still writes it", async () => {
    const srv = server({ tours: ["a"] });
    const store = createGuideStore(srv.io);
    await store.load();
    srv.s.failReads = true;
    await store.save(done("b"));
    expect(srv.s.value?.tours).toEqual(["a", "b"]);
  });
  it("clear forgets the account's state", async () => {
    const srv = server({ tours: ["a"] });
    const store = createGuideStore(srv.io);
    await store.load();
    expect(store.loaded()).toBe(true);
    store.clear();
    expect(store.state()).toBeUndefined();
    expect(store.loaded()).toBe(false);
  });
});
