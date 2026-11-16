// Browser check of step 4 (#424): the cast deck. Throwaway engine, mock model, the real Roleplay app.
import fs from "node:fs"
import { DATA, turns } from "./pw.mjs"
import { openRp, startChat, skipTours, shot, close, setAppTheme } from "./roleplay.mjs"

const out = []
const ok = (name, pass, extra = "") => { out.push({ name, pass, extra }); console.log((pass ? "PASS " : "FAIL ") + name + (extra ? " : " + String(extra).slice(0, 260) : "")) }
const RP = `${DATA}/apps/roleplay/data`
const stateFile = (id) => JSON.parse(fs.readFileSync(`${RP}/world/state/${id}.json`, "utf8"))
const diceFile = (id) => JSON.parse(fs.readFileSync(`${RP}/world/dice/${id}.json`, "utf8")).rolls

const { page, app } = await openRp({ lang: "en" })
await startChat(page, app)
const chatId = fs.readdirSync(`${RP}/chats`).filter((f) => f.endsWith(".meta.json"))[0].replace(".meta.json", "")
console.log("chat", chatId)

const msgs = Array.from({ length: 100 }, (_, i) => ({ id: "s" + i, role: i % 2 === 0 ? "user" : "char", name: i % 2 === 0 ? "You" : "Dzvinka", charId: i % 2 === 0 ? undefined : "dzvinka", text: "The road goes on, nothing new.", at: 1794000000000 + i * 1000, swipes: ["The road goes on, nothing new."], swipe: 0 }))
fs.writeFileSync(`${RP}/chats/${chatId}.jsonl`, msgs.map((m) => JSON.stringify(m)).join("\n") + "\n")
const rec = (id, kind, name, text, extra = {}) => ({ id, kind, name, aliases: [name.toLowerCase()], text, status: "active", uid: 0, at: 1000 + Number(id.slice(1)), ...extra })
const entities = [
  rec("n1", "group", "Toll guild", "Keeps the toll road and the ferry.", { relation: "rival" }),
  rec("n2", "person", "Maksym", "The toll keeper at the Red Tower.", { noReturn: true }),
  rec("n3", "place", "Red Tower", "A tower up the pass with a lantern above the pines."),
]
const card = (id, name, faction, tie, want, text) => ({ id, name, aliases: [], faction, tie, want, text })
const cast = [
  card("c1", "Halyna", "Toll guild", "Maksym", "Wants the pass closed before winter.", "A tall woman with a ledger and ink on her cuffs. She counts every coin twice and trusts nobody who does not. She is Maksym's cousin and keeps the guild's books. She wants the pass closed before winter because the guild cannot afford another flood. She would arrive with a letter from the guild that nobody asked for."),
  card("c2", "Zoya", "Crows", "", "Wants a debt paid.", "A thin woman with a limp who sells maps nobody should buy. She leads the Crows' eyes along the road and owes a favour to everyone and a debt to one. She would come in with a rumour and a price."),
  card("c3", "Pavlo", "Toll guild", "Dzvinka", "Wants a place at the tower.", "A young clerk of the guild who keeps looking at the tower. He admires Dzvinka and would find an excuse to bring her a message."),
]
fs.mkdirSync(`${RP}/world/state`, { recursive: true })
fs.writeFileSync(`${RP}/world/state/${chatId}.json`, JSON.stringify({ v: 1, chatId, bookId: "world-" + chatId, settings: { level: "living", everyN: 50, stagnation: 6, onTransition: true, onPlace: true, insert: true, textMax: 900, changesMax: 12, carrySource: "sensor", profile: "", dice: "", diceStat: "", diceChance: 0, diceTilt: "", diceLife: -1, dicePace: -1, diceShow: false, cast: "normal", castShow: true, tidy: true, castDeck: true, castPer: 2, castLen: "normal" }, lastKey: null, nextId: 4, carry: {}, entities, nextFront: 2, fronts: [{ id: "f1", name: "Crows", goal: "Take the road.", clock: 4, size: 6, status: "active" }], event: null, log: [], cast }))

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
const closeSheet = async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(600); await page.keyboard.press("Escape"); await page.waitForTimeout(800) }
const tile = (id) => fr().locator(`[data-testid="tile-${id}"]`).first()
const sect = () => fr().locator('[data-testid="section-deck"]').first()
const tidy = (s) => s.replace(/\s+/g, " ")
const until = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (fn()) return true } catch {} if (Date.now() - t0 > ms) return false; await page.waitForTimeout(500) } }

