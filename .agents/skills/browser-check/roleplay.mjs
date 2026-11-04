// Playwright helpers for the Roleplay app inside a throwaway engine (start.sh, then install-roleplay.sh).
// Roleplay runs in an iframe of the shell, so every helper takes the shell `page` and the app `frame`:
//   import { openRp, startChat, installAgent, ... } from "./roleplay.mjs"
import { open, shot, close, mockLog } from "./pw.mjs"
export { shot, close, mockLog }

/** The shell's tours ("Your apps", "What's new") and the app's ("Your turn") sit over the page and block clicks. */
export async function skipTours(page, app) {
  await page.waitForTimeout(1200)
  for (let i = 0; i < 10; i++) {
    let skipped = false
    for (const where of app ? [page, app] : [page]) {
      const skip = where.getByRole("button", { name: /^Skip$/ }).first()
      if (await skip.isVisible().catch(() => false)) { await skip.click().catch(() => {}); await page.waitForTimeout(500); skipped = true }
    }
    if (skipped) continue
    const tip = page.getByText("WHAT'S NEW")
    if (await tip.isVisible().catch(() => false)) {
      await page.locator('[aria-label="Close"], [aria-label="close"]').last().click().catch(() => {})
      await page.waitForTimeout(400); continue
    }
    // an overlay with no Skip button (a last step): Escape closes it
    if (app && (await app.locator("[data-guide-overlay]").count().catch(() => 0)) > 0) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); continue }
    break
  }
}

/** The shell with Roleplay launched in its tab. The first open builds the app in the browser (about 40 s). */
export async function openRp(opts = {}) {
  const page = await open({ path: "/", ...opts })
  await page.waitForTimeout(2500)
  await skipTours(page)
  const find = () => page.frames().find((f) => f.url().includes("/app/molfar/roleplay/"))
  let frame = find()
  // a shell that already has Roleplay in its tab (a second open on the same engine) brings the frame up by itself
  for (let i = 0; i < 6 && !frame && (await page.getByText("Where to?").count()) === 0; i++) { await page.waitForTimeout(1000); frame = find() }
  if (!frame) {
    // a fresh shell: pick the app on the "Where to?" page and launch it
    await page.getByText("Vertep", { exact: true }).first().click()
    await skipTours(page)
    // on a phone a tap on the row opens the app; there is no Launch button
    await page.getByRole("button", { name: /Launch/ }).click({ timeout: 4000 }).catch(() => {})
    for (let i = 0; i < 120 && !frame; i++) { await page.waitForTimeout(2000); frame = find() }
  }
  if (!frame) throw new Error("the Roleplay frame never appeared (build failed? see engine.log)")
  await frame.getByRole("button", { name: /^Home$/ }).first().waitFor({ timeout: 90000 })
  await skipTours(page, frame)
  await page.waitForTimeout(500)
  return { page, app: frame }
}

/** Roleplay's own theme (it has one of its own, apart from the shell's): Settings, Themes, a theme by name. */
export async function setAppTheme(page, app, name = "Daylight") {
  await app.getByRole("button", { name: /Roleplay settings/ }).first().click()
  await app.getByText("Themes", { exact: true }).first().click()
  await app.getByText(name, { exact: true }).first().click()
  await page.waitForTimeout(500)
  await app.getByRole("button", { name: /^close$/i }).first().click().catch(() => page.keyboard.press("Escape"))
  await page.waitForTimeout(400)
}

/** Open the first character's chat (Start chat on Home), pick the mock model in the chat's switcher. */
export async function startChat(page, app) {
  await app.getByRole("button", { name: /^Home$/ }).first().click()
  await app.getByRole("button", { name: /Start chat/ }).first().click()
  await app.getByRole("button", { name: /^Start$/ }).click()
  await app.getByLabel("Message input").waitFor({ timeout: 30000 })
  await skipTours(page, app)
  await switchTab(page, app, "Model")
  await app.locator("[cmdk-item]", { hasText: "mock-model" }).first().click()
  await page.waitForTimeout(500)
}

/** The chat header's switcher (Preset, Persona, Model, Agents) open on one tab. */
export async function switchTab(page, app, tab) {
  await app.getByRole("button", { name: /^Switch context/ }).first().click()
  await app.getByRole("tab", { name: new RegExp(`^${tab}`) }).click()
  await page.waitForTimeout(500)
}

/** Agents tab: Install and manage agents (the sheet). */
export async function openAgentSheet(page, app) {
  await switchTab(page, app, "Agents")
  await app.getByText("Install and manage agents").click()
  await app.getByTestId("agent-install").waitFor({ timeout: 30000 })
}

/** Upload an agent file in the open sheet; waits until the card shows the id (the first call builds the plugin sandbox). */
export async function uploadAgent(page, app, file, id, { version } = {}) {
  await app.locator("[role=dialog] input[type=file]").setInputFiles(file)
  const card = app.getByTestId(`agent-card-${id}`)
  await card.waitFor({ timeout: 90000 })
  if (version) await card.getByText(version, { exact: true }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(400)
  return card
}

/** Press Allow on an agent's card when it has one. */
export async function allowAgent(page, app, id) {
  const btn = app.getByTestId(`agent-card-${id}`).getByRole("button", { name: "Allow" })
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await btn.waitFor({ state: "detached", timeout: 15000 }); await page.waitForTimeout(500) }
}

export async function closeSheet(page) { await page.keyboard.press("Escape"); await page.waitForTimeout(700) }

/** Add an installed agent to this chat from the Agents tab. */
export async function addAgentToChat(page, app, name) {
  await switchTab(page, app, "Agents")
  await app.locator("[cmdk-item]", { hasText: name }).first().click()
  await page.waitForTimeout(800)
  await page.keyboard.press("Escape")
  await page.waitForTimeout(400)
}

/** Type in the composer and send; wait for the model's reply, then for `calls` more requests that carry `match` (an agent's question). */
export async function sendAndWait(page, app, text, { match, calls = 1, timeout = 60000 } = {}) {
  const before = (await mockLog()).filter((r) => (match ? r.match === match : true)).length
  const box = app.getByLabel("Message input")
  await box.fill(text)
  await box.press("Enter")
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const n = (await mockLog()).filter((r) => (match ? r.match === match : true)).length
    if (n - before >= calls) break
    await page.waitForTimeout(400)
  }
  // let the result reach the panels
  await page.waitForTimeout(2500)
}
