import fs from "node:fs"
import { DATA, WORK, turns, mockLog } from "../pw.mjs"
import { openRp, setAppTheme, startChat, openAgentSheet, uploadAgent, closeSheet, addAgentToChat, sendAndWait, skipTours, close } from "../roleplay.mjs"
import { scriptDemo } from "./script-agent.mjs"
// Script card check (#140): permissions dialog lists the code, a script runs on the engine inside a real chat, hostile markup from it is cleaned.
//   .claude/skills/browser-check/start.sh $W && .claude/skills/browser-check/install-roleplay.sh $W <Roleplay checkout>
//   cp -r .claude/skills/browser-check/forge $W/ ; cd $W && bun forge/script-check.mjs   (fresh engine; shots in $W/script-shots/)
const OUT = `${WORK}/script-shots`; fs.mkdirSync(OUT, { recursive: true })
const snap = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` })
const results = []
const check = async (id, fn) => { try { const n = await fn(); console.log("PASS", id, n ?? ""); results.push(1) } catch (e) { console.log("FAIL", id, e.message); results.push(0) } }
const yes = (c, w) => { if (!c) throw new Error(w) }
const file = `${WORK}/script-demo.json`; fs.writeFileSync(file, JSON.stringify(await scriptDemo()))
const quiet = [{ match: "You are the scene sensor", text: "{}" }, { match: "You are the world keeper", text: "{}" }]
await turns([...quiet, { text: '*She smiles.* "Welcome, traveler."' }])
const requests = []
const { page, app } = await openRp({ theme: "light" })
page.on("request", (r) => requests.push(r.url()))
await setAppTheme(page, app, "Daylight")
await startChat(page, app)
await openAgentSheet(page, app)
await app.locator("[role=dialog] input[type=file]").setInputFiles(file)
const dlg = app.getByRole("dialog").filter({ hasText: "Permissions of Script demo" })
await dlg.waitFor({ timeout: 90000 })
await check("code-listed", async () => {
  await dlg.getByText("Read the code (1)").click()
  await page.waitForTimeout(500)
  const t = await dlg.innerText()
  yes(t.includes("return { result: svg }"), "the dialog does not show the script's code")
  yes(t.includes("Draw chart"), "the dialog does not name the card")
  await snap(page, "02-permissions-code-light")
})
await dlg.getByRole("button", { name: /^Allow all$/ }).click()
await page.waitForTimeout(600)
await snap(page, "03-permissions-allowed-light")
await dlg.getByRole("button", { name: /^Done$/ }).click()
await page.waitForTimeout(500)
await closeSheet(page)
await addAgentToChat(page, app, "Script demo")
await check("run", async () => {
  await mockLog({ reset: true })
  requests.length = 0
  await sendAndWait(page, app, "Hello there")
  await app.getByTestId("agent-float").first().click().catch(() => {})
  await page.waitForTimeout(1500)
  const frame = app.getByTestId("agent-html").last()
  await frame.waitFor({ timeout: 20000 })
  const doc = (await frame.getAttribute("srcdoc")) ?? ""
  yes(doc.includes("<svg"), "no svg in the frame: " + doc.slice(0, 200))
  yes(/length \d+/.test(doc), "the script's number is not in the frame")
  yes(!/<script|<img|<a\b|onerror|javascript:/i.test(doc), "hostile markup reached the frame: " + doc.slice(0, 400))
  yes(doc.includes("default-src 'none'"), "no CSP")
  yes((await frame.getAttribute("sandbox")) === "", "frame not sealed")
  yes(requests.filter((u) => u.includes("evil.invalid")).length === 0, "request to the hostile host")
  for (const where of [page, app]) yes((await where.evaluate(() => window.__pwned ?? null)) === null, "window.__pwned set")
  await snap(page, "04-chart-light")
  return "frame has the chart, hostile parts dropped"
})
await close()
const phone = await openRp({ theme: "light", width: 390, height: 844 })
await skipTours(phone.page, phone.app)
await phone.app.getByRole("button", { name: /^Continue$/ }).first().click().catch(() => {})
await phone.app.getByLabel("Message input").waitFor({ timeout: 20000 }).catch(() => {})
await phone.page.waitForTimeout(1000)
await phone.app.getByTestId("agent-float").first().click().catch(() => {})
await phone.page.waitForTimeout(1500)
await snap(phone.page, "06-chart-phone")
const over = await phone.page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
console.log("phone sideways overflow:", over)
await close()
console.log(results.filter(Boolean).length + "/" + results.length)
process.exit(results.every(Boolean) && over === 0 ? 0 : 1)
