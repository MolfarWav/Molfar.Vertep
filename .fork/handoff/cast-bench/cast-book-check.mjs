// Browser check of step 3 (#424): type tiles, the world book dialog, the tidy-up card, the Archive, old notes. Throwaway engine, mock model.
import fs from "node:fs"
import { DATA } from "./pw.mjs"
import { openRp, startChat, skipTours, shot, close, setAppTheme } from "./roleplay.mjs"

const out = []
const ok = (name, pass, extra = "") => { out.push({ name, pass, extra }); console.log((pass ? "PASS " : "FAIL ") + name + (extra ? " : " + String(extra).slice(0, 240) : "")) }
const RP = `${DATA}/apps/roleplay/data`
const stateFile = (id) => JSON.parse(fs.readFileSync(`${RP}/world/state/${id}.json`, "utf8"))

const { page, app } = await openRp({ lang: "en" })
await startChat(page, app)
const chatId = fs.readdirSync(`${RP}/chats`).filter((f) => f.endsWith(".meta.json"))[0].replace(".meta.json", "")
console.log("chat", chatId)

const msgs = Array.from({ length: 100 }, (_, i) => ({ id: "s" + i, role: i % 2 === 0 ? "user" : "char", name: i % 2 === 0 ? "You" : "Dzvinka", charId: i % 2 === 0 ? undefined : "dzvinka", text: "The road goes on, nothing new.", at: 1794000000000 + i * 1000, swipes: ["The road goes on, nothing new."], swipe: 0 }))
fs.writeFileSync(`${RP}/chats/${chatId}.jsonl`, msgs.map((m) => JSON.stringify(m)).join("\n") + "\n")
const rec = (id, kind, name, text, extra = {}) => ({ id, kind, name, aliases: [name.toLowerCase()], text, status: "active", uid: 0, at: 1000 + Number(id.slice(1)), ...extra })
const longNote = "Every ferryman on the lower river pays the old toll in salt, never in coin, and has done so since the first flood. " + "The custom is older than the guild and nobody writes it down. ".repeat(4)
const entities = [
  rec("n1", "person", "Olya", "Best friend from school. She writes often.", { relation: "ally", weight: 1 }),
  rec("n2", "place", "Red Tower", "A tower up the pass with a lantern above the pines."),
  rec("n3", "group", "Toll guild", "Keeps the toll road and the ferry.", { relation: "rival" }),
  rec("n4", "thing", "Cup of noodles", "A cheap supper left on the barrel lid.", { place: "Red Tower" }),
  rec("n5", "thing", "Brass key", "Opens the cellar under the tower.", { place: "Red Tower", why: "clue" }),
  rec("n6", "thing", "Sealed letter", "A letter nobody has opened.", { pinned: true, why: "hidden" }),
  rec("n7", "thing", "Sword", "A plain sword at her hip.", { holder: "Dzvinka", why: "weapon" }),
  rec("n8", "thing", "Old map", "A torn map of the lower road.", { why: "gift" }),
  rec("n9", "fact", "Salt toll", "Ferrymen pay the toll in salt.", {}),
  rec("n10", "fact", "Ferry custom", longNote, {}),
]
fs.mkdirSync(`${RP}/world/state`, { recursive: true })
fs.writeFileSync(`${RP}/world/state/${chatId}.json`, JSON.stringify({ v: 1, chatId, bookId: "world-" + chatId, settings: { level: "chronicler", everyN: 5, stagnation: 6, onTransition: true, onPlace: true, insert: true, textMax: 900, changesMax: 12, carrySource: "sensor", profile: "", dice: "", diceStat: "", diceChance: 0, diceTilt: "", diceLife: -1, dicePace: -1, diceShow: false, cast: "off", castShow: false, tidy: true }, lastKey: null, nextId: 11, carry: {}, entities, nextFront: 1, fronts: [], event: null, log: [] }))

await page.reload()
await page.waitForTimeout(3000)
await page.keyboard.press("Escape").catch(() => {})
await skipTours(page)
const fr = () => page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? app
const dismissToasts = async () => {
  for (const b of await page.getByRole("button", { name: /Close toast|Dismiss/ }).all()) await b.click({ force: true }).catch(() => {})
  for (const b of await fr().getByRole("button", { name: /Close toast|Dismiss/ }).all()) await b.click({ force: true }).catch(() => {})
}
const openSheet = async () => {
  await fr().getByRole("button", { name: /World DM/ }).first().click({ force: true })
  await page.waitForTimeout(2000)
  await dismissToasts()
}
// the book dialog sits on top of the sheet: one Escape closes the dialog, a second the sheet
const closeSheet = async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(600); await page.keyboard.press("Escape"); await page.waitForTimeout(800) }

