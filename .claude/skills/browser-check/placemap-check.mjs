// The places map of Roleplay (Molfar.Vertep#454), checked end to end in a real browser, with assertions and an exit code.
// Run from the work folder after start.sh and install-roleplay.sh (see SKILL.md): `cd $W && bun placemap-check.mjs`.
// Everything happens in ONE session: a second openRp wipes the app's data.
// Needs the engine of the same branch (icons) and Roleplay with the map. Optional: MAP_PICTURE=<a .jpg/.png/.svg file> for the picture step.
import fs from "node:fs"
import path from "node:path"
import { openRp, startChat, shot, close, skipTours } from "./roleplay.mjs"
import { DATA, WORK, turns } from "./pw.mjs"

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
  // after a reload the window (open as it was left) or the chip (folded) shows up when the app has loaded the World state: wait for either
  const f = fr()
  for (let i = 0; i < 140; i++) {
    if ((await f.locator('[data-testid="place-map"]').count()) > 0) break
    if ((await f.locator('[data-testid="place-map-chip"]').count()) > 0) { await f.locator('[data-testid="place-map-chip"]').click({ timeout: 10000 }).catch(() => {}); break }
    await page.waitForTimeout(500)
  }
  await f.locator("[data-node]").first().waitFor({ timeout: 70000 })
}
const node = (name) => fr().locator(`[data-node][aria-label="${name}"]`)
// the card keeps rename, icon and road in a "More" menu
const clickMore = async (id) => { await fr().locator('[data-testid="place-map-more"]').click(); await fr().locator(`[data-testid="${id}"]`).click() }
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
check("the engine lists the icon set (90 kinds)", iconUrls === 90, String(iconUrls))

