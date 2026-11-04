// Forge checks on a throwaway engine with the real Roleplay app and a fake model (issue #141).
//   .claude/skills/browser-check/start.sh $W && .claude/skills/browser-check/install-roleplay.sh $W <roleplay checkout>
//   cp -r .claude/skills/browser-check/forge $W/ ; cd $W && bun forge/forge-check.mjs
// Roleplay runs in its own light theme (Daylight) the whole time; screenshots land in $WORK/forge-shots/.
// What this proves: the pipeline, the layout, the escaping and the frame's limits. What it cannot prove: how a real
// model behaves (see .fork/handoff/forge-checks/MANUAL.md).
import fs from "node:fs"
import path from "node:path"
import { DATA, WORK, turns, mockLog } from "../pw.mjs"
import { openRp, setAppTheme, startChat, openAgentSheet, uploadAgent, allowAgent, closeSheet, addAgentToChat, sendAndWait, skipTours, shot, close } from "../roleplay.mjs"
import { echoBoard } from "./agents.mjs"

const OUT = `${WORK}/forge-shots`
fs.mkdirSync(OUT, { recursive: true })
const results = []
async function check(id, title, fn) {
  try { const note = await fn(); results.push({ id, title, ok: true, note: note ?? "" }); console.log(`PASS ${id} ${title}${note ? " — " + note : ""}`) }
  catch (e) { results.push({ id, title, ok: false, note: String(e.message ?? e) }); console.log(`FAIL ${id} ${title} — ${e.message ?? e}`) }
}
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`) }
const yes = (c, what) => { if (!c) throw new Error(what) }
const snap = async (page, name) => { const p = await page.screenshot({ path: `${OUT}/${name}.png` }); return p }

// what a hostile model could write into a text field
const HOSTILE = [
  "</span></div><script>top.__pwned=1</script>",
  `<img src="http://evil.invalid/pixel.png" onerror="top.__pwned=2">`,
  `<iframe src="http://evil.invalid/frame"></iframe>`,
  `<style>@import url(http://evil.invalid/a.css);body{background:url(http://evil.invalid/b.png)}</style>`,
  `<a href="javascript:top.__pwned=3">click</a> " onmouseover="top.__pwned=4" {{said}} {{#each x}}`,
].join(" ")

// the helpers a chat starts: they must answer something readable so no failure toast covers the screen
const quiet = [
  { match: "You are the scene sensor", text: "{}" },
  { match: "You are the world keeper", text: "{}" },
]
const story = { text: '*She smiles.* "Welcome, traveler."' }

const files = {
  v1: `${WORK}/echo-board-1.0.0.json`,
  v2: `${WORK}/echo-board-1.1.0.json`,
}
fs.writeFileSync(files.v1, JSON.stringify(await echoBoard()))
fs.writeFileSync(files.v2, JSON.stringify(await echoBoard({ version: "1.1.0", extraSource: true })))

const requests = []
const consoleErrors = []
await turns([...quiet, story, { match: "FORGE-ECHO", text: "A calm line." }])
const { page, app } = await openRp({ theme: "light" })
page.on("request", (r) => requests.push(r.url()))
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()) })

await check("theme", "Roleplay is in its own light theme", async () => {
  await setAppTheme(page, app, "Daylight")
  const dark = await app.evaluate(() => document.documentElement.classList.contains("dark"))
  const bg = await app.evaluate(() => getComputedStyle(document.body).backgroundColor)
  yes(!dark, "the app root still has the dark class")
  const [r, g, b] = bg.match(/\d+/g).map(Number)
  yes(r + g + b > 600, `the page background is not light: ${bg}`)
  return `background ${bg}`
})

await startChat(page, app)

await check("install", "an agent file is installed from the Agents sheet and waits for Allow", async () => {
  await openAgentSheet(page, app)
  const card = await uploadAgent(page, app, files.v1, "echo-board")
  yes(await card.getByRole("button", { name: "Allow" }).isVisible(), "no Allow button on a fresh agent")
  await snap(page, "01-sheet-review-light")
  await allowAgent(page, app, "echo-board")
  yes(!(await card.getByRole("button", { name: "Allow" }).isVisible().catch(() => false)), "Allow stays after pressing it")
  await snap(page, "02-sheet-allowed-light")
  await closeSheet(page)
  await addAgentToChat(page, app, "Echo board")
})

