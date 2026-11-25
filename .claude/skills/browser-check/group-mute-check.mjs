// The Members tab of a group editor in Roleplay (Molfar.Vertep#504): the mute switch has a visible label and a tooltip, a muted member
// is marked, the line above the list says what the switch does and warns when every member is muted. Run on a FRESH engine after
// start.sh and install-roleplay.sh: `cd $W && bun group-mute-check.mjs`.
import fs from "node:fs"
import path from "node:path"
import { openRp, shot, close, skipTours } from "./roleplay.mjs"
import { DATA } from "./pw.mjs"

const results = []
const check = (name, ok, extra = "") => { results.push({ name, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra && !ok ? "  -> " + extra : ""}`) }
const errors = []

const { page, app: app0 } = await openRp()
page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 160)))
const charsDir = path.join(DATA, "apps", "roleplay", "data", "characters")
const first = fs.readdirSync(charsDir)[0]
// a second character: a copy of the first with another name
fs.cpSync(path.join(charsDir, first), path.join(charsDir, "kolo"), { recursive: true })
const cardPath = path.join(charsDir, "kolo", "card.json")
const card = JSON.parse(fs.readFileSync(cardPath, "utf8")); card.name = "Kolo"; if (card.data) card.data.name = "Kolo"
fs.writeFileSync(cardPath, JSON.stringify(card, null, 2))
const fr = () => page.frames().find((x) => x.url().includes("/app/molfar/roleplay/"))
await skipTours(page, fr())
const gid = "grp_mutecheck"
const put = await fr().evaluate(async ({ gid, first }) => {
  const r = await fetch(`/v1/apps/roleplay/groups/${gid}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: gid, name: "Mute check", memberIds: [first, "kolo"], mode: "natural", mutedIds: [], generationMode: "narrator" }) })
  return r.status
}, { gid, first })
check("a group with two members was made", put === 200 || put === 204, String(put))
await page.reload(); await page.waitForTimeout(7000); await skipTours(page, fr())
await fr().getByRole("button", { name: /^Groups$/ }).first().click()
await page.waitForTimeout(1500)
await shot(page, "gm-0-groups")
await skipTours(page, fr())
await fr().getByText("Mute check").first().click({ timeout: 8000 })
await page.waitForTimeout(1500)
await fr().getByRole("tab", { name: /Members/ }).click()
await page.waitForTimeout(800)
const hint = fr().locator('[data-testid="group-mute-hint"]')
check("a line above the list says what the switch does", (await hint.innerText()).toLowerCase().includes("mute"))
const label = fr().locator('label[for^="mute-"]').first()
check("the switch has a visible name", (await label.isVisible()) && (await label.innerText()).trim() === "Mute")
check("the switch has a tooltip", ((await fr().getByRole("switch").first().getAttribute("title")) ?? "").length > 10)
await shot(page, "gm-1-members")
await fr().getByRole("switch").first().click()
await page.waitForTimeout(1200)
check("a muted member is marked on the row", (await fr().locator('[data-testid^="group-muted-"]').count()) === 1)
check("one muted member is not a warning", (await hint.getAttribute("role")) === null)
await fr().getByRole("switch").nth(1).click()
await page.waitForTimeout(1200)
check("when every member is muted the line warns", (await hint.getAttribute("role")) === "alert" && (await hint.innerText()).toLowerCase().includes("every member"))
await shot(page, "gm-2-all-muted")
await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(1500)
await fr().getByRole("tab", { name: /Members/ }).click().catch(() => {})
await page.waitForTimeout(800)
check("on a phone nothing scrolls sideways", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
await shot(page, "gm-3-phone")
check("no page errors", errors.length === 0, errors.join(" | "))
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
await close()
process.exit(failed.length ? 1 : 0)
