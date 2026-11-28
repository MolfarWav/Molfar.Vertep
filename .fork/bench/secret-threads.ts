// Bench for the World DM's secret threads (#545): the plugin's real DM run and reply hook on a synthetic story, with a
// real model behind host.llm. The story's replies are scripted; a dealt event or hint is written into the next reply, as
// a writing model would. Not a test: it needs a provider key (the ask-model skill's) and costs calls.
//
//   bun .fork/bench/secret-threads.ts <Roleplay checkout> <out dir> <provider>/<model> [turns=10] [story=en|uk] [secrets=1]
//
// Writes <out>/<tag>.json: every DM reply, the state's threads and log, and the counts printed at the end.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [rp, outDir, ref, turnsArg = "10", storyArg = "en", secretsArg = "1"] = process.argv.slice(2);
if (!rp || !outDir || !ref) throw new Error("usage: secret-threads.ts <Roleplay checkout> <out> <provider>/<model> [turns] [en|uk] [secrets]");
const provider = ref.slice(0, ref.indexOf("/"));
const model = ref.slice(ref.indexOf("/") + 1);
const TURNS = Number(turnsArg);
const SECRETS = Number(secretsArg);
const W = await import(pathToFileURL(path.resolve(rp, "plugins/world/plugin.js")).href);
const ASK = path.resolve(import.meta.dir, "../../.claude/skills/ask-model/scripts/ask.mjs");
mkdirSync(outDir, { recursive: true });

const STORIES = {
  en: {
    char: "Odarka",
    user: "Taras",
    card: "Odarka keeps a small inn below a mountain pass. Dry-witted, watchful, kind to travellers she trusts.",
    open: [
      ["char", "The inn is warm. Odarka sets a bowl before you and says the pass is closed until the snow settles."],
      ["user", "Then I will need a room. How much?"],
      ["char", "Two coppers, and you carry your own water up. Old Maksym at the toll tower says three days of snow."],
    ],
    turns: [
      ["I carry the water up and look around the room.", "The room is plain: a cot, a chest, a window that looks at the toll tower. Odarka lingers at the door."],
      ["Who else is staying tonight?", "Only a salt merchant, Petro, who has been drinking since noon, she says."],
      ["I go down and sit with the merchant.", "Petro pushes a cup over and complains about the toll and about wolves on the north road."],
      ["Have you seen the wolves yourself?", "He swears he saw their eyes by the old shrine, then laughs too loudly."],
      ["I help Odarka close the shutters.", "She works fast. A gust throws snow across the floor before the last bar drops."],
      ["You seem tired. Sit for a while.", "Odarka sits by the hearth, boots off, and for once says nothing sharp."],
      ["How long have you run this place?", "Since the winter her mother died, she says, and turns a log with the iron."],
      ["I offer to split wood in the morning.", "She accepts, and names the price off your room as if it hurts her."],
      ["Someone is knocking. I get up.", "On the step stands a boy from the toll tower, blue with cold, asking for broth."],
      ["I give the boy my blanket.", "Odarka watches you do it, then puts a second bowl on the table without a word."],
      ["What did the boy come to say?", "Maksym has fallen on the stairs, the boy says, and wants someone to mind the gate."],
      ["I will go with you to the tower.", "Odarka takes the lantern and a coil of rope and leads the way into the snow."],
    ],
  },
  uk: {
    char: "Одарка",
    user: "Тарас",
    card: "Одарка тримає невелику корчму під гірським перевалом. Гостра на язик, уважна, добра до мандрівників, яким довіряє.",
    open: [
      ["char", "У корчмі тепло. Одарка ставить перед тобою миску й каже, що перевал закритий, доки не вляжеться сніг."],
      ["user", "Тоді мені потрібна кімната. Скільки?"],
      ["char", "Два мідяки, і воду нагору носиш сам. Старий Максим із митної вежі каже, що снігу буде на три дні."],
    ],
    turns: [
      ["Я несу воду нагору й оглядаю кімнату.", "Кімната проста: ліжко, скриня, вікно на митну вежу. Одарка затримується в дверях."],
      ["Хто ще ночує сьогодні?", "Тільки солеторговець Петро, який п'є з полудня, каже вона."],
      ["Я спускаюся й сідаю до торговця.", "Петро підсуває кухоль і жаліється на мито та на вовків на північній дорозі."],
      ["Ти сам їх бачив, тих вовків?", "Він божиться, що бачив їхні очі біля старої каплиці, і надто голосно сміється."],
      ["Я допомагаю Одарці зачинити віконниці.", "Вона працює швидко. Порив кидає сніг на підлогу, перш ніж падає останній засув."],
      ["Ти втомилася. Посидь трохи.", "Одарка сідає біля печі, скинувши чоботи, і вперше нічого колючого не каже."],
      ["Давно ти тримаєш корчму?", "З тієї зими, коли померла мати, каже вона й перевертає поліно коцюбою."],
      ["Я пропоную зранку нарубати дров.", "Вона погоджується й скидає ціну за кімнату так, ніби їй це болить."],
      ["Хтось стукає. Я встаю.", "На порозі хлопчик із митної вежі, синій від холоду, просить юшки."],
      ["Я віддаю хлопчикові свою ковдру.", "Одарка дивиться, як ти це робиш, і мовчки ставить на стіл другу миску."],
      ["Що хлопчик прийшов сказати?", "Максим упав на сходах, каже хлопчик, і просить когось постерегти ворота."],
      ["Я піду з тобою до вежі.", "Одарка бере ліхтар і моток мотузки та йде першою в сніг."],
    ],
  },
} as const;
const story = STORIES[storyArg as "en" | "uk"];

