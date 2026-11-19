// The places map of Roleplay (Molfar.Vertep#454), checked end to end in a real browser, with assertions and an exit code.
// Run from the work folder after start.sh and install-roleplay.sh (see SKILL.md): `cd $W && bun placemap-check.mjs`.
// Everything happens in ONE session: a second openRp wipes the app's data.
// Needs the engine of the same branch (icons) and Roleplay with the map. Optional: MAP_PICTURE=<a .jpg/.png/.svg file> for the picture step.
import fs from "node:fs"
import path from "node:path"
import { openRp, startChat, shot, close, skipTours } from "./roleplay.mjs"
import { DATA, WORK } from "./pw.mjs"

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
const api = (method, url, body) => fr().evaluate(async ({ method, url, body }) => {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => null) }
}, { method, url, body })

// ---- seed: six places, one of them a room inside the inn, a long Ukrainian name
const places = [
  { kind: "place", name: "Hearthstone Inn", text: "A warm inn at the crossroads.", visits: 4 },
  { kind: "place", name: "Cellar", text: "The inn's cellar.", size: "spot", inside: "Hearthstone Inn", visits: 1 },
  { kind: "place", name: "Old Forge", text: "Smoke and anvils." },
  { kind: "place", name: "Market Square", text: "Stalls." },
  { kind: "place", name: "Dark Forest", text: "Trees." },
  { kind: "place", name: "Таверна «Іржавий кухоль під старим мостом, де збираються візники»", text: "Шумно." },
]
for (const p of places) await api("PUT", "/v1/apps/roleplay/world/records", { chatId, op: "add", record: p })

const reload = async (wait = 7000) => { await page.reload(); await page.waitForTimeout(wait); await skipTours(page, fr()) }
const openMap = async () => {
  const f = fr()
  if ((await f.locator('[data-testid="place-map"]').count()) === 0) await f.locator('[data-testid="place-map-chip"]').click({ timeout: 70000 })
  await f.locator("[data-node]").first().waitFor({ timeout: 70000 })
}
const node = (name) => fr().locator(`[data-node][aria-label="${name}"]`)
const drag = async (loc, dx, dy) => {
  const b = await loc.boundingBox()
  const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 24)
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 6 }); await page.mouse.move(x + dx, y + dy, { steps: 6 }); await page.mouse.up()
  await page.waitForTimeout(1200)
}

// ---- open, no crash
await reload()
await openMap()
await page.waitForTimeout(3000)
check("the page does not crash (error boundary, page errors)", errors.length === 0 && (await fr().getByText("could not be shown").count()) === 0, errors.join(" | "))
check("the chip opens the window with one node per place", (await fr().locator("[data-node]").count()) === places.length)
await shot(page, "pm-open")

// ---- icons
const imgs = async () => fr().evaluate(() => [...document.querySelectorAll("[data-node]")].map((n) => { const i = n.querySelector("img"); return i ? { blob: i.src.startsWith("blob:"), w: i.naturalWidth } : null }))
let list = await imgs()
for (let i = 0; i < 10 && list.some((x) => !x || x.w === 0); i++) { await page.waitForTimeout(1000); list = await imgs() }
check("every place shows a painted icon (blob, 256 px)", list.every((x) => x && x.blob && x.w === 256), JSON.stringify(list))
const iconUrls = await fr().evaluate(() => fetch("/v1/place-icons").then((r) => r.json()).then((j) => Object.keys(j.icons).length))
check("the engine lists the icon set (52 kinds)", iconUrls === 52, String(iconUrls))

// ---- drag moves a place, saved in the chat
const before = JSON.stringify(meta().placeMap?.nodes ?? {})
const forge = node("Old Forge")
await drag(forge, 90, 40)
const afterDrag = JSON.stringify(meta().placeMap?.nodes ?? {})
check("dragging a place moves it and the position is saved in the chat", afterDrag !== before)

// ---- lock: a drag moves the map, a tap still picks the place
await fr().getByRole("button", { name: "Show all places" }).click()
await page.waitForTimeout(500)
await fr().locator('[data-testid="place-map-lock"]').click()
check("the lock button is pressed", (await fr().locator('[data-testid="place-map-lock"]').getAttribute("aria-pressed")) === "true")
const lockedBefore = JSON.stringify(meta().placeMap?.nodes ?? {})
const still = node("Market Square")
const screenBefore = await still.boundingBox()
await drag(still, -70, -30)
const screenAfter = await still.boundingBox()
check("locked: a drag from a place leaves its saved position", JSON.stringify(meta().placeMap?.nodes ?? {}) === lockedBefore)
check("locked: the same drag moved the whole map instead", Math.abs(screenAfter.x - screenBefore.x) > 30)
await node("Market Square").click()
await page.waitForTimeout(400)
check("locked: a tap still opens the place's card", (await fr().locator('[data-testid="place-map-card"]').count()) === 1)