await turns([
  { match: "You are the scene sensor", text: "{}" },
  { match: "You are the world keeper", text: "{}" },
  { match: "Factions to write people for", text: JSON.stringify({ cast: [
    { faction: "Crows", name: "Yarema", aliases: ["Yar"], tie: "Zoya", want: "A map to the tower.", text: "A fence who buys what the Crows steal. He is Zoya's old partner and wants the map of the tower cellar. He would turn up at a market stall with a sack of salt." },
    { faction: "Toll guild", name: "Olha", tie: "Nobody here", want: "Coin for the ferry.", text: "A ferrywoman who pays the toll in salt and hates the guild for it. She would bring news from the river." },
  ] }) },
  { match: "We keep walking.", text: "A thin woman with a limp, Zoya, slipped in at the door and offered Dzvinka a map for a price." },
  { text: "Quiet." },
])

// ---------- the card and the tile
await openSheet()
await tile("cast").waitFor({ timeout: 20000 }).catch(() => {})
const tt = tidy(await tile("cast").innerText().catch(() => ""))
ok("the tile Cast deck shows 3", /Cast deck\s*3/.test(tt), tt)
ok("the tile is a button that says what it opens", /Cast deck, 3, open the list/.test((await tile("cast").getAttribute("aria-label")) ?? ""))
await sect().waitFor({ timeout: 20000 }).catch(() => {})
ok("the card Cast deck is in the sheet", (await sect().count()) > 0)
await fr().locator('[data-testid="deck-counts"]').first().waitFor({ timeout: 40000 }).catch(() => {})
await sect().scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
const card1 = tidy(await sect().innerText())
ok("it says 3 cards left, by faction", /3 cards left: Toll guild 2, Crows 1/.test(card1), card1.slice(0, 300))
ok("it says one card has nobody it ties to", /1 card has nobody they tie to yet/.test(card1), card1.slice(0, 400))
ok("it says when the next new person can start", /Waiting for a longer silence|can start in|can bring a new person/.test(card1), card1.slice(0, 500))
ok("the switch is on", (await fr().locator('[data-testid="deck-switch"]').first().getAttribute("aria-checked")) === "true")
await shot(page, "deck-1-card-dark")
// the switch
await fr().locator('[data-testid="deck-switch"]').first().click({ force: true })
await until(() => stateFile(chatId).settings.castDeck === false)
ok("the switch off is saved", stateFile(chatId).settings.castDeck === false)
ok("the card says it is off", /Off: no new person comes from the deck/.test(tidy(await sect().innerText())))
await fr().locator('[data-testid="deck-switch"]').first().click({ force: true })
await until(() => stateFile(chatId).settings.castDeck === true)
ok("the switch on again is saved", stateFile(chatId).settings.castDeck === true)
await closeSheet()