const files: Record<string, string> = {};
const results: Record<string, any> = {};
const asked: { key: string; spec: any }[] = [];
const host = {
  fs: {
    read: (p: string) => { if (!(p in files)) throw new Error("ENOENT " + p); return files[p]!; },
    write: (p: string, s: string) => { files[p] = s; },
    remove: (p: string) => { delete files[p]; },
    list: (dir: string) => Object.keys(files).filter((k) => k.startsWith(dir + "/")).map((k) => k.slice(dir.length + 1)),
  },
  llm: { request: (key: string, spec: any) => { asked.push({ key, spec }); }, results },
  log: () => {},
};
const msgs: any[] = [];
const add = (role: string, text: string) => msgs.push({ id: "m" + msgs.length, role, name: role === "user" ? story.user : story.char, text, swipe: 0 });
const saveChat = () => { files["chats/c1.jsonl"] = msgs.map((m) => JSON.stringify(m)).join("\n") + "\n"; };
files["chats/c1.meta.json"] = JSON.stringify({ id: "c1", title: "The Pass", characterId: "odarka", userName: story.user, model: "bench/m" });
files["characters/odarka/card.json"] = JSON.stringify({ name: story.char, description: story.card });
files["settings.json"] = JSON.stringify({ model: "bench/m" });
for (const [role, text] of story.open) add(role, text);
saveChat();
const route = (method: string, p: string, body?: any, stash?: any) => W.handleRoute({ method, path: p, query: {}, body, ...(stash ? { stash } : {}) }, host);
route("PUT", "/world/settings", { chatId: "c1", level: "director", everyN: 1, stagnation: 0, onTransition: false, secrets: SECRETS, hintEvery: 2, fromStart: true });
const state = () => JSON.parse(files["world/state/c1.json"]!);

async function call(spec: any): Promise<any> {
  const dir = path.join(outDir, "tmp-" + process.pid);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "s.txt"), spec.systemPrompt);
  writeFileSync(path.join(dir, "p.txt"), spec.messages[0].content);
  const max = spec.presetParams.max_tokens;
  for (let attempt = 0; ; attempt++) {
    const p = Bun.spawn(["node", ASK, "-p", provider, "-m", model, "--system-file", path.join(dir, "s.txt"), "--prompt-file", path.join(dir, "p.txt"), "--max-tokens", String(max), "-t", String(spec.presetParams.temperature), "--timeout", "240", "--no-fallback", "--json"], { stdout: "pipe", stderr: "pipe" });
    const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
    await p.exited;
    if (p.exitCode === 0) {
      const r = JSON.parse(out);
      return { text: r.text, model, finish: r.finish, usage: r.usage, seconds: r.seconds, requestParams: { max_tokens: max } };
    }
    if (/429|rate.?limit|Timed out|HTTP 5\d\d/i.test(err) && attempt < 2) { await Bun.sleep(20000); continue; }
    // all thinking, no answer: the engine hands the plugin an empty text with reasoning, and it asks again with more room
    if (/hit max_tokens while reasoning/.test(err)) return { text: "", reasoning: "(cut off)", model, finish: "length", requestParams: { max_tokens: max } };
    return { text: "", error: err.trim().slice(0, 300), model };
  }
}