await check("run", "a reply makes the agent ask the model once and the panel shows the answer", async () => {
  await mockLog({ reset: true })
  await sendAndWait(page, app, "Hello there", { match: "FORGE-ECHO" })
  const asked = (await mockLog()).filter((r) => r.match === "FORGE-ECHO").length
  eq(asked, 1, "model calls of the agent")
  await app.getByTestId("agent-float").first().click().catch(() => {})
  await page.waitForTimeout(800)
  const text = await app.locator("body").innerText()
  yes(text.includes("A calm line."), "the panel does not show the model's line")
  await snap(page, "03-panel-calm-light")
})

await check("hostile", "hostile text from a model is escaped and the frame is sealed", async () => {
  await turns([...quiet, story, { match: "FORGE-ECHO", text: HOSTILE }])
  requests.length = 0
  await sendAndWait(page, app, "Now something else", { match: "FORGE-ECHO" })
  await page.waitForTimeout(1500)
  const frame = app.getByTestId("agent-html").last()
  await frame.waitFor({ timeout: 15000 })
  eq(await frame.getAttribute("sandbox"), "", "the sandbox attribute (empty = every right off)")
  const doc = (await frame.getAttribute("srcdoc")) ?? ""
  yes(doc.includes("&lt;script&gt;"), "the script tag is not escaped in the frame's document")
  yes(!/<(script|img|iframe|link|a)\b/i.test(doc), "a live tag from the model reached the frame's document")
  yes(doc.includes("{{said}}"), "the model's {{said}} was expanded instead of printed")
  yes(doc.includes("default-src 'none'"), "the frame has no Content-Security-Policy")
  const evil = requests.filter((u) => u.includes("evil.invalid"))
  eq(evil.length, 0, `requests to the hostile host (${evil.join(", ")})`)
  for (const where of [page, app]) eq(await where.evaluate(() => window.__pwned ?? null), null, "window.__pwned")
  const visible = await page.frames().find((f) => f.url() === "about:srcdoc")?.evaluate(() => document.body.innerText).catch(() => null)
  if (visible != null) yes(visible.includes("<script>"), "the frame does not show the script text as plain text")
  await snap(page, "04-panel-hostile-light")
  return `${requests.length} requests seen, none to the hostile host${visible == null ? "; frame text not readable" : ""}`
})

await check("update", "an update with a new permission waits for Allow and the agent does not run meanwhile", async () => {
  await turns([...quiet, story, { match: "FORGE-ECHO", text: "A second line." }])
  await openAgentSheet(page, app)
  const card = await uploadAgent(page, app, files.v2, "echo-board", { version: "1.1.0" })
  const upd = app.getByTestId("agent-update")
  await upd.waitFor({ timeout: 15000 })
  const newTag = await app.getByTestId("agent-need-new").count()
  yes(newTag >= 1, "the update view marks no new permission")
  yes((await upd.innerText()).toLowerCase().includes("last message"), "the new permission (the player's last message) is not named")
  await snap(page, "05-update-view-light")
  await closeSheet(page)
  await mockLog({ reset: true })
  await sendAndWait(page, app, "Does it run?", { match: "FORGE-ECHO", calls: 1, timeout: 8000 })
  eq((await mockLog()).filter((r) => r.match === "FORGE-ECHO").length, 0, "agent calls before Allow")
  await openAgentSheet(page, app)
  await allowAgent(page, app, "echo-board")
  await closeSheet(page)
  await sendAndWait(page, app, "Now it should", { match: "FORGE-ECHO" })
  eq((await mockLog()).filter((r) => r.match === "FORGE-ECHO").length, 1, "agent calls after Allow")
})

// drafts: what Molfar writes into data/agents/drafts, as the agent-craft skill tells it to
await check("drafts", "recipes and an html draft show in the sheet as OK, a broken one lists its error", async () => {
  const dir = `${DATA}/apps/roleplay/data/agents/drafts`
  fs.mkdirSync(dir, { recursive: true })
  const refs = `${DATA}/apps/roleplay/.skills/agent-craft/references`
  for (const f of fs.readdirSync(refs).filter((n) => n.endsWith(".vertep-agent.json"))) fs.copyFileSync(path.join(refs, f), path.join(dir, f.replace(/^recipe-/, "")))
  const bad = JSON.parse(fs.readFileSync(files.v1, "utf8"))
  bad.agent.id = "broken-one"; bad.nodes[1].params.role = "nobody"
  fs.writeFileSync(path.join(dir, "broken-one.vertep-agent.json"), JSON.stringify(bad))
  await app.getByRole("button", { name: /^Agents$/ }).first().click()
  await app.getByTestId("forge-list").waitFor({ timeout: 30000 })
  await app.getByTestId("forge-open-broken-one").waitFor({ timeout: 30000 })
  const ok = ["tracker", "note", "choices", "hint"]
  for (const id of ok) yes(/Passes the check/.test(await app.getByTestId(`forge-open-${id}`).innerText()), `the draft ${id} does not pass the check`)
  yes(/Does not pass the check/.test(await app.getByTestId("forge-open-broken-one").innerText()), "the broken draft is not marked")
  await snap(page, "06-forge-drafts-light")
  return "4 recipes pass, the broken one is marked"
})

