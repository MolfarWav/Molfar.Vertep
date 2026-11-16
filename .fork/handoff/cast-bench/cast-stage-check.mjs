// Browser check of step 2.5 (#424): a mention is not the stage. A Dashboard snapshot with nobody in the scene, a reply that only names Olya,
// the log and the mark say "only mentioned", the bench row says when she was last named.
import fs from "node:fs"
import { DATA, turns } from "./pw.mjs"
import { openRp, startChat, skipTours, shot, close, setAppTheme } from "./roleplay.mjs"

const out = []
const ok = (name, pass, extra = "") => { out.push({ name, pass, extra }); console.log((pass ? "PASS " : "FAIL ") + name + (extra ? " : " + extra : "")) }
const RP = `${DATA}/apps/roleplay/data`
const diceFile = (id) => JSON.parse(fs.readFileSync(`${RP}/world/dice/${id}.json`, "utf8")).rolls
const stateFile = (id) => JSON.parse(fs.readFileSync(`${RP}/world/state/${id}.json`, "utf8"))

const { page, app } = await openRp({ lang: "en" })
await startChat(page, app)
const chatId = fs.readdirSync(`${RP}/chats`).filter((f) => f.endsWith(".meta.json"))[0].replace(".meta.json", "")
console.log("chat", chatId)

const msgs = Array.from({ length: 100 }, (_, i) => ({ id: "s" + i, role: i % 2 === 0 ? "user" : "char", name: i % 2 === 0 ? "You" : "Dzvinka", charId: i % 2 === 0 ? undefined : "dzvinka", text: "The road goes on, nothing new.", at: 1794000000000 + i * 1000, swipes: ["The road goes on, nothing new."], swipe: 0 }))
fs.writeFileSync(`${RP}/chats/${chatId}.jsonl`, msgs.map((m) => JSON.stringify(m)).join("\n") + "\n")
const olya = { id: "n1", kind: "person", name: "Olya", aliases: ["Olechka"], text: "Best friend from school. She writes often.", status: "active", uid: 0, at: 1, weight: 1, relation: "ally", link: { book: "bk1", uid: 1, title: "Olya" } }
fs.mkdirSync(`${RP}/world/state`, { recursive: true })
fs.writeFileSync(`${RP}/world/state/${chatId}.json`, JSON.stringify({ v: 1, chatId, bookId: "world-" + chatId, settings: { level: "living", everyN: 5, stagnation: 6, onTransition: true, onPlace: true, insert: true, textMax: 900, changesMax: 12, carrySource: "sensor", profile: "", dice: "flavour", diceStat: "auto", diceChance: 100, diceTilt: "even", diceLife: 0, dicePace: 0, diceShow: true, cast: "normal", castShow: true }, lastKey: null, nextId: 2, carry: {}, entities: [olya], nextFront: 1, fronts: [], event: null, log: [] }))
fs.mkdirSync(`${RP}/registry`, { recursive: true })
fs.writeFileSync(`${RP}/registry/${chatId}.json`, JSON.stringify({ v: 1, chatId, from: null, next: { p: 3, o: 1, l: 1 }, apart: [], suggest: [], entities: [{ id: "p2", kind: "person", name: "Olya", aliases: [{ text: "Olechka", src: "world" }], src: "world" }] }))
// the Dashboard's snapshots: nobody in any scene (so a name in the text can only be a mention)
const snap = () => ({ present: [], clock: {}, scene: {} })
const snapshots = Object.fromEntries(msgs.map((m) => [m.id + "#0", snap()]))
fs.mkdirSync(`${RP}/dashboard/state`, { recursive: true })
fs.writeFileSync(`${RP}/dashboard/state/${chatId}.json`, JSON.stringify({ snapshots, personIds: {} }))

await page.reload()
await page.waitForTimeout(3000)
await page.keyboard.press("Escape").catch(() => {})
await skipTours(page)
const frame = () => page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? app

await turns([{ match: "We keep walking.", text: "A message from Olya arrives: she is coming over tonight." }, { text: "Quiet." }])
const input = frame().getByLabel("Message input")
await input.waitFor({ timeout: 30000 })
await input.fill("We keep walking.")
await input.press("Enter")
await frame().getByText("A message from Olya arrives").first().waitFor({ timeout: 120000 }).catch(() => {})
await page.waitForTimeout(3000)
const rollsA = diceFile(chatId)
ok("the note went in (cast line, inserted)", rollsA.some((r) => r.kind === "cast" && r.inserted === true && r.id === "n1"), JSON.stringify(rollsA.find((r) => r.kind === "cast")).slice(0, 300))
ok("the log line carries how long ago she was last named (none yet: she was never named)", rollsA.find((r) => r.kind === "cast")?.seen === undefined)