// ---- the full name and renaming
await fr().locator('[data-testid="place-map-card"] button[aria-label="Close"], [data-testid="place-map-card"] button[title="Close"]').first().click().catch(() => {})
const longName = places[5].name
await fr().getByRole("button", { name: "Show all places" }).click()
await page.waitForTimeout(600)
await fr().locator(`[data-node][aria-label^="Таверна"]`).click({ force: true })
await page.waitForTimeout(400)
const shown = (await fr().locator('[data-testid="place-map-card-name"]').innerText()).trim()
check("the card shows the full name", shown === longName, shown)
check("the card name carries the full name as a tooltip", (await fr().locator('[data-testid="place-map-card-name"]').getAttribute("title")) === longName)
await fr().locator('[data-testid="place-map-rename"]').click()
await fr().locator('[data-testid="place-map-rename-input"]').fill("The Rusty Mug")
await fr().locator('[data-testid="place-map-rename-save"]').click()
await page.waitForTimeout(1500)
const tavernId = (await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)).json.records.find((r) => r.name === longName)?.id
check("renaming keeps a label in the chat's map", !!tavernId && meta().placeMap?.labels?.[tavernId] === "The Rusty Mug", JSON.stringify(meta().placeMap?.labels))
const peek = await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)
check("the World record keeps its own name (the Dashboard and travel go by it)", (peek.json?.records ?? []).some((r) => r.id === tavernId && r.name === longName))
check("the card shows the new name and says what the book calls the place", (await fr().locator('[data-testid="place-map-card-name"]').innerText().catch(() => "")).trim() === "The Rusty Mug" && (await fr().locator('[data-testid="place-map-card"]').innerText()).includes("In the book:"))
check("the node on the board carries the new name", (await node("The Rusty Mug").count()) === 1)
await fr().locator('[data-testid="place-map-rename"]').click()
await fr().locator('[data-testid="place-map-rename-input"]').fill("")
await fr().locator('[data-testid="place-map-rename-save"]').click()
await page.waitForTimeout(1200)
check("an empty name puts the book's name back", !meta().placeMap?.labels?.[tavernId] && (await fr().locator('[data-testid="place-map-card-name"]').innerText().catch(() => "")).trim() === longName)
await fr().locator('[data-testid="place-map-rename"]').click()
await fr().locator('[data-testid="place-map-rename-input"]').fill("The Rusty Mug")
await fr().locator('[data-testid="place-map-rename-save"]').click()
await page.waitForTimeout(1000)
await shot(page, "pm-rename")

// ---- a picture of the owner's: on, kept after a reload
const pic = process.env.MAP_PICTURE || path.join(WORK, "pm-picture.svg")
if (!process.env.MAP_PICTURE) fs.writeFileSync(pic, '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#8fae6b"/><path d="M0 700 C400 600 800 800 1600 650 L1600 1000 L0 1000Z" fill="#6e9bb5"/></svg>')
await fr().locator('[data-testid="place-map-menu"]').click()
await fr().locator('[data-testid="place-map-file"]').setInputFiles(pic)
await page.waitForTimeout(4000)
await page.keyboard.press("Escape")
const picProbe = () => fr().evaluate(() => { const i = document.querySelector('[data-testid="place-map-frame"] img'); return i ? { blob: i.src.startsWith("blob:"), w: i.naturalWidth } : null })
check("the map picture shows", !!(await picProbe())?.w)
check("the picture is stored in the chat", !!meta().placeMap?.picture?.id)
await reload(8000)
await openMap()
let p2 = null
for (let i = 0; i < 12 && !p2?.w; i++) { await page.waitForTimeout(1000); p2 = await picProbe() }
check("the picture is still there after a reload", !!p2?.w, JSON.stringify(p2))
check("the lock is still on after a reload", (await fr().locator('[data-testid="place-map-lock"]').getAttribute("aria-pressed")) === "true")
await fr().locator('[data-testid="place-map-lock"]').click()
await shot(page, "pm-picture")