// ---- ready maps: a default by what the places are, the gallery, no picture, automatic again
const frameImg = () => fr().evaluate(() => { const i = document.querySelector('[data-testid="place-map-frame"] img'); return i ? { blob: i.src.startsWith("blob:"), w: i.naturalWidth } : null })
const waitFrameImg = async (want) => { let r = null; for (let i = 0; i < 15; i++) { r = await frameImg(); if (want ? r?.w : !r) break; await page.waitForTimeout(1000) } return r }
const gear = () => fr().locator('[data-testid="place-map-menu"]').click()
const packCount = await fr().evaluate(() => fetch("/v1/map-packs").then((r) => r.json()).then((j) => j.packs.map((p) => p.maps.length).join("+")))
check("the engine lists the map packs (32 + 40 maps)", packCount === "32+40", String(packCount))
const dflt = await waitFrameImg(true)
check("a new map shows a ready map by default, with no picture chosen", !!dflt?.w && !meta().placeMap?.picture, JSON.stringify(dflt))
await gear()
await fr().locator('[data-testid="place-map-gallery"]').click()
const galDlg = fr().locator('[data-testid="place-map-gallery-dialog"]')
await galDlg.waitFor({ timeout: 8000 })
check("gallery: eighteen kinds of map (both packs), four maps in a kind", (await galDlg.locator("[data-map-kind]").count()) === 18 && (await galDlg.locator("[data-map]").count()) === 4)
await galDlg.locator('[data-map-kind="coast"]').click()
check("gallery: another kind shows its own four", (await galDlg.locator('[data-map^="default/coast-"]').count()) === 4)
await galDlg.locator('[data-map-kind="modern-airport"]').click()
check("gallery: the modern pack's kinds are there too", (await galDlg.locator('[data-map^="modern/modern-airport-"]').count()) === 4)
await shot(page, "pm-gallery")
await galDlg.locator('[data-map-kind="coast"]').click()
await galDlg.locator('[data-map="default/coast-2"]').click()
await page.waitForTimeout(1200)
check("gallery: the pick is kept in the chat as a ready map", JSON.stringify(meta().placeMap?.picture) === '{"builtin":"default/coast-2"}', JSON.stringify(meta().placeMap?.picture))
check("gallery: the picked map is shown", !!(await waitFrameImg(true))?.w)
await gear()
await fr().locator('[data-testid="place-map-no-picture"]').click()
await page.waitForTimeout(900)
check("no picture: the chat keeps `none` and the board is the dotted grid", JSON.stringify(meta().placeMap?.picture) === '{"none":true}' && !(await frameImg()))
// the menu stays open after an action: its entry changes to "automatic again"
check("no picture: the menu offers the automatic map again", (await fr().locator('[data-testid="place-map-auto-picture"]').count()) === 1)
await fr().locator('[data-testid="place-map-auto-picture"]').click()
await page.keyboard.press("Escape")
await page.waitForTimeout(900)
check("automatic again: the choice is gone and the default map is back", !meta().placeMap?.picture && !!(await waitFrameImg(true))?.w)

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
await clickMore("place-map-rename")
await fr().locator('[data-testid="place-map-rename-input"]').fill("The Rusty Mug")
await fr().locator('[data-testid="place-map-rename-save"]').click()
await page.waitForTimeout(1500)
const tavernId = (await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)).json.records.find((r) => r.name === longName)?.id
check("renaming keeps a label in the chat's map", !!tavernId && meta().placeMap?.labels?.[tavernId] === "The Rusty Mug", JSON.stringify(meta().placeMap?.labels))
const peek = await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)
check("the World record keeps its own name (the Dashboard and travel go by it)", (peek.json?.records ?? []).some((r) => r.id === tavernId && r.name === longName))
check("the card shows the new name and says what the book calls the place", (await fr().locator('[data-testid="place-map-card-name"]').innerText().catch(() => "")).trim() === "The Rusty Mug" && (await fr().locator('[data-testid="place-map-card"]').innerText()).includes("In the book:"))
check("the node on the board carries the new name", (await node("The Rusty Mug").count()) === 1)
await clickMore("place-map-rename")
await fr().locator('[data-testid="place-map-rename-input"]').fill("")
await fr().locator('[data-testid="place-map-rename-save"]').click()
await page.waitForTimeout(1200)
check("an empty name puts the book's name back", !meta().placeMap?.labels?.[tavernId] && (await fr().locator('[data-testid="place-map-card-name"]').innerText().catch(() => "")).trim() === longName)
await clickMore("place-map-rename")
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
check("a spot has no road button", await (async () => { await node("Cellar").click({ force: true }); await page.waitForTimeout(300); await fr().locator('[data-testid="place-map-more"]').click(); const n = await fr().locator('[data-testid="place-map-connect"]').count(); await page.keyboard.press('Escape'); await page.waitForTimeout(200); await fr().locator('[data-testid="place-map-card"] button[aria-label="Close"]').click(); await page.waitForTimeout(300); await node("Market Square").click({ force: true }); await page.waitForTimeout(300); return n === 0 })())
const roads0 = roadsNow()
await clickMore("place-map-connect")
check("draw-a-road mode shows what to tap", (await fr().locator('[data-testid="place-map-connecting"]').count()) === 1)
await shot(page, "pm-connecting")
await node("Dark Forest").click({ force: true })
await page.waitForTimeout(800)
check("tapping another place draws the road", roadsNow() === roads0 + 1 && (await fr().locator('[data-testid="place-map-connecting"]').count()) === 0, `${roads0} -> ${roadsNow()}`)
const cardText = await fr().locator('[data-testid="place-map-card"]').innerText().catch(() => "(no card)")
check("the card counts the roads", cardText.includes("1 road"), JSON.stringify(cardText))
await clickMore("place-map-connect")
await node("Cellar").click({ force: true })
await page.waitForTimeout(500)
check("tapping a room or empty space only cancels", roadsNow() === roads0 + 1 && (await fr().locator('[data-testid="place-map-connecting"]').count()) === 0)
await clickMore("place-map-connect")
await node("Dark Forest").click({ force: true })
await page.waitForTimeout(800)
check("tapping a place that has the road takes it away", roadsNow() === roads0)
await clickMore("place-map-connect")
await fr().locator('[data-testid="place-map-connect-cancel"]').click()
check("Cancel leaves the mode", (await fr().locator('[data-testid="place-map-connecting"]').count()) === 0 && roadsNow() === roads0)
await node("Market Square").click({ force: true })
await shot(page, "pm-connect")