// ---------- a draw: two sends
const input = fr().getByLabel("Message input")
await input.waitFor({ timeout: 30000 })
await input.fill("We keep walking.")
await input.press("Enter")
await fr().getByText("slipped in at the door").first().waitFor({ timeout: 120000 }).catch(() => {})
await until(() => diceFile(chatId).some((r) => r.kind === "cast"), 40000)
await page.waitForTimeout(1500)
const rolls1 = diceFile(chatId).filter((r) => r.kind === "cast")
const line = rolls1.at(-1)
ok("the note went in: a deck line in the dice log", !!line && line.src === "deck" && line.inserted === true, JSON.stringify(line))
ok("the log says who, faction, tie (none: loose) and why this card (the front)", line?.who === "Zoya" && line?.faction === "Crows" && line?.loose === true && line?.pick === "front", JSON.stringify(line))
ok("the card is not a record yet", !stateFile(chatId).entities.some((e) => e.name === "Zoya") && stateFile(chatId).cast.length === 3)
await input.fill("We keep going.")
await input.press("Enter")
await fr().getByText("Quiet.").first().waitFor({ timeout: 120000 }).catch(() => {})
await page.waitForTimeout(3500)
const s1 = stateFile(chatId)
const zoya = s1.entities.find((e) => e.name === "Zoya")
ok("she is a person record now, with the card's text", !!zoya && zoya.kind === "person" && /map/.test(zoya.text), JSON.stringify(zoya))
ok("the card left the deck", !s1.cast.some((c) => c.name === "Zoya"))
// with the mock sensor's empty scene the Dashboard may already have a snapshot of the carrier: then a name is only a mention, and the card still becomes a person
ok("the result is in the log line (came, or only mentioned when the sensor wrote an empty scene first)", ["came", "mentioned"].includes(diceFile(chatId).filter((r) => r.kind === "cast").at(-1)?.result), JSON.stringify(diceFile(chatId).filter((r) => r.kind === "cast").at(-1)))
ok("the registry knows her", !!s1.regIds && !!s1.regIds[zoya?.id ?? "x"], JSON.stringify(s1.regIds))
const book = JSON.parse(fs.readFileSync(`${RP}/lorebooks/world-${chatId}.json`, "utf8"))
ok("the world book has her entry", book.entries.some((e) => e.memo === `world:${zoya?.id}`))
ok("lastEntrance says deck", s1.lastEntrance?.src === "deck" && ["came", "mentioned"].includes(s1.lastEntrance?.res), JSON.stringify(s1.lastEntrance))
ok("the mark under the reply tells who came", (await fr().locator('[data-testid="dice-note"]').allInnerTexts().catch(() => [])).some((t) => /Zoya/.test(t)))
await shot(page, "deck-2-mark-dark")

// ---------- the card after the draw
await openSheet()
await tile("cast").waitFor({ timeout: 15000 }).catch(() => {})
// the deck fell to 2 cards, under the floor of 3: the app asks for a refill by itself after the DM run (the mock answers)
await until(() => stateFile(chatId).castLog?.some((l) => !l.forced && l.added === 2), 40000)
ok("the automatic refill after the draw added two cards (no click)", !!stateFile(chatId).castLog?.some((l) => !l.forced && l.added === 2), JSON.stringify(stateFile(chatId).castLog))
await page.waitForTimeout(2500)
ok("the tile shows 4 now", /Cast deck\s*4/.test(tidy(await tile("cast").innerText().catch(() => ""))))
await sect().scrollIntoViewIfNeeded()
await fr().locator('[data-testid="deck-log"]').getByText(/Cast deck log/).first().click().catch(() => {})
await page.waitForTimeout(900)
const card2 = tidy(await sect().innerText())
ok("the deck log has the draw: who, tie, why the card", /Zoya comes in, new \(\w+\)/.test(card2) && /no tie yet/.test(card2) && /picked: their faction.s front is stirred/.test(card2) && /came|only mentioned/.test(card2), card2.slice(-500))
await shot(page, "deck-3-log-dark")
const bench = tidy(await fr().locator('[data-testid="section-cast"]').first().innerText().catch(() => ""))
await fr().locator('[data-testid="section-cast"]').first().getByText(/Cast log/).first().click().catch(() => {})
await page.waitForTimeout(600)
const benchLog = tidy(await fr().locator('[data-testid="cast-log"]').first().innerText().catch(() => ""))
ok("People coming back does not list the deck's draw", !/Zoya/.test(benchLog), benchLog.slice(0, 200))

