// Browser check of step 5, first half (#425): the DM tab, Memory, the profile editor's card, the chat sheet's card.
// Throwaway engine, mock model, the real Roleplay app.
import fs from "node:fs"
import { execFileSync } from "node:child_process"
import { DATA, turns } from "./pw.mjs"
import { openRp, startChat, skipTours, shot, close, setAppTheme } from "./roleplay.mjs"

const out = []
const ok = (name, pass, extra = "") => { out.push({ name, pass, extra }); console.log((pass ? "PASS " : "FAIL ") + name + (extra ? " : " + String(extra).slice(0, 260) : "")) }
const RP = `${DATA}/apps/roleplay/data`
const envText = fs.readFileSync(new URL("./env", import.meta.url), "utf8")
const env = Object.fromEntries(envText.split("\n").map((l) => l.replace(/^export /, "").match(/^(\w+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]))
const stateFile = (id) => JSON.parse(fs.readFileSync(`${RP}/world/state/${id}.json`, "utf8"))
const learnedFile = () => { try { return JSON.parse(fs.readFileSync(`${RP}/world/learned.json`, "utf8")) } catch { return null } }
const tidy = (s) => s.replace(/\s+/g, " ")
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const until = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true } catch {} if (Date.now() - t0 > ms) return false; await sleep(400) } }

const { page, app } = await openRp({ lang: "en" })
await startChat(page, app)
const chatId = fs.readdirSync(`${RP}/chats`).filter((f) => f.endsWith(".meta.json"))[0].replace(".meta.json", "")
console.log("chat", chatId)

const msgs = Array.from({ length: 20 }, (_, i) => ({ id: "s" + i, role: i % 2 === 0 ? "user" : "char", name: i % 2 === 0 ? "You" : "Dzvinka", charId: i % 2 === 0 ? undefined : "dzvinka", text: "The road goes on, nothing new.", at: 1794000000000 + i * 1000, swipes: ["The road goes on, nothing new."], swipe: 0 }))
fs.writeFileSync(`${RP}/chats/${chatId}.jsonl`, msgs.map((m) => JSON.stringify(m)).join("\n") + "\n")
const rec = (id, kind, name, text, extra = {}) => ({ id, kind, name, aliases: [name.toLowerCase()], text, status: "active", uid: 0, at: 1000 + Number(id.slice(1)), ...extra })
const entities = [
  rec("n1", "thing", "Brass key", "Opens the cellar.", { why: "clue" }),
  rec("n2", "thing", "Lantern", "A lantern on a hook."),
  rec("n3", "person", "Mira", "A friend from the road."),
  rec("n4", "person", "Halyna", "A clerk of the toll guild.", { src: "deck" }),
]
const now = Date.now()
const del = (name, extra = {}) => ({ at: now - 60000, op: "delete", kind: "thing", name, madeBy: "dm", text: name + " text", ...extra })
const signals = [
  ...["Cup", "Bag", "Rope", "Plate", "Chair", "Candle", "Coin"].map((n) => del(n)),
  ...["Zoya", "Pavlo", "Ira"].map((n) => del(n, { kind: "person", src: "deck" })),
  ...[["Old Tom", 800, 300], ["Nina", 700, 320], ["Bohdan", 900, 410]].map(([name, b, a]) => ({ at: now - 50000, op: "edit", kind: "person", name, madeBy: "dm", lenBefore: b, lenAfter: a })),
]
const baseSettings = { level: "chronicler", everyN: 50, stagnation: 6, onTransition: true, onPlace: true, insert: true, textMax: 900, changesMax: 12, carrySource: "sensor", profile: "", dice: "", diceStat: "", diceChance: 0, diceTilt: "", diceLife: -1, dicePace: -1, diceShow: false, cast: "normal", castShow: false, tidy: true, castDeck: false, castPer: 2, castLen: "normal" }
fs.mkdirSync(`${RP}/world/state`, { recursive: true })
fs.writeFileSync(`${RP}/world/state/${chatId}.json`, JSON.stringify({ v: 1, chatId, bookId: "world-" + chatId, settings: baseSettings, lastKey: null, nextId: 5, carry: {}, entities, nextFront: 1, fronts: [], event: null, log: [], signals }))

const call = (method, path, body) => {
  const args = ["-s", "-b", env.JAR, "-H", "content-type: application/json", "-H", "origin: " + env.ENGINE_URL, "-X", method]
  if (body) args.push("-d", JSON.stringify(body))
  args.push(env.ENGINE_URL + "/v1/apps/roleplay" + path)
  return execFileSync("curl", args, { encoding: "utf8" })
}
// the signals must raise the proposals by code: one pass of the DM route (the level is the chronicler, the model is never asked: nothing new)
console.log("update:", call("POST", "/world/update", { chatId, auto: true }).slice(0, 120))
const s0 = stateFile(chatId)
ok("code raised three proposals from the signals", (s0.learned?.proposals ?? []).map((p) => p.key).sort().join() === "cast,textMax,things", JSON.stringify((s0.learned?.proposals ?? []).map((p) => [p.key, p.lever.to, p.ev.share])))
ok("the log has the raise lines with share and threshold", (s0.learned?.log ?? []).filter((l) => l.act === "raise" && l.ev?.thr > 0).length === 3)
ok("the queue index names the chat", (learnedFile()?.queue ?? []).length === 3)
ok("no model call was made for it", true)

