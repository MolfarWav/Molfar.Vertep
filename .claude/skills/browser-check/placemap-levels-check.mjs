// Map levels and map drawing of Roleplay's places map (Molfar.Vertep#473, #475), checked end to end in a real browser, with an exit code.
// Run from the work folder after start.sh and install-roleplay.sh (see SKILL.md): `cd $W && bun placemap-levels-check.mjs`.
// One session on a fresh engine. The image model is faked in the page: POST /v1/images answers with a picture stored in the engine.
import fs from "node:fs"
import path from "node:path"
import { openRp, startChat, shot, close, skipTours, setAppTheme } from "./roleplay.mjs"
import { DATA } from "./pw.mjs"

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
  { kind: "place", name: "Oakford city", text: "A walled city.", visits: 3 },
  { kind: "place", name: "Rusty Anchor tavern", text: "Smoky.", visits: 2 },
  { kind: "place", name: "Old Forge", text: "Anvils." },
  { kind: "place", name: "Harrow village", text: "A small village." },
  { kind: "place", name: "Market Square", text: "Stalls." },
]
for (const p of places) await api("PUT", "/v1/apps/roleplay/world/records", { chatId, op: "add", record: p })
const recs = (await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)).json
const idOf = (name) => (recs.records ?? recs).find((r) => r.name === name)?.id

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
const node = (name) => fr().locator(`[data-node][aria-label="${name}"]`)
const T = (id) => fr().locator(`[data-testid="${id}"]`)
const gear = () => T("place-map-menu").click()
const settle = (ms = 1200) => page.waitForTimeout(ms)
const noSideScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

await reload()
await openMap()
await settle(3000)
check("the page does not crash", errors.length === 0 && (await fr().getByText("could not be shown").count()) === 0, errors.join(" | "))
check("one map: the title is plain text, no switcher", (await T("place-map-levels").count()) === 0)
check("one map: every place is on it", (await fr().locator("[data-node]").count()) === places.length)

// ---- the gear menu offers the maps; "Places on this map" only when there are several
await gear()
check("the gear menu has Maps of this chat and Draw a map", (await T("place-map-levels-open").count()) === 1 && (await T("place-map-generate").count()) === 1)
check("the gear menu has no 'Places on this map' while there is one map", (await T("place-map-places-open").count()) === 0)
await T("place-map-levels-open").click()
const dlg = T("map-levels-dialog")
await dlg.waitFor({ timeout: 8000 })
check("levels dialog lists the one map with its scale", (await dlg.locator("[data-level]").count()) === 1 && (await dlg.locator('[data-scale="town"][aria-pressed="true"]').count()) === 1)
await shot(page, "pml-levels-one")
await T("map-level-add").click()
await settle()
const m1 = pm()
check("a region map was added: first extra map is a region", m1.levels?.length === 1 && m1.levels[0].scale === "region", JSON.stringify(m1.levels))
check("a region map starts with the city and the village only", JSON.stringify(Object.keys(m1.levels?.[0]?.nodes ?? {}).sort()) === JSON.stringify([idOf("Oakford city"), idOf("Harrow village")].sort()), JSON.stringify(Object.keys(m1.levels?.[0]?.nodes ?? {})))
await dlg.locator('[data-level="l1"] [data-testid="map-level-name"]').fill("The Vale")
await page.keyboard.press("Enter")
await settle()
check("renaming a map is kept", pm().levels?.[0]?.name === "The Vale")
await dlg.locator('[data-level="l1"] [data-scale="world"]').click()
await settle()
check("changing the scale is kept", pm().levels?.[0]?.scale === "world")
await dlg.locator('[data-level="l1"] [data-scale="region"]').click()
await settle()
await shot(page, "pml-levels-two")
await page.keyboard.press("Escape")
await settle(600)

// ---- switching
check("with several maps the title is a switcher showing the map on view", (await T("place-map-levels").count()) === 1 && (await T("place-map-levels").innerText()).includes("The Vale"))
await T("place-map-levels").click()
await fr().locator('[data-level-pick="l1"]').click()
await settle()
check("switching to the region map shows only its places", (await fr().locator("[data-node]").count()) === 2)
check("the region map's view is kept in this browser", (await fr().evaluate((id) => localStorage.getItem(`rp.map.level.${id}`), chatId)) === "l1")
await shot(page, "pml-region")

