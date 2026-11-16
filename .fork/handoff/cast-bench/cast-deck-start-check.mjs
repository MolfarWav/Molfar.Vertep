import fs from "node:fs"
import { DATA, turns } from "./pw.mjs"
import { openRp, skipTours, shot, close } from "./roleplay.mjs"
const out = []
const ok = (name, pass, extra = "") => { out.push({ name, pass, extra }); console.log((pass ? "PASS " : "FAIL ") + name + (extra ? " : " + String(extra).slice(0, 260) : "")) }
const RP = `${DATA}/apps/roleplay/data`
const chatId = fs.readdirSync(`${RP}/chats`).filter((f) => f.endsWith(".meta.json"))[0].replace(".meta.json", "")
const stateFile = () => JSON.parse(fs.readFileSync(`${RP}/world/state/${chatId}.json`, "utf8"))
const { page, app } = await openRp({ lang: "en" })
const fr = () => page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? app
const dismiss = async () => { for (const b of await fr().getByRole("button", { name: /Close toast|Dismiss/ }).all()) await b.click({ force: true }).catch(() => {}) }
await turns([
  { match: "You are the scene sensor", text: "{}" },
  { match: "Invent the setting", text: JSON.stringify({ add: [{ kind: "group", name: "Merchants", text: "Traders of the valley who buy salt and sell grain." }] }) },
  { match: "Invent the other people", text: JSON.stringify({ add: [] }) },
  { match: "Invent what can go wrong", text: JSON.stringify({ add: [] }) },
  { match: "Invent the powers", text: JSON.stringify({ fronts: [] }) },
  { match: "Factions to write people for", text: JSON.stringify({ cast: [
    { faction: "Merchants", name: "Bohdan", aliases: [], tie: "Maksym", want: "the toll lowered for grain", text: "A grain merchant with a cart and a loud laugh. He is Maksym's old friend and thinks the toll is a robbery. He would arrive with a cart stuck at the tower gate." },
    { faction: "Toll guild", name: "Lesia", aliases: [], tie: "Halyna", want: "the guild's books balanced", text: "A junior clerk who keeps the second set of books. She is afraid of Halyna and would bring a ledger nobody asked for." },
  ] }) },
])
await fr().getByRole("button", { name: /^World$/ }).first().click()
await page.waitForTimeout(3000)
await fr().getByText("Start", { exact: true }).first().click({ force: true })
await page.waitForTimeout(2000)
// no dismiss
await shot(page, "start-dbg")
console.log((await fr().locator('[data-testid]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')).filter((x) => /start/.test(x)))).join(","))
const sw = fr().locator('[data-testid="start-cast"]').first()
await sw.waitFor({ timeout: 20000 }).catch(() => {})
ok("the Start form has the switch New people for later, on", (await sw.count()) === 1 && (await sw.getAttribute("aria-checked")) === "true")
const opts = fr().locator('[data-testid="start-cast-opts"]').first()
ok("its numbers are shown: factions, people each, card length", (await opts.count()) === 1 && /Factions/.test(await opts.innerText()) && /People each/.test(await opts.innerText()) && /Card length/.test(await opts.innerText()), (await opts.innerText().catch(() => "")).replace(/\s+/g, " "))
await sw.scrollIntoViewIfNeeded()
await shot(page, "start-2-form-light")
// choose 2 factions, 1 person each, short
await opts.getByRole("radio", { name: "2", exact: true }).first().click({ force: true })
await opts.getByRole("radiogroup", { name: "People each" }).getByRole("radio", { name: "1" }).click({ force: true })
await opts.getByRole("radio", { name: "Short" }).click({ force: true })
// bench off (the mock cannot read the lorebooks)
const bench = fr().locator('[data-testid="start-bench"]').first()
if ((await bench.count()) && (await bench.getAttribute("aria-checked")) === "true") await bench.click({ force: true })
await shot(page, "start-3-numbers-light")
await fr().locator('[data-testid="start-build"]').first().click({ force: true })
await fr().locator('[data-testid="world-draft"]').first().waitFor({ timeout: 30000 }).catch(() => {})
for (let i = 0; i < 60; i++) { if ((await fr().locator('[data-testid="draft-accept"]').count()) > 0) break; await page.waitForTimeout(2000) }
await page.waitForTimeout(1500)
const draft = stateFile().draft
ok("the draft holds the numbers and two cards", draft?.castOpts?.factions === 2 && draft?.castOpts?.per === 1 && draft?.castOpts?.len === "short" && draft.cast?.length === 2, JSON.stringify(draft?.castOpts) + " " + JSON.stringify((draft?.cast ?? []).map((c) => [c.name, c.tie])))
await fr().locator('[data-testid="draft-show"]').first().click({ force: true }).catch(() => {})
await page.waitForTimeout(800)
await fr().getByRole("button", { name: "Show me" }).last().click({ force: true }).catch(() => {})
await page.waitForTimeout(1200)
const sec = fr().locator('[data-testid="draft-cast"]').first()
ok("the draft lists the cast deck cards", (await sec.count()) === 1 && (await sec.locator('[data-testid="draft-item"]').count()) === 2, (await sec.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200))
await sec.scrollIntoViewIfNeeded().catch(() => {})
await shot(page, "start-4-draft-light")
// remove Lesia
await sec.locator('[data-testid="draft-item"]').filter({ hasText: "Lesia" }).first().locator('[data-testid="draft-toggle"]').click({ force: true })
await page.waitForTimeout(500)
await shot(page, "start-5-removed-light")
await fr().locator('[data-testid="draft-accept"]').first().click({ force: true })
for (let i = 0; i < 20; i++) { if (!stateFile().draft) break; await page.waitForTimeout(1000) }
const s = stateFile()
ok("accept kept Bohdan and left Lesia out", s.cast.some((c) => c.name === "Bohdan") && !s.cast.some((c) => c.name === "Lesia"), JSON.stringify(s.cast.map((c) => [c.id, c.name])))
ok("the Start's numbers became the chat's", s.settings.castPer === 1 && s.settings.castLen === "short" && s.settings.castDeck === true, JSON.stringify([s.settings.castPer, s.settings.castLen, s.settings.castDeck]))
ok("the deck still holds the earlier cards, with new ids", s.cast.length >= 3 && new Set(s.cast.map((c) => c.id)).size === s.cast.length)
// the profile option
await fr().getByRole("tab", { name: /Overview/ }).first().click({ force: true }).catch(() => {})
await fr().getByRole("button", { name: /^Edit profile$/ }).first().click({ force: true }).catch(() => {})
await page.waitForTimeout(2000)
const po = fr().locator('[data-testid="profile-cast-deck"]').first()
await po.scrollIntoViewIfNeeded().catch(() => {})
ok("the profile editor has the option New people from the deck", (await po.count()) === 1, (await po.innerText().catch(() => "")).replace(/\s+/g, " "))
await shot(page, "start-6-profile-light")
await close()
const failed = out.filter((o) => !o.pass)
console.log(failed.length ? `${failed.length} FAILED` : "ALL PASSED")