// ---- the icon picker: any icon of the set for a place, and back to the automatic one
await fr().locator('[data-testid="place-map-card"] button[aria-label="Close"]').click({ timeout: 3000 }).catch(() => {})
await fitAll()
await node("Old Forge").click({ force: true })
await page.waitForTimeout(300)
const forgeId = (await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)).json.records.find((r) => r.name === "Old Forge").id
await clickMore("place-map-icon")
const pickDlg = fr().locator('[data-testid="place-icon-dialog"]')
await pickDlg.waitFor({ timeout: 8000 })
check("icon picker: the automatic icon is offered and is the one in use", (await pickDlg.locator('[data-testid="place-icon-auto"]').getAttribute("aria-pressed")) === "true")
await pickDlg.locator('[data-testid="place-icon-search"]').fill("castle")
check("icon picker: the search narrows the kinds", (await pickDlg.locator("[data-kind]").count()) === 1)
await pickDlg.locator('[data-kind="castle"]').click()
check("icon picker: a kind shows its four pictures", (await pickDlg.locator("[data-icon]").count()) === 4)
await shot(page, "pm-icon-picker")
await pickDlg.locator('[data-icon="castle-2"]').click()
await page.waitForTimeout(900)
check("icon picker: the pick is kept in the chat", meta().placeMap?.icons?.[forgeId] === "castle-2", JSON.stringify(meta().placeMap?.icons))
await clickMore("place-map-icon")
await pickDlg.waitFor({ timeout: 8000 })
check("icon picker: reopened on the picked icon's kind, the pick marked", (await pickDlg.locator('[data-icon="castle-2"]').getAttribute("aria-pressed")) === "true" && (await pickDlg.locator('[data-testid="place-icon-auto"]').getAttribute("aria-pressed")) === "false")
await pickDlg.locator('[data-testid="place-icon-auto"]').click()
await page.waitForTimeout(900)
check("icon picker: Automatic takes the pick off", !meta().placeMap?.icons?.[forgeId])

// ---- travel by a tap
const userMoves = () => fs.readFileSync(path.join(chatsDir, chatId + ".jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((m) => m && m.role === "user" && Array.isArray(m.directions) && m.directions.some((d) => d.startsWith("Travel:") || d.startsWith("Move:")))
const waitMoves = async (n) => { for (let i = 0; i < 15 && userMoves().length < n; i++) await page.waitForTimeout(1000); return userMoves() }
const dlg = () => fr().locator('[data-testid="place-travel-dialog"]')
const tid = (id) => dlg().locator(`[data-testid="${id}"]`)
// the card of the picked place sits over the bottom of a small board: close it before picking the next place
const closeCard = () => fr().locator('[data-testid="place-map-card"] button[aria-label="Close"]').click({ timeout: 3000 }).catch(() => {})
await closeCard()
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
check("travel: Ask the model is off while the World DM is off", await tid("place-travel-ask").isDisabled())
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

// ---- the model's help (the World DM's build model, here the mock): the time, the road's name read from the reply, a road event
await api("PUT", "/v1/apps/roleplay/world/settings", { chatId, level: "chronicler" })
await turns([{ text: '{"name":"Tanners Lane","minutes":35}' }])
await reload(9000)
await openMap()
await page.waitForTimeout(2500)
await fitAll()
await node("Market Square").click({ force: true })
await page.waitForTimeout(300)
await fr().locator('[data-testid="place-map-travel"]').click()
await dlg().waitFor({ timeout: 8000 })
check("travel: Ask the model is on when the World DM is on", await tid("place-travel-ask").isEnabled())
await tid("place-travel-ask").click()
let asked = ""
for (let i = 0; i < 20 && asked !== "35"; i++) { await page.waitForTimeout(1000); asked = await tid("place-travel-minutes").inputValue() }
check("travel: the model's time fills the minutes", asked === "35", asked)
check("travel: the road event is off until it is turned on", (await tid("place-travel-event-log").innerText()).includes("Off"))
await dlg().getByRole("button", { name: "Road event" }).click()
await tid("place-travel-chance").fill("100")
const evLog = await tid("place-travel-event-log").innerText()
check("travel: the road event shows its dice, the chance and the kind", evLog.includes("needs 100 or less") && !evLog.includes("no event"), evLog)
await shot(page, "pm-travel-event")
await tid("place-travel-go").click()
moves = await waitMoves(3)
const evDir = moves[moves.length - 1]?.directions?.[0] ?? ""
check("travel: the direction carries the road event and the model's minutes", evDir.includes("Something small happens on the road") && evDir.includes("about 35 minutes"), evDir)
const offer = fr().locator('[data-testid="place-map-road-offer"]')
await offer.waitFor({ timeout: 30000 }).catch(() => {})
check("travel: the reply's road name is offered", (await offer.count()) === 1 && (await offer.innerText()).includes("Tanners Lane"), await offer.innerText().catch(() => "(no offer)"))
await shot(page, "pm-road-offer")
await fr().locator('[data-testid="place-map-road-keep"]').click().catch(() => {})
await page.waitForTimeout(900)
const kept = (meta().placeMap?.routes ?? []).find((r) => r.via === "Tanners Lane" && r.minutes === 35)
check("travel: Keep puts the name (and the model's minutes) on the road", !!kept, JSON.stringify(meta().placeMap?.routes))
check("travel: the offer goes after Keep", (await offer.count()) === 0)

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