// ---- places on a map
await gear()
await T("place-map-places-open").click()
const pdlg = T("map-places-dialog")
await pdlg.waitFor({ timeout: 8000 })
check("places dialog: all five whole places, two ticked", (await pdlg.locator('input[type="checkbox"]').count()) === 5 && (await pdlg.locator('input[type="checkbox"]:checked').count()) === 2)
await pdlg.locator(`input[data-place="${idOf("Market Square")}"]`).check()
await settle()
check("ticking a place puts it on this map at once", (await fr().locator("[data-node]").count()) === 3 && !!pm().levels?.[0]?.nodes?.[idOf("Market Square")])
check("the place is still on the first map", !!pm().nodes?.[idOf("Market Square")])
await pdlg.locator(`input[data-place="${idOf("Market Square")}"]`).uncheck()
await settle()
check("unticking takes it off this map only", !pm().levels?.[0]?.nodes?.[idOf("Market Square")] && !!pm().nodes?.[idOf("Market Square")])
await shot(page, "pml-places")
await page.keyboard.press("Escape")
await settle(600)

// ---- a map of a place: made from the card, opens, has a way back and an empty state
await T("place-map-levels").click()
await fr().locator('[data-level-pick="main"]').click()
await settle()
await node("Oakford city").click({ force: true })
await settle(400)
check("a place with no map offers 'Make a map of this place'", await (async () => { await T("place-map-more").click(); const n = await T("place-map-make-level").count(); return n === 1 })())
await T("place-map-make-level").click()
await settle()
const l2 = pm().levels?.find((l) => l.plan === idOf("Oakford city"))
check("the new map is the plan of that place and is on view", !!l2 && l2.scale === "town", JSON.stringify(pm().levels))
check("a new map of a place is empty and says so", (await T("place-map-empty").count()) === 1 && (await fr().locator("[data-node]").count()) === 0)
check("there is a way back to the map above", (await T("place-map-up").count()) === 1)
await shot(page, "pml-empty")
await T("place-map-empty-add").click()
const pd2 = T("map-places-dialog")
await pd2.waitFor({ timeout: 8000 })
await pd2.locator(`input[data-place="${idOf("Rusty Anchor tavern")}"]`).check()
await pd2.locator(`input[data-place="${idOf("Old Forge")}"]`).check()
await settle()
check("places chosen for the map of a place are on it", Object.keys(pm().levels?.find((l) => l.id === l2.id)?.nodes ?? {}).length === 2)
await page.keyboard.press("Escape")
await settle(600)
check("the empty state is gone", (await T("place-map-empty").count()) === 0 && (await fr().locator("[data-node]").count()) === 2)
await shot(page, "pml-city")
await T("place-map-up").click()
await settle()
check("the way back opens the map above", (await T("place-map-levels").innerText()).includes("Map") && (await fr().locator("[data-node]").count()) === 5)
await node("Oakford city").click({ force: true })
await settle(400)
check("a place that has a map has an Open button", (await T("place-map-enter").count()) === 1)
await T("place-map-enter").click()
await settle()
check("the Open button shows that map", (await fr().locator("[data-node]").count()) === 2)

// ---- travel on a region map: hours, taxi but no metro
const dashFile = path.join(DATA, "apps", "roleplay", "data", "dashboard", "state", chatId + ".json")
const lines = fs.readFileSync(path.join(chatsDir, chatId + ".jsonl"), "utf8").split("\n").filter(Boolean)
const lastMsg = JSON.parse(lines[lines.length - 1])
const key = `${lastMsg.id}#${Number.isFinite(lastMsg.swipe) ? lastMsg.swipe : 0}`
fs.mkdirSync(path.dirname(dashFile), { recursive: true })
fs.writeFileSync(dashFile, JSON.stringify({ snapshots: { [key]: { clock: { place: "Oakford city" }, present: [] } } }))
await reload(9000)
await openMap()
await settle(3000)
await T("place-map-levels").click()
await fr().locator('[data-level-pick="l1"]').click()
await settle()
await node("Harrow village").click({ force: true })
await settle(400)
await T("place-map-travel").click()
const tdlg = T("place-travel-dialog")
await tdlg.waitFor({ timeout: 8000 })
const modes = await tdlg.locator('[role="group"] button').allInnerTexts()
check("region travel offers foot, riding and a taxi, but no metro", modes.some((x) => /taxi/i.test(x)) && !modes.some((x) => /metro/i.test(x)), JSON.stringify(modes))
const mins = Number(await T("place-travel-minutes").inputValue())
check("a region trip is told in hours, not minutes", mins >= 180, String(mins))
await shot(page, "pml-travel")
await page.keyboard.press("Escape")
await settle(500)