const rows: any[] = [];
for (let t = 0; t < TURNS; t++) {
  const [said, answer] = story.turns[t % story.turns.length]!;
  add("user", said);
  saveChat();
  const insert = W.llmRequest({ key: "reply", request: { sessionId: "c1", messages: [{ role: "user", content: said }] }, turn: { op: "send" } }, host);
  const parts: any[] = insert?.promptSources.parts ?? [];
  const hint = parts.find((p) => p.label === W.SECRET_LABEL)?.text.match(/fits: (.*?) Show it in passing/)?.[1] ?? "";
  const event = parts.find((p) => p.label === "World DM")?.text ?? "";
  const eventText = event.match(/What: (.*)/)?.[1] ?? "";
  add("char", [answer, hint, eventText].filter(Boolean).join(" "));
  saveChat();

  const before = state();
  const row: any = { turn: t + 1, hint, event: eventText, calls: [] };
  let r = route("POST", "/world/update", { chatId: "c1" });
  for (let k = 0; k < 4 && r?.__llmPending; k++) {
    const { key, spec } = asked.at(-1)!;
    const res = await call(spec);
    row.calls.push({ key, finish: res.finish, seconds: res.seconds, out: res.usage?.completion_tokens, error: res.error, text: res.text });
    results[key] = res;
    r = route("POST", "/world/update", { chatId: "c1" }, r.stash);
    delete results[key];
  }
  const after = state();
  const text = row.calls.at(-1)?.text ?? "";
  const out = text ? W.parseReply(text) : null;
  row.ok = r?.json?.ok === true;
  row.code = r?.json?.code ?? null;
  const known = new Set((before.secrets ?? []).filter((x: any) => x.status === "active").map((x: any) => x.id));
  const ops = Array.isArray(out?.secrets) ? out.secrets : [];
  row.ops = ops;
  row.unknownId = ops.filter((o: any) => o?.op !== "add" && !known.has(o?.id)).length;
  row.extraAdd = Math.max(0, ops.filter((o: any) => o?.op === "add").length - (SECRETS - known.size));
  row.eventOut = out?.event ?? null;
  row.threads = (after.secrets ?? []).map((x: any) => ({ id: x.id, status: x.status, idea: x.idea, hint: x.hint, surfaced: x.surfaced }));
  row.summary = after.log?.at(-1)?.summary ?? "";
  rows.push(row);
  console.log(`${t + 1}: ${row.ok ? "ok" : "FAIL " + row.code}${hint ? " [hint]" : ""}${eventText ? " [event]" : ""} ops=${ops.map((o: any) => o.op).join(",") || "-"} finish=${row.calls.map((c: any) => c.finish ?? c.error).join("/")}`);
  await Bun.sleep(1500);
}

// Words a thread brought in (5+ letters, nowhere in the scripted story or the card): one of them in a record, a front,
// or a summary is a sign the thread was written where it must not be. A sign, not a proof: read the file.
const words = (s: string) => new Set((s.toLowerCase().match(/[\p{L}']{5,}/gu) ?? []).map((w) => w.slice(0, 6)));
const scripted = words(JSON.stringify(story));
const secretWords = new Set([...words(rows.flatMap((r) => r.threads.map((x: any) => x.idea)).join(" "))].filter((w) => !scripted.has(w)));
const hits = (s: string) => [...words(s)].filter((w) => secretWords.has(w));
const final = state();
const leaks = [
  ...(final.entities ?? []).map((e: any) => ({ where: "record " + e.name, words: hits(e.name + " " + e.text), text: e.text })),
  ...(final.fronts ?? []).map((f: any) => ({ where: "front " + f.name, words: hits(f.name + " " + f.goal), text: f.goal })),
  ...rows.map((r) => ({ where: "summary " + r.turn, words: hits(r.summary), text: r.summary })),
].filter((x) => x.words.length >= 2);
const unmarked = rows.filter((r) => r.eventOut && !r.eventOut.secret && hits(r.eventOut.text ?? "").length >= 2).map((r) => ({ turn: r.turn, text: r.eventOut.text }));
const count = (what: string) => (final.secretLog ?? []).filter((l: any) => l.what === what).length;
const calls = rows.flatMap((r) => r.calls);
const summary = {
  ref, story: storyArg, secrets: SECRETS, turns: TURNS,
  ok: rows.filter((r) => r.ok).length,
  calls: calls.length,
  cutOff: calls.filter((c) => c.finish === "length").length,
  errors: calls.filter((c) => c.error).length,
  avgOutTokens: Math.round(calls.reduce((n, c) => n + (c.out ?? 0), 0) / Math.max(1, calls.filter((c) => c.out).length)),
  threadsEver: new Set(rows.flatMap((r) => r.threads.map((x: any) => x.id))).size,
  unknownId: rows.reduce((n, r) => n + r.unknownId, 0),
  extraAdd: rows.reduce((n, r) => n + r.extraAdd, 0),
  hintsSent: rows.filter((r) => r.hint).length,
  runsWithNewHint: rows.filter((r) => r.ops.some((o: any) => o.hint && o.op === "update")).length,
  eventsDealt: rows.filter((r) => r.eventOut).length,
  eventsMarked: rows.filter((r) => r.eventOut?.secret).length,
  eventsDropped: count("event-dropped"),
  unmarkedThreadEvents: unmarked.length,
  leakSigns: leaks.length,
};
const tag = [ref.replace(/[^\w.-]+/g, "_"), storyArg, "s" + SECRETS].join("-");
writeFileSync(path.join(outDir, tag + ".json"), JSON.stringify({ summary, leaks, unmarked, entities: final.entities, fronts: final.fronts, log: final.secretLog, rows }, null, 1));
console.log(JSON.stringify(summary));