// ---- roads: the Dashboard's scene place moves from one place of the book to another
const lines = fs.readFileSync(path.join(chatsDir, chatId + ".jsonl"), "utf8").split("\n").filter(Boolean)
const lastMsg = JSON.parse(lines[lines.length - 1])
const key = `${lastMsg.id}#${Number.isFinite(lastMsg.swipe) ? lastMsg.swipe : 0}`
const dashFile = path.join(DATA, "apps", "roleplay", "data", "dashboard", "state", chatId + ".json")
const setScene = (place) => { fs.mkdirSync(path.dirname(dashFile), { recursive: true }); fs.writeFileSync(dashFile, JSON.stringify({ snapshots: { [key]: { clock: { place }, present: [] } } })) }
setScene("Hearthstone Inn")
await reload(9000)
await openMap()
await page.waitForTimeout(3000)
const at1 = meta().placeMap?.at
check("the scene's place is found among the places (current place set)", !!at1, "no `at` in the chat's placeMap")
check("no road before the story has moved", (meta().placeMap?.routes ?? []).length === 0)
setScene("Old Forge")
await reload(9000)
await openMap()
await page.waitForTimeout(3000)
const routes = meta().placeMap?.routes ?? []
check("the story moved from one place to another: one road", routes.length === 1, JSON.stringify(routes))
check("the road is drawn on the board", (await fr().locator('[data-testid="place-map"] svg line').count()) >= 1)
setScene("somewhere the book has no record of")
await reload(9000)
await openMap()
await page.waitForTimeout(3000)
check("a scene place that is not in the book says so, and adds no road", (await fr().locator('[data-testid="place-map-scene"]').count()) === 1 && (meta().placeMap?.routes ?? []).length === 1)
await shot(page, "pm-roads")

// ---- a road drawn by hand
const fitAll = async () => { await fr().getByRole("button", { name: "Show all places" }).click(); await page.waitForTimeout(500) }
const roadsNow = () => (meta().placeMap?.routes ?? []).length
await fitAll()
await node("Market Square").click({ force: true })
await page.waitForTimeout(300)
check("a spot has no road button", await (async () => { await node("Cellar").click({ force: true }); await page.waitForTimeout(300); const n = await fr().locator('[data-testid="place-map-connect"]').count(); await node("Market Square").click({ force: true }); await page.waitForTimeout(300); return n === 0 })())
const roads0 = roadsNow()
await fr().locator('[data-testid="place-map-connect"]').click()
check("draw-a-road mode shows what to tap", (await fr().locator('[data-testid="place-map-connecting"]').count()) === 1)
await shot(page, "pm-connecting")
await node("Dark Forest").click({ force: true })
await page.waitForTimeout(800)
check("tapping another place draws the road", roadsNow() === roads0 + 1 && (await fr().locator('[data-testid="place-map-connecting"]').count()) === 0, `${roads0} -> ${roadsNow()}`)
const cardText = await fr().locator('[data-testid="place-map-card"]').innerText().catch(() => "(no card)")
check("the card counts the roads", cardText.includes("1 road"), JSON.stringify(cardText))
await fr().locator('[data-testid="place-map-connect"]').click()
await node("Cellar").click({ force: true })
await page.waitForTimeout(500)
check("tapping a room or empty space only cancels", roadsNow() === roads0 + 1 && (await fr().locator('[data-testid="place-map-connecting"]').count()) === 0)
await fr().locator('[data-testid="place-map-connect"]').click()
await node("Dark Forest").click({ force: true })
await page.waitForTimeout(800)
check("tapping a place that has the road takes it away", roadsNow() === roads0)
await fr().locator('[data-testid="place-map-connect"]').click()
await fr().locator('[data-testid="place-map-connect-cancel"]').click()
check("Cancel leaves the mode", (await fr().locator('[data-testid="place-map-connecting"]').count()) === 0 && roadsNow() === roads0)
await node("Market Square").click({ force: true })
await shot(page, "pm-connect")

