// Builds a long chat with an old-format Dashboard state (before the entity registry) with the plugin of an older commit.
//   bun build-state.ts <out dir> [turns=250] [commit=<e519375~1>]     env RP = the Roleplay checkout (default: the folder next to this repository)
// PLUGIN=<absolute path of a plugin.js> builds with that file instead (a state in the NEW format).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [outRoot, nArg, commitArg] = process.argv.slice(2);
const RP = process.env.RP ?? path.resolve(import.meta.dir, "../../../../Molfar.Vertep-Roleplay"); // a sibling checkout by default
const N = Number(nArg ?? 250);
const pluginFile = process.env.PLUGIN ?? path.join(import.meta.dir, "old-plugin.tmp.js");
if (!process.env.PLUGIN) fs.writeFileSync(pluginFile, execFileSync("git", ["-C", RP, "show", `${commitArg ?? "e519375~1"}:plugins/relations/plugin.js`], { encoding: "utf8", maxBuffer: 64 << 20 }));
const P: any = await import("file:///" + pluginFile.split(path.sep).join("/"));
const root = outRoot!;
fs.rmSync(root, { recursive: true, force: true });
for (const d of ["chats", "dashboard", "litopys", "groups", "characters/aria"]) fs.mkdirSync(path.join(root, d), { recursive: true });
fs.writeFileSync(path.join(root, "dashboard/config.json"), JSON.stringify({ autoSoul: false }));
fs.writeFileSync(path.join(root, "characters/aria/card.json"), JSON.stringify({ spec: "chara_card_v2", name: "Four Beauties", description: "### Aria\nA barista.\n### Bea\nA courier.\n### Cleo\nA pilot.\n### Dana\nA nurse.", extensions: {} }));
const hostFor = () => ({
  fs: {
    read: (rel: string) => fs.readFileSync(path.resolve(root, rel), "utf8"),
    write: (rel: string, c: string) => { const f = path.resolve(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c, "utf8"); },
    list: (rel = ".") => fs.readdirSync(path.resolve(root, rel)).sort(),
    remove: (rel: string) => fs.rmSync(path.resolve(root, rel), { recursive: true, force: true }),
  },
  store: { get: () => null, put: () => {}, delete: () => {}, keys: () => [] },
  llm: { request: (k: string) => pending.push(k), results: {} as Record<string, unknown>, embed: () => {}, embedResults: {} },
  net: { request: () => {}, results: {} },
  log: () => {},
});
let pending: string[] = [];
const names = ["Aria", "Bea", "Cleo", "Dana"];
const garments = ["red dress", "white blouse", "pleated skirt", "denim jacket", "leather boots", "silk scarf", "grey cardigan", "black leggings", "linen shirt", "sneakers"];
const prose = "She turned toward the window, the light catching her hair, and said something quiet that only the others could hear. ".repeat(30);
const msgs: any[] = [];
const worn: Record<string, string[]> = {};
for (let i = 0; i < N; i++) {
  msgs.push({ id: "u" + i, role: "user", name: "You", text: "Go on." });
  msgs.push({ id: "c" + i, role: "char", name: "Four Beauties", text: prose, swipe: 0, characterId: "aria" });
  fs.writeFileSync(path.join(root, "chats/c1.meta.json"), JSON.stringify({ title: "c1", userName: "You", model: "chat/model", characterId: "aria", updatedAt: Date.now() }));
  fs.writeFileSync(path.join(root, "chats/c1.jsonl"), msgs.map((m) => JSON.stringify(m)).join("\n") + "\n");
  const chars: Record<string, any> = {};
  for (const n of names) {
    const w = (worn[n] ??= []);
    const add = garments[(i + names.indexOf(n) * 3) % garments.length] + " " + i;
    const rem = w.length > 3 ? w.shift() : undefined;
    w.push(add);
    chars[n] = { mood: "calm", at: "room " + (i % 5), outfit: { add: [add], ...(rem ? { remove: [rem] } : {}) } };
  }
  const reply = JSON.stringify({ minutes: 5, present: names, chars, objects: { add: [{ item: "cup " + i, where: "on the table" }], ...(i > 3 ? { remove: ["cup " + (i - 3)] } : {}) }, clock: { place: "Apartment, room " + (i % 5) } });
  const host: any = hostFor();
  const call: any = { method: "POST", path: "/dashboard/update", query: {}, body: { chatId: "c1", op: "send" } };
  pending = [];
  let out = P.handleRoute(call, host);
  for (let pass = 0; out?.__llmPending && pass < 4; pass++) {
    if (out.stash) call.stash = out.stash;
    for (const k of pending) host.llm.results[k] = { text: reply, model: "mock", usage: { input: 1, output: 1 }, genTimeMs: 1 };
    pending = [];
    out = P.handleRoute(call, host);
  }
  if (!out?.json?.ok) { console.log("turn", i, JSON.stringify(out).slice(0, 300)); break; }
}
const st = JSON.parse(fs.readFileSync(path.join(root, "dashboard/state/c1.json"), "utf8"));
console.log("snapshots", Object.keys(st.snapshots).length, "state bytes", fs.statSync(path.join(root, "dashboard/state/c1.json")).size);