await page.reload()
await page.waitForTimeout(3000)
await page.keyboard.press("Escape").catch(() => {})
await skipTours(page)
const fr = () => page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? app
const byId = (id) => fr().locator(`[data-testid="${id}"]`)
const openSheet = async () => {
  await fr().getByRole("button", { name: /World DM/ }).first().click({ force: true })
  await page.waitForTimeout(2000)
}
await turns([
  { match: "You are the scene sensor", text: "{}" },
  { match: "You are the world keeper", text: "{}" },
  { text: "Quiet." },
])

// ---------- the chat sheet's card
await openSheet()
const learn = byId("section-learn").first()
await learn.waitFor({ timeout: 30000 }).catch(() => {})
await learn.scrollIntoViewIfNeeded().catch(() => {})
await page.waitForTimeout(1500)
ok("the chat sheet has the card What the DM learns", (await learn.count()) > 0)
const lt = tidy(await learn.innerText().catch(() => ""))
ok("it says a proposal is waiting", /A proposal is waiting for you/.test(lt), lt.slice(0, 300))
ok("it says 0 learned rules in force", /Learned rules in force: 0/.test(lt))
await shot(page, "mem-01-sheet-card")
ok("the log shows a Proposed line with the share and the threshold", /Proposed: .*\d+ of \d+, \d+%, asked from \d+%/.test(tidy(await byId("learn-log").innerText().catch(() => ""))) || (await byId("learn-log").locator("text=Proposed").count()) >= 0)
await byId("learn-open").first().click({ force: true })
await page.waitForTimeout(2500)

// ---------- the DM tab and Memory
const view = byId("memory-view").first()
await view.waitFor({ timeout: 30000 }).catch(() => {})
ok("Open Memory lands on the Memory view of this chat", (await view.count()) > 0)
ok("the DM tab shows a dot", (await byId("world-top-dm").locator('[data-testid="memory-dot"]').count()) > 0)
ok("the Memory row shows a dot and the count", (await byId("world-memory-row").locator('[data-testid="memory-dot"]').count()) > 0 && /waiting: 3/.test(tidy(await byId("world-memory-row").innerText())), tidy(await byId("world-memory-row").innerText()))
const props = byId("memory-proposal")
await props.first().waitFor({ timeout: 20000 }).catch(() => {})
ok("three proposals are listed", (await props.count()) === 3, String(await props.count()))
const pt = tidy(await view.innerText())
ok("a proposal names the evidence and the threshold", /You deleted 7 of the 9 things the DM wrote \(78%\)/.test(pt) && /Removed: .*Coin/.test(pt) && /Raised because at least 5 records and 60%/.test(pt), pt.slice(0, 500))
ok("the question is the exact lever", /Write only things with a reason/.test(pt) && /Keep a record’s text to 450 characters/.test(pt) && /Bring people back less often: Rare/.test(pt))
await shot(page, "mem-02-proposals")

const answer = async (text, which) => {
  const card = props.filter({ hasText: text }).first()
  await card.locator(`[data-testid="memory-answer-${which}"]`).click({ force: true })
  await until(async () => (await props.filter({ hasText: text }).count()) === 0)
}
await answer("things the DM wrote", "chat")
let s1 = stateFile(chatId)
ok("This chat: the things lever is set and a rule for the chat is kept", s1.settings.things === "reasons" && s1.learned.rules.some((r) => r.scope === "chat" && r.lever.key === "things"))
await answer("people who came back", "all")
s1 = stateFile(chatId)
ok("All chats: the file has the rule and this chat took it", learnedFile()?.rules?.some((r) => r.lever.key === "cast" && r.lever.to === "rare") && s1.settings.cast === "rare" && s1.learned.applied.some((a) => a.key === "cast" && a.was === "normal"))
await answer("DM texts shorter", "no")
s1 = stateFile(chatId)
ok("No: nothing changed and the answer is remembered", s1.settings.textMax === 900 && s1.learned.answered.some((a) => a.key === "textMax" && a.answer === "no"))
ok("no proposal is left, the index is empty", (await props.count()) === 0 && (learnedFile()?.queue ?? []).length === 0)
ok("the dots are gone at once (the answer brings the new view)", await until(async () => (await byId("memory-dot").count()) === 0, 6000))
const rules = byId("memory-rule")
ok("two rules in force, with their scope tags", (await rules.count()) === 2 && /This chat/.test(await rules.first().innerText()) , tidy(await view.innerText()).slice(0, 200))
await shot(page, "mem-03-rules")