await openSheet()
// ---- tiles
const tile = (id) => fr().locator(`[data-testid="tile-${id}"]`).first()
await tile("person").waitFor({ timeout: 20000 }).catch(() => {})
const tileText = async (id) => ((await tile(id).count()) ? (await tile(id).innerText()).replace(/\s+/g, " ") : "")
ok("tile People shows 1", /People\s*1/.test(await tileText("person")), await tileText("person"))
ok("tile Things shows 5", /Things\s*5/.test(await tileText("thing")), await tileText("thing"))
ok("tile Old notes shows 2 (and no Archive tile yet)", /Old notes\s*2/.test(await tileText("fact")) && (await tile("archive").count()) === 0, await tileText("fact"))
ok("a type tile is a button with an aria-label", /open the list/.test((await tile("thing").getAttribute("aria-label")) ?? ""), await tile("thing").getAttribute("aria-label"))
await tile("thing").scrollIntoViewIfNeeded()
await shot(page, "book-1-tiles-dark")

// ---- the book at Things
await tile("thing").click({ force: true })
await page.waitForTimeout(1500)
const dlg = fr().locator('[data-testid="world-book-dialog"]').first()
ok("the world book dialog opens", (await dlg.count()) > 0)
const box = await dlg.boundingBox().catch(() => null)
ok("the dialog is at least 580 px wide on a desktop", !!box && box.width >= 580 && box.width <= 640, box ? String(Math.round(box.width)) : "no box")
ok("the Things chip is the pressed one", (await fr().locator('[data-testid="chip-thing"]').first().getAttribute("aria-pressed")) === "true")
const cards = await fr().locator('[data-testid="world-record"]').count()
ok("five things are listed (active only)", cards === 5, String(cards))
ok("a thing shows its reason tag", (await fr().locator('[data-testid="record-why"]').count()) >= 3)
await shot(page, "book-2-things-dark")
// search over the text
await fr().getByPlaceholder(/Search names, keys and text/).fill("torn map")
await page.waitForTimeout(500)
ok("search finds a record by its text", (await fr().locator('[data-testid="world-record"]').count()) === 1)
await fr().getByPlaceholder(/Search names, keys and text/).fill("")
// the form has the reason picker for a thing
await fr().getByRole("button", { name: /^Edit$/ }).first().click({ force: true })
await page.waitForTimeout(600)
ok("the form of a thing has the reason picker", (await fr().locator('[data-testid="record-why-pick"]').count()) === 1)
await shot(page, "book-3-form-dark")
await fr().getByRole("button", { name: /^Cancel$/ }).first().click({ force: true }).catch(() => {})
await closeSheet()

// ---- tidy
await openSheet()
const card = fr().locator('[data-testid="section-tidy"]').first()
ok("the card Tidying the book is in the sheet", (await card.count()) > 0)
await card.scrollIntoViewIfNeeded()
const before = (await card.innerText()).replace(/\s+/g, " ")
ok("it says 5 things in the book, none in the Archive", /5 things in the book, 0 in the Archive/.test(before), before.slice(0, 260))
await fr().locator('[data-testid="tidy-now"]').first().click({ force: true })
await page.waitForTimeout(2500)
await dismissToasts()
const st = stateFile(chatId)
const status = Object.fromEntries(st.entities.map((e) => [e.name, e.status]))
ok("Tidy now archived the noodles and the old map", status["Cup of noodles"] === "dormant" && status["Old map"] === "dormant", JSON.stringify(status))
ok("kept: the clue, the pinned letter, the sword in a character's hands", status["Brass key"] === "active" && status["Sealed letter"] === "active" && status["Sword"] === "active", JSON.stringify(status))
ok("people, places, factions untouched", status["Olya"] === "active" && status["Red Tower"] === "active" && status["Toll guild"] === "active")
ok("two lines in tidyLog", Array.isArray(st.tidyLog) && st.tidyLog.length === 2, JSON.stringify(st.tidyLog))
await card.scrollIntoViewIfNeeded()
await card.getByText(/Tidy-up log/).first().click().catch(() => {})
await page.waitForTimeout(800)
const after = (await card.innerText()).replace(/\s+/g, " ")
ok("the card says 3 things in the book, 2 in the Archive", /3 things in the book, 2 in the Archive/.test(after), after.slice(0, 300))
ok("the log names each archived thing with its count", /Cup of noodles: to the Archive \(named in 0 of the last 10 replies\)/.test(after), after.slice(-300))
await shot(page, "book-4-tidy-dark")
ok("the book file marks a resting thing disabled", JSON.parse(fs.readFileSync(`${RP}/lorebooks/world-${chatId}.json`, "utf8")).entries.find((e) => e.title === "Cup of noodles")?.enabled === false)

