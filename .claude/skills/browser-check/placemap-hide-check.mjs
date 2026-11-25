// Hiding places from the places map of Roleplay (the owner's request of 2026-11-25), checked end to end in a real browser.
// Run from the work folder on a FRESH engine after start.sh and install-roleplay.sh (see SKILL.md): `cd $W && bun placemap-hide-check.mjs`.
// Checks: the card's "Hide from all maps" and its Undo, the gear's "Hide places..." list, a whole place takes its rooms along,
// the choice survives a reload and is kept in the chat meta, the empty state when everything is hidden, a 390 px phone.
import fs from "node:fs"
import path from "node:path"
import { openRp, startChat, shot, close, skipTours } from "./roleplay.mjs"
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
const api = (method, url, body) => fr().evaluate(async ({ method, url, body }) => {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, json: await r.json().catch(() => null) }
}, { method, url, body })

// ---- seed: an apartment with two rooms, a park, a forge
const places = [
  { kind: "place", name: "Apartment", text: "A small flat.", visits: 3 },
  { kind: "place", name: "Corridor", text: "The flat's corridor.", size: "spot", inside: "Apartment", visits: 1 },
  { kind: "place", name: "Kitchen", text: "The flat's kitchen.", size: "spot", inside: "Apartment", visits: 1 },
  { kind: "place", name: "Riverside Park", text: "Trees by the river." },
  { kind: "place", name: "Old Forge", text: "Smoke and anvils." },
]
for (const p of places) await api("PUT", "/v1/apps/roleplay/world/records", { chatId, op: "add", record: p })

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
const names = async () => (await fr().locator("[data-node]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).sort()
const hiddenInMeta = () => (meta().placeMap?.hidden ?? []).length

await reload()
await openMap()
check("map opens with every place and room", (await names()).join("|") === "Apartment|Corridor|Kitchen|Old Forge|Riverside Park", (await names()).join("|"))
await shot(page, "ph-1-all")

// ---- the card's menu: hide one room
await node("Corridor").click()
await fr().locator('[data-testid="place-map-more"]').click()
check("the card's menu offers to hide a room", (await fr().locator('[data-testid="place-map-hide"]').innerText()).toLowerCase().includes("room"))
await fr().locator('[data-testid="place-map-hide"]').click()
await page.waitForTimeout(1500)
check("a hidden room leaves the map, the rest stay", (await names()).join("|") === "Apartment|Kitchen|Old Forge|Riverside Park", (await names()).join("|"))
check("the choice is kept in the chat meta", hiddenInMeta() === 1)
check("a toast offers Undo", (await fr().getByRole("button", { name: "Undo" }).count()) > 0)
await shot(page, "ph-2-room-hidden")
await fr().getByRole("button", { name: "Undo" }).first().click()
await page.waitForTimeout(1500)
check("Undo brings the room back", (await names()).includes("Corridor") && hiddenInMeta() === 0)
const corridorBox = await node("Corridor").boundingBox()

// ---- hide again, survive a reload
await node("Corridor").click()
await fr().locator('[data-testid="place-map-more"]').click()
await fr().locator('[data-testid="place-map-hide"]').click()
await page.waitForTimeout(1500)
await reload()
await openMap()
check("a hidden room stays hidden after a reload", !(await names()).includes("Corridor") && (await names()).length === 4, (await names()).join("|"))

// ---- the list: tick the room back, hide a whole place
await fr().locator('[data-testid="place-map-menu"]').click()
await fr().locator('[data-testid="place-map-hidden-open"]').click()
const dlg = fr().locator('[data-testid="map-hidden-dialog"]')
await dlg.waitFor()
check("the list holds every place and room", (await dlg.locator("input[type=checkbox]").count()) === 5)
check("the list says how many are hidden", (await dlg.locator('[data-testid="map-hidden-count"]').innerText()).includes("1 of 5") || (await dlg.locator('[data-testid="map-hidden-count"]').innerText()).includes("1"))
const row = (name) => dlg.getByRole("checkbox", { name: new RegExp(`^${name}( ·|$)`) })
check("the hidden room is unticked", !(await row("Corridor").isChecked()))
await shot(page, "ph-3-list")
await row("Corridor").click()
await page.waitForTimeout(1200)
check("ticking a room in the list shows it again, where it stood", (await names()).includes("Corridor") && hiddenInMeta() === 0)
const back = await node("Corridor").boundingBox()
check("it comes back to the same place on the board", corridorBox && back && Math.abs(corridorBox.x - back.x) < 3 && Math.abs(corridorBox.y - back.y) < 3, JSON.stringify([corridorBox, back]))
await row("Apartment").click()
await page.waitForTimeout(1200)
check("hiding a whole place hides its rooms too", (await names()).join("|") === "Old Forge|Riverside Park", (await names()).join("|"))
check("the rooms of a hidden place cannot be ticked alone", await row("Kitchen").isDisabled())
await shot(page, "ph-4-whole-hidden")
await dlg.locator('[data-testid="map-hidden-all"]').click()
await page.waitForTimeout(1200)
check("Show all brings everything back", (await names()).length === 5 && hiddenInMeta() === 0)

// ---- everything hidden: the empty state says so
for (const n of ["Apartment", "Riverside Park", "Old Forge"]) await row(n).click()
await page.waitForTimeout(1200)
await page.keyboard.press("Escape")
await page.waitForTimeout(400)
await page.keyboard.press("Escape")
await page.waitForTimeout(500)
check("with everything hidden the map says so and offers the list", (await fr().locator('[data-testid="place-map-empty-hidden"]').count()) > 0)
await shot(page, "ph-5-empty")
await fr().locator('[data-testid="place-map-empty-hidden"]').click()
await dlg.locator('[data-testid="map-hidden-all"]').click()
await page.waitForTimeout(1200)
await page.keyboard.press("Escape")
check("showing them again fills the map", (await names()).length === 5)
check("the World book still has every place", ((await api("GET", `/v1/apps/roleplay/world/peek?chatId=${chatId}`)).json?.records ?? []).filter((r) => r.kind === "place").length === 5)

// ---- a phone: the list fits and nothing scrolls sideways
await page.setViewportSize({ width: 390, height: 800 })
await page.waitForTimeout(1500)
await fr().locator('[data-testid="place-map-empty-hidden"]').count()
await fr().locator('[data-testid="place-map-menu"]').click().catch(() => {})
await fr().locator('[data-testid="place-map-hidden-open"]').click().catch(() => {})
await dlg.waitFor({ timeout: 8000 }).catch(() => {})
const box = await dlg.boundingBox()
check("on a phone the list stays inside the screen", box && box.x >= 0 && box.x + box.width <= 391, JSON.stringify(box))
check("on a phone the page does not scroll sideways", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
await shot(page, "ph-6-phone")
await page.keyboard.press("Escape")
check("no page errors", errors.length === 0, errors.join(" | "))

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
await close()
process.exit(failed.length ? 1 : 0)