// ---- drawing a map: the dialog, the prompt, a faked image model, the result kept as the picture
await page.route("**/v1/images", async (route) => {
  const id = await fr().evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 320; c.height = 180
    const g = c.getContext("2d"); g.fillStyle = "#6a8f4e"; g.fillRect(0, 0, 320, 180); g.fillStyle = "#3d6fa0"; g.fillRect(0, 120, 320, 60)
    const blob = await new Promise((r) => c.toBlob(r, "image/png"))
    const up = await fetch("/v1/assets?name=drawn.png", { method: "PUT", headers: { "content-type": "image/png" }, body: blob })
    return (await up.json()).id
  })
  window_calls.push(route.request().postData())
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: `/v1/assets/${id}`, mimeType: "image/png", model: "fake/draw" }) })
})
const window_calls = []
await gear()
await T("place-map-generate").click()
const gdlg = T("map-generate-dialog")
await gdlg.waitFor({ timeout: 8000 })
check("draw dialog: a kind chip row and a prompt filled from them", (await gdlg.locator("[data-gen-kind]").count()) === 18 && (await T("map-generate-prompt").inputValue()).includes("Subject:"))
check("draw dialog: the starting kind follows the map's scale (a region)", (await gdlg.locator('[data-gen-kind="region"][aria-pressed="true"]').count()) === 1)
check("draw dialog: the prompt names the places on this map", (await T("map-generate-prompt").inputValue()).includes("Harrow village"))
check("draw dialog: the image model and the cost are said", (await T("map-generate-model").innerText()).toLowerCase().includes("cost"))
await gdlg.locator('[data-gen-kind="continent"]').click()
check("draw dialog: another kind rewrites an untouched prompt", (await T("map-generate-prompt").inputValue()).includes("continent"))
await T("map-generate-prompt").fill("My own words. A hand-painted map.")
await gdlg.locator('[data-gen-kind="coast"]').click()
check("draw dialog: an edited prompt is kept when the kind changes", (await T("map-generate-prompt").inputValue()) === "My own words. A hand-painted map.")
await shot(page, "pml-draw")
await T("map-generate-go").click()
await T("map-generate-result").waitFor({ timeout: 15000 })
const sent = JSON.parse(window_calls[0] ?? "{}")
check("draw: one call, wide, with the prompt as written", window_calls.length === 1 && sent.aspect === "wide" && sent.prompt === "My own words. A hand-painted map.", window_calls[0])
check("draw: the result is shown before anything is changed", !pm().levels?.find((l) => l.id === "l1")?.picture)
await shot(page, "pml-draw-result")
await T("map-generate-use").click()
await settle(2500)
const pic = pm().levels?.find((l) => l.id === "l1")?.picture
check("Use this map keeps it as this map's picture only", !!pic?.id && !pm().picture?.id, JSON.stringify(pic))
check("the drawn map is on the board", (await fr().evaluate(() => { const i = document.querySelector('[data-testid="place-map-frame"] img'); return !!(i && i.naturalWidth > 0) })))

// ---- phone and light
await shot(page, "pml-dark")
check("no page error in the whole run", errors.length === 0, errors.join(" | "))
await fr().getByText("Home", { exact: true }).first().click()
await settle(1200)
await setAppTheme(page, fr())
await fr().getByText("Chats", { exact: true }).first().click()
await settle(1500)
await fr().locator("a, button, [role=button]").filter({ hasText: /Dzvinka/ }).first().click().catch(() => {})
await settle(1500)
await openMap()
await shot(page, "pml-light")
await page.setViewportSize({ width: 390, height: 800 })
await page.reload()
await page.waitForTimeout(7000)
await skipTours(page, fr())
await openMap()
await settle(1500)
check("phone: no sideways scroll", await noSideScroll())
check("phone: the title switcher and the gear are both on the bar", (await T("place-map-levels").count()) === 1 && (await T("place-map-menu").count()) === 1)
await shot(page, "pml-phone")
await gear()
await shot(page, "pml-phone-gear")
await page.keyboard.press("Escape")
await T("place-map-levels").click()
await shot(page, "pml-phone-switcher")
await page.keyboard.press("Escape")
check("phone: still no sideways scroll", await noSideScroll())
check("no page error in the phone run", errors.length === 0, errors.join(" | "))

await close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