await check("forge", "the Forge editor, its Try tab and the sets board open in the light theme", async () => {
  await app.getByTestId("forge-open-tracker").click()
  await app.getByTestId("forge-board").waitFor({ timeout: 30000 })
  await page.waitForTimeout(1200)
  await snap(page, "07-forge-editor-light")
  await app.getByText("Try", { exact: true }).first().click()
  await app.getByTestId("try-panel").waitFor({ timeout: 15000 })
  await page.waitForTimeout(800)
  await snap(page, "08-forge-try-light")
  await app.getByTestId("board-sets").click()
  await page.waitForTimeout(1500)
  await snap(page, "09-forge-sets-light")
})

await check("contrast", "no text in the light theme is nearly invisible", async () => {
  // text whose colour is within 2.2:1 of what is behind it, on the page now (the Forge's sets tab)
  const bad = await app.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
    const rgba = (s) => (s.match(/[\d.]+/g) ?? [0, 0, 0, 0]).map(Number)
    const backOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if ((c[3] ?? 1) > 0.9) return c } return [255, 255, 255] }
    const out = []
    for (const el of document.querySelectorAll("body *")) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.5 || r.width < 4 || r.height < 4 || el.closest("[disabled],[aria-disabled=true]")) continue
      const f = rgba(cs.color), b = backOf(el); const l1 = lum(f.slice(0, 3)), l2 = lum(b.slice(0, 3))
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      if (ratio < 2.2) out.push(`${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`)
    }
    return out.slice(0, 8)
  })
  eq(bad.length, 0, `low-contrast text: ${bad.join("; ")}`)
})

await check("console", "no page errors or hostile-host requests were logged", async () => {
  const mine = consoleErrors.filter((t) => !/favicon|Failed to load resource.*(404|401)|Unrecognized Content-Security-Policy directive/.test(t))
  eq(mine.length, 0, `console errors: ${mine.slice(0, 3).join(" | ")}`)
})

// the same screens on a phone
await close()
const phone = await openRp({ theme: "light", width: 390, height: 844 })
await check("phone", "the chat, the agents tab and the Forge fit 390 px wide", async () => {
  const wide = []
  const measure = async (name) => { const over = await phone.page.evaluate(() => document.documentElement.scrollWidth - innerWidth); const inner = await phone.app.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (over > 0 || inner > 0) wide.push(`${name} (+${Math.max(over, inner)}px)`); await snap(phone.page, `phone-${name}`) }
  await skipTours(phone.page, phone.app)
  await phone.app.getByText("Home", { exact: true }).last().click()
  await phone.page.waitForTimeout(1200)
  await measure("10-home")
  await phone.app.getByRole("button", { name: /^Continue$/ }).first().click()
  await phone.app.getByLabel("Message input").waitFor({ timeout: 20000 })
  await phone.page.waitForTimeout(1000)
  await measure("11-chat")
  await phone.app.getByTestId("agent-float").first().click().catch(() => {})
  await phone.page.waitForTimeout(800)
  await measure("12-chat-panel")
  await phone.page.keyboard.press("Escape")
  await phone.app.getByRole("button", { name: /^Back to chats$/ }).first().click()
  await phone.page.waitForTimeout(1000)
  await phone.app.getByText("More", { exact: true }).last().click()
  await phone.page.waitForTimeout(800)
  await phone.app.getByText("Agents", { exact: true }).first().click()
  await phone.app.getByTestId("forge-list").waitFor({ timeout: 20000 })
  await phone.page.waitForTimeout(800)
  await measure("13-forge")
  eq(wide.length, 0, `sideways scroll on: ${wide.join(", ")}`)
})

await close()
const bad = results.filter((r) => !r.ok)
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log(`\n${results.length - bad.length}/${results.length} passed; shots in ${OUT}`)
process.exit(bad.length ? 1 : 0)
