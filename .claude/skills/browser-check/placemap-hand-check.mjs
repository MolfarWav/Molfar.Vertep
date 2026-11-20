// Spreading the places, "the story is here" by hand, and the DM's own road event on Roleplay's places map (Molfar.Vertep#475 part 5),
// checked end to end in a real browser, with an exit code.
// Run from the work folder after start.sh and install-roleplay.sh (see SKILL.md): `cd $W && bun placemap-hand-check.mjs`. FRESH engine, one session.
import fs from "node:fs"
import path from "node:path"
import { openRp, startChat, shot, close, skipTours } from "./roleplay.mjs"
import { DATA, turns } from "./pw.mjs"

const results = []
const check = (name, ok, extra = "") => { results.push({ name, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra && !ok ? "  -> " + extra : ""}`) }
const errors = []

const { page, app: app0 } = await openRp()
page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 160)))
await startChat(page, app0)
const chatsDir = path.join(DATA, "apps", "roleplay", "data", "chats")
const chatId = fs.readdirSync(chatsDir).filter((f) => f.endsWith(".meta.json"))[0].replace(/\.meta\.json$/, "")
const fr = () => page.frames().find((x) => x.url().includes("/app/molfar/roleplay/"))
const meta = () => JSON.parse(fs.readFileSync(path.join(chatsDir, chatId + ".meta.json"), "utf8"))
const pm = () => meta().placeMap ?? {}
const api = (method, url, body) => fr().evaluate(async ({ method, url, body }) => {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => null) }
}, { method, url, body })

const places = [
  { kind: "place", name: "Old Bridge", text: "A stone bridge." },
  { kind: "place", name: "Rusty Anchor tavern", text: "Smoky." },
  { kind: "place", name: "Old Forge", text: "Anvils." },
  { kind: "place", name: "Market Square", text: "Stalls." },
]
for (const p of places) await api("PUT", "/v1/apps/roleplay/world/records", { chatId, op: "add", record: p })
await api("PUT", "/v1/apps/roleplay/world/records", { chatId, op: "add", record: { kind: "person", name: "Tamsin the Carter", text: "Hauls barrels for the tavern." } })

const reload = async (wait = 7000) => { await page.reload(); await page.waitForTimeout(wait); await skipTours(page, fr()) }
const openMap = async () => {
  const f = fr()
  for (let i = 0; i < 140; i++) {
    if ((await f.locator('[data-testid="place-map"]').count()) > 0) break
    if ((await f.locator('[data-testid="place-map-chip"]').count()) > 0) { await f.locator('[data-testid="place-map-chip"]').click({ timeout: 10000 }).catch(() => {}); break }
    await page.waitForTimeout(500)
  }
  await f.locator("[data-node]").first().waitFor({ timeout: 70000 })
}
const T = (id) => fr().locator(`[data-testid="${id}"]`)
const node = (name) => fr().locator(`[data-node][aria-label^="${name}"]`)
const settle = (ms = 1200) => page.waitForTimeout(ms)
const gear = () => T("place-map-menu").click()
const closeCard = () => T("place-map-card").locator('button[aria-label="Close"]').click({ timeout: 3000 }).catch(() => {})
const fitAll = async () => { await fr().getByRole("button", { name: "Show all places" }).click(); await settle(500) }
const span = () => { const xs = Object.values(pm().nodes ?? {}).map((p) => p.x); const ys = Object.values(pm().nodes ?? {}).map((p) => p.y); return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } }
const userMoves = () => fs.readFileSync(path.join(chatsDir, chatId + ".jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((m) => m && m.role === "user" && Array.isArray(m.directions) && m.directions.some((d) => d.startsWith("Travel:") || d.startsWith("Move:")))
const waitMoves = async (n) => { for (let i = 0; i < 15 && userMoves().length < n; i++) await page.waitForTimeout(1000); return userMoves() }
const dlg = () => T("place-travel-dialog")
const tid = (id) => dlg().locator(`[data-testid="${id}"]`)

await reload()
await openMap()
await settle(3000)
check("the page does not crash", errors.length === 0, errors.join(" | "))

// ---- spread the places over the picture
const before = JSON.stringify(pm().nodes)
const s0 = span()
check("new places start close together near the middle", s0.w < 700, JSON.stringify(s0))
await gear()
check("the gear menu offers 'Spread the places over the picture'", (await T("place-map-spread").count()) === 1)
await T("place-map-spread").click()
await settle()
const s1 = span()
check("spreading stretches the places over the board", s1.w > s0.w * 1.5 && s1.w <= 1600 - 2 * 120 + 2, JSON.stringify([s0, s1]))
check("spreading keeps every place inside the board", Object.values(pm().nodes).every((p) => p.x >= 70 && p.x <= 1530 && p.y >= 70 && p.y <= 930))
check("the toast says so and offers Undo", (await fr().getByText("The places are spread over the board.").count()) >= 1 && (await fr().getByRole("button", { name: "Undo" }).count()) >= 1)
await shot(page, "pmh-spread")
await fr().getByRole("button", { name: "Undo" }).first().click()
await settle()
check("Undo puts the places back where they were", JSON.stringify(pm().nodes) === before)
const spreadClick = async () => { if ((await T("place-map-spread").count()) === 0) await gear(); await T("place-map-spread").click(); await settle() }
await spreadClick()
await spreadClick()
check("spreading again says the places already fill the board", (await fr().getByText("The places already fill the board.").count()) >= 1)
await page.keyboard.press("Escape")
await settle(500)

// ---- "the story is here" by hand: no Dashboard place at all
await fitAll()
await closeCard()
await node("Old Forge").click({ force: true })
await settle(400)
check("a place offers 'The story is here' while no Dashboard place names one", await (async () => { await T("place-map-more").click(); return (await T("place-map-here").count()) === 1 })())
await T("place-map-here").click()
await settle()
const hand = pm().here
check("the mark is kept in the chat with the (empty) place line", hand && hand.scene === "" && !!hand.id, JSON.stringify(hand))
check("the card says it is marked by hand", (await T("place-map-card").innerText()).includes("marked by hand"))
check("the map marks that place as the one you are in", /here/i.test((await node("Old Forge").getAttribute("aria-label")) ?? ""), await node("Old Forge").getAttribute("aria-label"))
await shot(page, "pmh-here")
await T("place-map-card").locator('button[aria-label="Close"]').click().catch(() => {})
await settle(300)

// ---- travel from the hand-marked place: from is known, a road is kept, the mark follows the trip
await node("Market Square").click({ force: true })
await settle(400)
await T("place-map-travel").click()
await dlg().waitFor({ timeout: 8000 })
check("travel starts from the hand-marked place", (await dlg().innerText()).includes("From Old Forge"))
await tid("place-travel-go").click()
const moves = await waitMoves(1)
check("the trip is sent", moves.length === 1 && (moves[0].directions?.[0] ?? "").includes("from Old Forge to Market Square"), JSON.stringify(moves.map((m) => m.directions)))
await settle(1500)
const marketId = (await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)).json
const mid = (marketId.records ?? marketId).find((r) => r.name === "Market Square")?.id
check("after the trip the mark stands on the place that was reached", pm().here?.id === mid, JSON.stringify(pm().here))
check("a road was kept between the two places", (pm().routes ?? []).length === 1, JSON.stringify(pm().routes))
await reload(9000)
await openMap()
await settle(2500)
check("the mark and the road survive a reload", pm().here?.id === mid && (pm().routes ?? []).length === 1)
await fitAll()
await node("Market Square").click({ force: true })
await settle(400)
await T("place-map-more").click()
check("the marked place offers to take the mark off", (await T("place-map-here").innerText()).includes("Take the hand mark off"))
await T("place-map-here").click()
await settle()
check("taking it off clears the chat's mark", !pm().here)
await page.keyboard.press("Escape")

// ---- the Dashboard's place line that names no place of the book: the mark is against that line
const dashFile = path.join(DATA, "apps", "roleplay", "data", "dashboard", "state", chatId + ".json")
const lines = fs.readFileSync(path.join(chatsDir, chatId + ".jsonl"), "utf8").split("\n").filter(Boolean)
const lastMsg = JSON.parse(lines[lines.length - 1])
const key = `${lastMsg.id}#${Number.isFinite(lastMsg.swipe) ? lastMsg.swipe : 0}`
const setScene = (place) => { fs.mkdirSync(path.dirname(dashFile), { recursive: true }); fs.writeFileSync(dashFile, JSON.stringify({ snapshots: { [key]: { clock: { place }, present: [] } } })) }
setScene("Under the old willow, past the mill")
await reload(9000)
await openMap()
await settle(3000)
check("a place line the book does not know is said, with the way out", (await T("place-map-scene").innerText()).includes("The story is here"))
await fitAll()
await node("Old Bridge").click({ force: true })
await settle(400)
await T("place-map-more").click()
await T("place-map-here").click()
await settle()
check("the mark remembers the place line it was made against", pm().here?.scene === "Under the old willow, past the mill", JSON.stringify(pm().here))
check("with the mark the 'not one of the places' line is gone", (await T("place-map-scene").count()) === 0)
setScene("Somewhere else entirely")
await reload(9000)
await openMap()
await settle(3000)
check("when the place line changes the mark lapses and the line is back", (await T("place-map-scene").count()) === 1)

// ---- the DM's own road event
await api("PUT", "/v1/apps/roleplay/world/settings", { chatId, level: "chronicler" })
await turns([{ text: '{"event":"Tamsin the Carter, whose cart has lost a wheel, asks for a hand with her barrels."}' }])
setScene("Old Bridge")
await reload(9000)
await openMap()
await settle(3000)
await fitAll()
await closeCard()
await node("Old Forge").click({ force: true })
await settle(400)
await T("place-map-travel").click()
await dlg().waitFor({ timeout: 8000 })
await dlg().getByRole("button", { name: "Road event" }).click()
await tid("place-travel-chance").fill("100")
check("the DM's own event is off until the switch is on", (await dlg().getByRole("button", { name: "DM makes it up" }).count()) === 1 && (await tid("place-travel-event-make").count()) === 0)
await dlg().getByRole("button", { name: "DM makes it up" }).click()
check("with the switch on, a hit offers a button to make the event up", (await tid("place-travel-event-make").count()) === 1)
check("until it is made the window says the kind of event will be used", (await tid("place-travel-event-text").innerText()).includes("Not made yet"))
await tid("place-travel-event-make").click()
let text = ""
for (let i = 0; i < 20 && !text.includes("Tamsin"); i++) { await page.waitForTimeout(1000); text = await tid("place-travel-event-text").innerText() }
check("the made-up event is shown in the window", text.includes("Tamsin the Carter"), text)
await shot(page, "pmh-event")
await tid("place-travel-go").click()
const mv = await waitMoves(2)
const dir = mv[mv.length - 1]?.directions?.[0] ?? ""
check("the direction carries the made-up event", dir.includes("Tamsin the Carter") && dir.includes("tell it"), dir)
check("no page error in the whole run", errors.length === 0, errors.join(" | "))

await page.setViewportSize({ width: 390, height: 800 })
await page.reload()
await page.waitForTimeout(7000)
await skipTours(page, fr())
await openMap()
await settle(1500)
await gear()
check("phone: the gear menu shows the new entry without sideways scroll", (await T("place-map-spread").count()) === 1 && (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)))
await shot(page, "pmh-phone-gear")
await page.keyboard.press("Escape")

await close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