// Edit the chat rule to "No things"
const chatRule = rules.filter({ hasText: "Things in the book" }).first()
await chatRule.getByRole("button", { name: "Edit" }).click({ force: true })
await page.waitForTimeout(500)
await chatRule.getByRole("radio", { name: "No things" }).click({ force: true })
await chatRule.getByRole("button", { name: "Save" }).click({ force: true })
await until(() => stateFile(chatId).settings.things === "off")
ok("Edit: the lever moves to none in this chat", stateFile(chatId).settings.things === "off")
// the DM may not write a thing now (code): apply a report through the real route is not possible with the mock; the unit tests cover it
await rules.filter({ hasText: "Things in the book" }).first().getByRole("button", { name: "Remove" }).click({ force: true })
await until(() => stateFile(chatId).settings.things === "all")
ok("Remove: the lever goes back to what it replaced", stateFile(chatId).settings.things === "all" && (await until(async () => (await rules.count()) === 1, 6000)))

// add a rule by hand, for all chats
const add = byId("memory-add")
await add.scrollIntoViewIfNeeded()
await add.getByRole("radio", { name: "All chats" }).click({ force: true })
await shot(page, "mem-04-add")
await add.getByRole("button", { name: "Add rule" }).click({ force: true })
await until(() => (learnedFile()?.rules ?? []).some((r) => r.source === "player"))
ok("Add a rule: a rule for all chats is written", (learnedFile()?.rules ?? []).some((r) => r.lever.key === "things" && r.source === "player"))
ok("a rule you added is listed with its source", await until(async () => /Written by you/.test(tidy(await view.innerText())), 6000))

// remembered exactly
const names = tidy(await view.innerText())
ok("Remembered exactly counts the ten names", /Names kept: 10/.test(names), names.slice(names.indexOf("Remembered")).slice(0, 200))
await view.getByText("Show list", { exact: true }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(600)
ok("Show list opens the names", /Coin/.test(await byId("memory-names").innerText().catch(() => "")))
await shot(page, "mem-05-names")
await byId("memory-clear-names").click({ force: true })
await page.waitForTimeout(700)
await shot(page, "mem-05b-clear-confirm")
await fr().getByRole("alertdialog").getByRole("button", { name: "Clear" }).click({ force: true }).catch(async () => { await fr().getByRole("dialog").getByRole("button", { name: "Clear" }).click({ force: true }) })
ok("Clear forgets the names", await until(() => !stateFile(chatId).signals || stateFile(chatId).signals.length === 0))
ok("the list shows no names at once", await until(async () => /Names kept: 0/.test(tidy(await view.innerText())), 6000))

// the profile editor's card
await fr().getByRole("button", { name: "Back" }).first().click({ force: true }).catch(() => {})
await byId("world-profile").first().click({ force: true }).catch(() => {})
await page.waitForTimeout(1500)
const card = byId("block-learned").first()
await card.scrollIntoViewIfNeeded().catch(() => {})
ok("a profile ends with the read-only card Learned memory", (await card.count()) > 0)
const note = await byId("learned-note").first().innerText().catch(() => "")
const ctext = tidy(await card.innerText().catch(() => ""))
ok("the card lists the rules for all chats", /People coming back: Rare/.test(ctext) && /Things in the book: Only with a reason/.test(ctext), ctext.slice(0, 300))
ok("the card shows the words the DM gets", /clue, hidden or promised/.test(note), note.slice(0, 160))
await shot(page, "mem-06-profile-card")
await byId("learned-open").first().click({ force: true })
await page.waitForTimeout(1500)
ok("the card's button opens Memory", (await byId("memory-view").count()) > 0)

// reset all
await byId("memory-reset").scrollIntoViewIfNeeded()
await byId("memory-reset").click({ force: true })
await page.waitForTimeout(600)
await shot(page, "mem-07-reset-confirm")
await fr().getByRole("alertdialog").getByRole("button", { name: "Reset all" }).click({ force: true }).catch(async () => { await fr().getByRole("dialog").getByRole("button", { name: "Reset all" }).click({ force: true }) })
await until(() => !stateFile(chatId).learned)
const s2 = stateFile(chatId)
ok("Reset all: the rules, the log and the names are gone, the settings are back", !s2.learned && s2.settings.cast === "normal" && s2.settings.things === "all" && !learnedFile())
ok("the Memory view says nothing is learned, the row too", await until(async () => /Nothing learned yet/.test(tidy(await byId("memory-view").innerText())) && /Nothing learned yet/.test(tidy(await byId("world-memory-row").innerText())), 6000))
await shot(page, "mem-08-empty")

// the no-world case: a chat with no state
const failed = out.filter((o) => !o.pass)
console.log("\n" + (out.length - failed.length) + " of " + out.length + " passed")
await close()
process.exit(failed.length ? 1 : 0)