// ---- the Archive
await dismissToasts()
await tile("archive").scrollIntoViewIfNeeded()
ok("the Archive tile now shows 2", /Archive\s*2/.test(await tileText("archive")), await tileText("archive"))
await tile("archive").click({ force: true })
await page.waitForTimeout(1500)
ok("the Archive chip is pressed and lists two cards, tagged tidied up", (await fr().locator('[data-testid="chip-archive"]').first().getAttribute("aria-pressed")) === "true" && (await fr().locator('[data-testid="record-dormant"]').count()) === 2)
await shot(page, "book-5-archive-dark")
await fr().getByRole("button", { name: /^Wake$/ }).first().click({ force: true })
await page.waitForTimeout(1500)
const woken = stateFile(chatId).entities.filter((e) => e.status === "dormant").length
ok("Wake brings one back", woken === 1, String(woken))
ok("a restore signal was kept", stateFile(chatId).signals?.some((g) => g.op === "restore"), JSON.stringify(stateFile(chatId).signals))
await closeSheet()

// ---- old notes
await openSheet()
await tile("fact").scrollIntoViewIfNeeded()
await tile("fact").click({ force: true })
await page.waitForTimeout(1500)
ok("old notes: the longest first (the long one cannot go to the Litopys as it is)", (await fr().locator('[data-testid="world-record"]').first().innerText()).includes("Ferry custom"))
ok("the long note's Litopys button is disabled", await fr().locator('[data-testid="note-lit"]').first().isDisabled())
await shot(page, "book-6-notes-dark")
// fold the short note into Red Tower
const shortCard = fr().locator('[data-testid="world-record"]').filter({ hasText: "Salt toll" }).first()
await shortCard.locator("select").selectOption({ label: "Red Tower · place" })
await shortCard.locator('[data-testid="note-fold"]').click({ force: true })
await page.waitForTimeout(800)
await fr().getByRole("button", { name: /^Fold in$/ }).last().click({ force: true })
await page.waitForTimeout(2000)
const s2 = stateFile(chatId)
ok("the note was folded into the text of Red Tower and removed", /Ferrymen pay the toll in salt/.test(s2.entities.find((e) => e.name === "Red Tower")?.text ?? "") && !s2.entities.some((e) => e.name === "Salt toll"), s2.entities.find((e) => e.name === "Red Tower")?.text)
ok("a delete signal was kept for the note", s2.signals?.some((g) => g.op === "delete" && g.name === "Salt toll"))
await closeSheet()

// ---- light theme and a phone
await frameHome(page, fr)
async function frameHome(pg, f) {
  await f().getByRole("button", { name: /^Home$/ }).first().click({ force: true }).catch(() => {})
  await pg.waitForTimeout(800)
  await setAppTheme(pg, f(), "Daylight").catch((e) => console.log("setAppTheme", e.message))
  await f().getByRole("button", { name: "Continue" }).first().click({ force: true }).catch(() => {})
  await pg.waitForTimeout(2500)
}
await openSheet()
await tile("thing").scrollIntoViewIfNeeded()
await shot(page, "book-7-tiles-light")
await tile("thing").click({ force: true })
await page.waitForTimeout(1500)
await shot(page, "book-8-book-light")
await closeSheet()

const ph = await openRp({ width: 390, theme: "light", lang: "en" })
await ph.page.waitForTimeout(2500)
await ph.page.keyboard.press("Escape").catch(() => {})
await skipTours(ph.page)
const f2 = () => ph.page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? ph.app
await f2().getByRole("button", { name: "Continue" }).first().click({ force: true }).catch(() => {})
await ph.page.waitForTimeout(2500)
await f2().getByRole("button", { name: /World DM/ }).first().click({ force: true })
await ph.page.waitForTimeout(2000)
const t2 = f2().locator('[data-testid="tile-thing"]').first()
await t2.scrollIntoViewIfNeeded()
await shot(ph.page, "book-9-phone-tiles")
await t2.click({ force: true })
await ph.page.waitForTimeout(1500)
const d2 = f2().locator('[data-testid="world-book-dialog"]').first()
const b2 = await d2.boundingBox().catch(() => null)
ok("phone: the book fills the screen", !!b2 && b2.width >= 380, b2 ? String(Math.round(b2.width)) + "x" + Math.round(b2.height) : "no box")
await shot(ph.page, "book-10-phone-book")
const overflow = await f2().evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => null)
ok("390 px: no sideways scroll", overflow === false, String(overflow))
await close()
const failed = out.filter((o) => !o.pass)
console.log(failed.length ? `${failed.length} FAILED` : "ALL PASSED")
process.exit(failed.length ? 1 : 0)