// ---- travel by a tap
const userMoves = () => fs.readFileSync(path.join(chatsDir, chatId + ".jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((m) => m && m.role === "user" && Array.isArray(m.directions) && m.directions.some((d) => d.startsWith("Travel:") || d.startsWith("Move:")))
const waitMoves = async (n) => { for (let i = 0; i < 15 && userMoves().length < n; i++) await page.waitForTimeout(1000); return userMoves() }
const dlg = () => fr().locator('[data-testid="place-travel-dialog"]')
const tid = (id) => dlg().locator(`[data-testid="${id}"]`)
await fitAll()
await node("Market Square").click({ force: true })
await page.waitForTimeout(300)
await fr().locator('[data-testid="place-map-travel"]').click()
await dlg().waitFor({ timeout: 8000 })
check("travel: with an unknown start the dialog says there is no road and no time", (await dlg().innerText()).includes("no road and no time"))
check("travel: with an unknown start there is no minutes field", (await tid("place-travel-minutes").count()) === 0)
check("travel: the move is prefilled and editable", (await tid("place-travel-words").inputValue()) === "I head to Market Square.")
await shot(page, "pm-travel-unknown")
const roadsBefore = roadsNow()
await tid("place-travel-go").click()
let moves = await waitMoves(1)
check("travel: the move and its hidden direction are in the chat", moves.length === 1 && moves[0].directions[0].includes("heads to Market Square") && !moves[0].directions[0].includes("minutes"), JSON.stringify(moves.map((m) => m.directions)))
check("travel: an unknown start draws no road", roadsNow() === roadsBefore)

setScene("Hearthstone Inn")
await reload(9000)
await openMap()
await page.waitForTimeout(2500)
await fitAll()
await node("Old Forge").click({ force: true })
await page.waitForTimeout(300)
await fr().locator('[data-testid="place-map-travel"]').click()
await dlg().waitFor({ timeout: 8000 })
check("travel: from the inn the dialog names the start and offers minutes", (await dlg().innerText()).includes("From Hearthstone Inn") && (await tid("place-travel-minutes").count()) === 1)
const defMinutes = Number(await tid("place-travel-minutes").inputValue())
check("travel: the minutes come from the distance (5 or more, in fives)", defMinutes >= 5 && defMinutes % 5 === 0, String(defMinutes))
await tid("place-travel-minutes").fill("40")
await tid("place-travel-via").fill("Tanners Lane")
await shot(page, "pm-travel-road")
await tid("place-travel-go").click()
moves = await waitMoves(2)
const last = moves[moves.length - 1]?.directions?.[0] ?? ""
check("travel: the direction carries the minutes and the road name", last.includes("on foot, about 40 minutes") && last.includes("Tanners Lane") && last.includes("from Hearthstone Inn to Old Forge"), last)
const road = (meta().placeMap?.routes ?? []).find((r) => r.minutes === 40)
check("travel: the road keeps the minutes and its name", !!road && road.via === "Tanners Lane", JSON.stringify(meta().placeMap?.routes))
await page.waitForTimeout(1500)
await node("Old Forge").click({ force: true }).catch(() => {})
await page.waitForTimeout(300)
await fr().locator('[data-testid="place-map-travel"]').click()
await dlg().waitFor({ timeout: 8000 })
check("travel: the next trip starts from the kept name and time", (await tid("place-travel-via").inputValue()) === "Tanners Lane" && (await tid("place-travel-minutes").inputValue()) === "40")
await dlg().getByRole("button", { name: "Riding" }).click()
check("travel: riding shortens the time (0.4 of the walk)", (await tid("place-travel-minutes").inputValue()) === "15")
await dlg().getByRole("button", { name: "Skip the road" }).click()
check("travel: skipping the road hides minutes and the road name", (await tid("place-travel-minutes").count()) === 0)
await dlg().getByRole("button", { name: "Cancel" }).click()
await page.waitForTimeout(500)
check("travel: Cancel sends nothing", userMoves().length === 2)

// ---- phone: the map steps aside while typing
await page.setViewportSize({ width: 390, height: 780 })
await reload(9000)
await openMap().catch(() => {})
const open1 = await fr().locator('[data-testid="place-map"]').isVisible().catch(() => false)
check("phone: the map opens", open1)
await fr().getByLabel("Message input").click()
await fr().getByLabel("Message input").fill("hi")
await page.waitForTimeout(600)
check("phone: the map steps aside while typing", !(await fr().locator('[data-testid="place-map"]').isVisible().catch(() => false)))
await shot(page, "pm-phone")
// phone: the lock, the card and travel
await fr().getByLabel("Message input").fill("")
await page.waitForTimeout(900)
await fitAll()
// the mock model fails the Dashboard sensor after a move: its toast would sit over the map on a phone
await fr().evaluate(() => document.querySelectorAll("[data-sonner-toast], [data-sonner-toaster] li").forEach((e) => e.remove()))
await node("Market Square").click({ force: true })
await page.waitForTimeout(400)
await shot(page, "pm-phone-selected")
await fr().locator('[data-testid="place-map-travel"]').click({ timeout: 8000 })
await dlg().waitFor({ timeout: 8000 })
const bb = await dlg().boundingBox()
check("phone: the travel dialog fits the screen", bb.x >= 0 && bb.x + bb.width <= 390 + 1, JSON.stringify(bb))
await shot(page, "pm-phone-travel")
const movesBefore = userMoves().length
await tid("place-travel-go").click()
await page.waitForTimeout(1500)
check("phone: Go sends the move and the map folds so the reply can be seen", (await waitMoves(movesBefore + 1)).length === movesBefore + 1 && (await fr().locator('[data-testid="place-map"]').count()) === 0 && (await fr().locator('[data-testid="place-map-chip"]').count()) === 1)
await shot(page, "pm-phone-after-go")
check("no page errors in the whole run", errors.length === 0, errors.join(" | "))

await close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