// the Dashboard's snapshot of the carrier reply: nobody in the scene
const chatNow = fs.readFileSync(`${RP}/chats/${chatId}.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
const carrier = chatNow.filter((m) => m.role !== "user").at(-1)
console.log("carrier", carrier?.id, "swipe", carrier?.swipe)
const dashPath = `${RP}/dashboard/state/${chatId}.json`
const dash = JSON.parse(fs.readFileSync(dashPath, "utf8"))
dash.snapshots[`${carrier.id}#${carrier.swipe ?? 0}`] = snap()
fs.writeFileSync(dashPath, JSON.stringify(dash))

await turns([{ match: "Good.", text: "The road goes on." }, { text: "Quiet." }])
await input.fill("Good.")
await input.press("Enter")
await frame().getByText("The road goes on.").last().waitFor({ timeout: 120000 }).catch(() => {})
await page.waitForTimeout(3000)
const rollsB = diceFile(chatId)
const results = rollsB.filter((r) => r.kind === "cast").map((r) => r.result)
ok("the judge says mentioned, not came", results.includes("mentioned") && !results.includes("came"), JSON.stringify(results))
const st = stateFile(chatId)
ok("lastEntrance has res mentioned", st.lastEntrance?.res === "mentioned" && st.lastEntrance?.ok === false, JSON.stringify(st.lastEntrance))
ok("no stricter second try (no entrance left waiting)", !st.entrance, JSON.stringify(st.entrance ?? null))
await shot(page, "stage-1-after-second")

// the mark under the carrier reply
await page.waitForTimeout(1500)
const mark = frame().locator('[data-testid="dice-note"]')
const markText = (await mark.count()) ? (await mark.allInnerTexts()).join(" | ").replace(/\s+/g, " ") : ""
console.log("mark:", markText.slice(0, 300))
ok("(diagnostic) a mark is under a reply", (await mark.count()) > 0, markText.slice(0, 200))

// the World sheet card
const openSheet = async (pg, fr) => {
  await fr().getByRole('button', { name: /World DM/ }).first().click({ force: true })
  await pg.waitForTimeout(2000)
  const c = fr().locator('[data-testid="section-cast"]').first()
  if (await c.count()) {
    await c.scrollIntoViewIfNeeded()
    for (const name of [/Who is on the bench/, /Cast log/]) await c.getByText(name).first().click().catch(() => {})
    await pg.waitForTimeout(800)
  }
  return c
}
const card = await openSheet(page, frame)
ok('the card People coming back is in the sheet', (await card.count()) > 0)
if (await card.count()) {
  await shot(page, 'stage-2-card-dark')
  const txt = (await card.innerText()).replace(/\s+/g, ' ')
  console.log('card:', txt.slice(0, 700))
  ok('the log line says only mentioned', /only mentioned, not on stage/.test(txt), txt.slice(-260))
  ok("the 'last time' line says only mentioned", /Last time Olya was only mentioned/.test(txt))
  ok('the bench row: silent on stage and last named', /Olya/.test(txt) && /silent \d+ of \d+ · last named \d+ replies ago/.test(txt))
}

// light theme (the app's own: Daylight) and a phone
await page.keyboard.press('Escape'); await page.waitForTimeout(600)
await frame().getByRole('button', { name: /^Home$/ }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(800)
await setAppTheme(page, frame(), 'Daylight').catch((e) => console.log('setAppTheme', e.message))
await frame().getByRole('button', { name: 'Continue' }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(2500)
await openSheet(page, frame)
await shot(page, 'stage-3-card-light')
const phoneEnv = await openRp({ width: 390, theme: 'light', lang: 'en' })
await phoneEnv.page.waitForTimeout(2500)
await phoneEnv.page.keyboard.press('Escape').catch(() => {})
await skipTours(phoneEnv.page)
const f2 = () => phoneEnv.page.frames().find((f) => f.url().includes('/app/molfar/roleplay/')) ?? phoneEnv.app
await f2().getByRole('button', { name: 'Continue' }).first().click({ force: true }).catch(() => {})
await phoneEnv.page.waitForTimeout(2500)
const card2 = await openSheet(phoneEnv.page, f2)
ok('phone: the card is in the sheet', (await card2.count()) > 0)
await shot(phoneEnv.page, 'stage-4-phone')
const overflow = await f2().evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => null)
ok('390 px: no sideways scroll', overflow === false, String(overflow))
await close()
const failed = out.filter((o) => !o.pass)
console.log(failed.length ? failed.length + ' FAILED' : 'ALL PASSED')
process.exit(failed.length ? 1 : 0)