// ---------- the refill button
await sect().scrollIntoViewIfNeeded()
await fr().locator('[data-testid="deck-refill"]').first().click({ force: true })
await page.waitForTimeout(6000)
await dismissToasts()
const s2 = stateFile(chatId)
ok("the deck holds the two old cards and the two the refill wrote (Olha: nobody here, so no tie)", s2.cast.length === 4 && s2.cast.some((c) => c.name === "Yarema" && c.tie === "Zoya") && s2.cast.some((c) => c.name === "Olha" && c.tie === ""), JSON.stringify(s2.cast.map((c) => [c.name, c.tie])))
ok("the old cards are untouched", s2.cast.some((c) => c.name === "Halyna" && /ink on her cuffs/.test(c.text)))
ok("a log line says it was asked by the player (the mock repeats the same people: nothing new)", s2.castLog?.at(-1)?.forced === true && s2.castLog.at(-1).added === 0, JSON.stringify(s2.castLog))
await sect().scrollIntoViewIfNeeded()
await page.waitForTimeout(1500)
const card3 = tidy(await sect().innerText())
ok("the card now says 4 cards left", /4 cards left/.test(card3), card3.slice(0, 200))
ok("the log shows the refill, asked by you", /Refill: 2 cards for Toll guild, Crows|Refill: 2 cards for Crows, Toll guild/.test(card3) && /asked by you/.test(card3), card3.slice(-400))
await shot(page, "deck-4-refilled-dark")

// ---------- the book: chip, gate, cards, edit, remove
await tile("cast").scrollIntoViewIfNeeded()
await tile("cast").click({ force: true })
await page.waitForTimeout(1800)
ok("the book opens at the Cast deck chip", (await fr().locator('[data-testid="chip-cast"]').first().getAttribute("aria-pressed")) === "true")
ok("the cards are hidden behind a gate that gives only the count", (await fr().locator('[data-testid="deck-gate"]').count()) === 1 && (await fr().locator('[data-testid="deck-card"]').count()) === 0 && /4 cards of people who have not appeared yet/.test(tidy(await fr().locator('[data-testid="deck-gate"]').first().innerText())))
ok("there is no records search or Add on this chip", (await fr().getByPlaceholder(/Search names, keys and text/).count()) === 0)
await shot(page, "deck-5-gate-dark")
await fr().locator('[data-testid="deck-show"]').first().click({ force: true })
await page.waitForTimeout(1500)
ok("Show lists the four cards", (await fr().locator('[data-testid="deck-card"]').count()) === 4)
ok("a card with a tie says who, a card with none says so", (await fr().locator('[data-testid="deck-card-tie"]').count()) >= 2 && (await fr().locator('[data-testid="deck-card-loose"]').count()) >= 1)
await shot(page, "deck-6-cards-dark")
// edit Halyna
const halyna = fr().locator('[data-testid="deck-card"]').filter({ hasText: "Halyna" }).first()
await halyna.getByRole("button", { name: /^Edit$/ }).click({ force: true })
await page.waitForTimeout(700)
const form = fr().locator('[data-testid="deck-form"]').first()
ok("the edit form opens with the card's own values", (await form.locator("input").first().inputValue()) === "Halyna")
await shot(page, "deck-7-form-dark")
await form.locator("input").nth(3).fill("Wants the pass closed and the toll doubled.")
await form.getByRole("button", { name: /^Save$/ }).click({ force: true })
await page.waitForTimeout(1500)
ok("the saved want is on disk", /toll doubled/.test(stateFile(chatId).cast.find((c) => c.name === "Halyna")?.want ?? ""))
// a name a record has
await halyna.getByRole("button", { name: /^Edit$/ }).click({ force: true }).catch(() => {})
await fr().locator('[data-testid="deck-card"]').filter({ hasText: "Halyna" }).first().getByRole("button", { name: /^Edit$/ }).click({ force: true }).catch(() => {})
await page.waitForTimeout(600)
const form2 = fr().locator('[data-testid="deck-form"]').first()
await form2.locator("input").first().fill("Maksym")
await form2.getByRole("button", { name: /^Save$/ }).click({ force: true })
await page.waitForTimeout(1200)
ok("a name a record has is refused and nothing changed", stateFile(chatId).cast.some((c) => c.name === "Halyna") && (await page.getByText(/already has that name/).count() + (await fr().getByText(/already has that name/).count())) > 0)
await form2.getByRole("button", { name: /^Cancel$/ }).click({ force: true }).catch(() => {})
await page.waitForTimeout(500)
// a tie nobody goes by
await fr().locator('[data-testid="deck-card"]').filter({ hasText: "Pavlo" }).first().getByRole("button", { name: /^Edit$/ }).click({ force: true })
await page.waitForTimeout(500)
const form3 = fr().locator('[data-testid="deck-form"]').first()
await form3.locator("input").nth(2).fill("A stranger")
await form3.getByRole("button", { name: /^Save$/ }).click({ force: true })
await page.waitForTimeout(1200)
ok("a tie nobody goes by is refused", stateFile(chatId).cast.find((c) => c.name === "Pavlo")?.tie === "Dzvinka" && (await page.getByText(/Nobody who exists goes by that name/).count() + (await fr().getByText(/Nobody who exists goes by that name/).count())) > 0)
await form3.getByRole("button", { name: /^Cancel$/ }).click({ force: true }).catch(() => {})
await dismissToasts()
// remove one
await fr().locator('[data-testid="deck-card"]').filter({ hasText: "Olha" }).first().getByRole("button", { name: /^Delete$/ }).click({ force: true })
await page.waitForTimeout(700)
ok("remove asks first", (await fr().getByText(/Remove the card of/).count()) > 0)
await shot(page, "deck-8-remove-dark")
await fr().getByRole("alertdialog").getByRole("button", { name: /^Delete$/ }).click({ force: true }).catch(async () => { await fr().getByRole("button", { name: /^Delete$/ }).last().click({ force: true }) })
await page.waitForTimeout(1500)
ok("the card is gone from disk and the list", !stateFile(chatId).cast.some((c) => c.name === "Olha") && (await fr().locator('[data-testid="deck-card"]').count()) === 3)
// other chips still work: People now lists Zoya with no deck tag
await fr().locator('[data-testid="chip-person"]').first().click({ force: true })
await page.waitForTimeout(800)
ok("the People chip lists Zoya like any person", (await fr().locator('[data-testid="world-record"]').filter({ hasText: "Zoya" }).count()) === 1)
await shot(page, "deck-9-people-dark")
await closeSheet()

// ---------- light theme
await fr().getByRole("button", { name: /^Home$/ }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(800)
await setAppTheme(page, fr(), "Daylight").catch((e) => console.log("setAppTheme", e.message))
await fr().getByRole("button", { name: "Continue" }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(2500)
await openSheet()
await sect().scrollIntoViewIfNeeded()
await shot(page, "deck-10-card-light")
await tile("cast").scrollIntoViewIfNeeded()
await shot(page, "deck-11-tile-light")
await tile("cast").click({ force: true })
await page.waitForTimeout(1500)
await shot(page, "deck-12-book-light")
await closeSheet()

// ---------- a phone
const ph = await openRp({ width: 390, theme: "light", lang: "en" })
await ph.page.waitForTimeout(2500)
await ph.page.keyboard.press("Escape").catch(() => {})
await skipTours(ph.page)
const f2 = () => ph.page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? ph.app
await f2().getByRole("button", { name: "Continue" }).first().click({ force: true }).catch(() => {})
await ph.page.waitForTimeout(2500)
await f2().getByRole("button", { name: /World DM/ }).first().click({ force: true })
await ph.page.waitForTimeout(2000)
const t2 = f2().locator('[data-testid="tile-cast"]').first()
await t2.scrollIntoViewIfNeeded()
await shot(ph.page, "deck-13-phone-tile")
const sec2 = f2().locator('[data-testid="section-deck"]').first()
await sec2.scrollIntoViewIfNeeded()
await shot(ph.page, "deck-14-phone-card")
ok("phone: 44 px refill button", ((await f2().locator('[data-testid="deck-refill"]').first().boundingBox())?.height ?? 0) >= 40)
await t2.click({ force: true })
await ph.page.waitForTimeout(1500)
const b2 = await f2().locator('[data-testid="world-book-dialog"]').first().boundingBox().catch(() => null)
ok("phone: the book fills the screen", !!b2 && b2.width >= 380, b2 ? String(Math.round(b2.width)) : "no box")
await shot(ph.page, "deck-15-phone-book")
const over = await f2().evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => null)
ok("390 px: no sideways scroll", over === false, String(over))
await close()
const failed = out.filter((o) => !o.pass)
console.log(failed.length ? `${failed.length} FAILED` : "ALL PASSED")
process.exit(failed.length ? 1 : 0)
