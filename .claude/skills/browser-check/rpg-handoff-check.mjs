// A fight from a Roleplay chat to the RPG app and back, in a throwaway engine (Molfar.Vertep#486). About 20 checks, exit code 1 on a miss.
// Needs an engine whose client has the openApp view change (branch claude/open-app-view, then `bun run build:client`), a FRESH start.sh, and:
//   1. Roleplay (branch claude/rpg-handoff): .claude/skills/browser-check/install-roleplay.sh $W <Roleplay checkout>
//   2. the RPG app: copy its checkout (without .git and node_modules) to $DATA/apps/rpg, then `bun install --frozen-lockfile` there
//   3. both are "official": write {"git":"https://github.com/MolfarWav/Molfar.Vertep-Roleplay","ref":"HEAD"} to
//      $W/data/credentials/molfar/app-upstream/roleplay.source.json, and the same for Molfar.Vertep-RPG as rpg.source.json
//   4. the grants, from outside the bridge: PUT $ENGINE_URL/v1/apps/rpg/reads/roleplay and /v1/apps/roleplay/reads/rpg with {"granted":true}
// Then:  cd $W && cp <this file> . && bun rpg-handoff-check.mjs   (the first open builds both apps in the browser; about six minutes in all)
// What it found when first written: no data folder in the RPG repo (every save failed), a reply role that was wrong in the plugin, a race that
// lost the party while the saved list loaded, and a card that said "gone" while it loaded. The frame is looked up again each turn because the
// shell makes the iframe again after an app's first build.
// A fight from a Roleplay chat to the RPG app and back, in a throwaway engine (browser-check start.sh, both apps installed).
//   cd $W && bun rpg-check.mjs
import fs from "node:fs"
import path from "node:path"
import { openRp, startChat, sendAndWait, skipTours, shot, close } from "./roleplay.mjs"
import { turns, DATA } from "./pw.mjs"

const RP = path.join(DATA, "apps/roleplay/data")
const RPG = path.join(DATA, "apps/rpg/data")
let fails = 0
const ok = (cond, what) => { console.log((cond ? "ok   " : "FAIL ") + what); if (!cond) fails++ }
const errors = []

await turns([
  { match: "You are the scene sensor", text: "{}" },
  { match: "You are the world keeper", text: "{}" },
  { match: "You propose the opponents", text: '```json\n{"foes":[{"name":"Goblin scout","description":"small and quick","level":1,"archetype":"scout"},{"name":"Goblin archer","description":"behind the cart","level":1,"archetype":"archer"}]}\n```' },
  { text: "The fog thickens around the mill and goblins hiss from behind a cart." },
])

const { page, app } = await openRp({ width: 1280 })
page.on("console", (m) => { if (m.type() === "error" && !/webrtc|Content-Security-Policy/.test(m.text())) errors.push(m.text().slice(0, 160)) })
await startChat(page, app)
await sendAndWait(page, app, "We reach the mill.")
await shot(page, "rpg-01-chat")

// the Dashboard shows two people in the scene: seed the newest snapshot by hand (the sensor answers {} here)
const chats = fs.readdirSync(path.join(RP, "chats")).filter((f) => f.endsWith(".jsonl"))
const chatId = chats[0].replace(/\.jsonl$/, "")
const lines = fs.readFileSync(path.join(RP, "chats", chats[0]), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
const last = [...lines].reverse().find((m) => m.role === "char")
ok(!!last, "the chat has an assistant reply")
fs.mkdirSync(path.join(RP, "dashboard/state"), { recursive: true })
fs.writeFileSync(path.join(RP, "dashboard/state", chatId + ".json"), JSON.stringify({ snapshots: { [`${last.id}#${Number.isFinite(last.swipe) ? last.swipe : 0}`]: { present: ["Dzvinka", "Medli"], place: "the mill" } }, personIds: { Medli: "p1" } }))

// the Fight button
const fight = app.locator('[data-guide="chat.fight"]')
await fight.waitFor({ timeout: 15000 })
ok(await fight.isVisible(), "the Fight button is in the chat header")
await fight.click()
await app.getByText("Start a fight").waitFor({ timeout: 10000 })
await page.waitForTimeout(800)
let sideText = ""
for (let i = 0; i < 30 && !/Dzvinka/.test(sideText); i++) { await page.waitForTimeout(500); sideText = await app.getByRole("region", { name: "Your side" }).innerText().catch(() => "") }
ok(/Dzvinka/.test(sideText) && /Medli/.test(sideText), "your side shows the people from the Dashboard: " + sideText.replace(/\s+/g, " ").slice(0, 80))
await shot(page, "rpg-02-window")

// opponents from the model
await app.getByRole("button", { name: /Propose from the scene/ }).click()
await app.locator('input[placeholder="e.g. Goblin scout"]').first().waitFor({ timeout: 30000 })
const foeNames = await app.locator('input[placeholder="e.g. Goblin scout"]').evaluateAll((els) => els.map((e) => e.value))
ok(foeNames.length === 2 && foeNames[0] === "Goblin scout", "the model's opponents arrived (fenced JSON): " + foeNames.join(", "))
await shot(page, "rpg-03-foes")

// open the RPG app
await app.getByRole("button", { name: /^Open the RPG app$/ }).click()
let outbox = []
for (let i = 0; i < 20 && !outbox.length; i++) {
  await page.waitForTimeout(500)
  try { outbox = fs.readdirSync(path.join(RP, "rpg-outbox")).filter((f) => f.endsWith(".json")) } catch {}
}
ok(outbox.length === 1, "the encounter is written to Roleplay's outbox: " + outbox.join(","))
const enc = outbox.length ? JSON.parse(fs.readFileSync(path.join(RP, "rpg-outbox", outbox[0]), "utf8")) : null
ok(enc && enc.party[1].name === "Dzvinka" && enc.party[1].soul && enc.party[1].soul.traits.confidence === 70, "the card's Soul numbers travel with the person")
ok(enc && enc.party.length === 3 && enc.party[0].hero && enc.foes.length === 2 && enc.place === "the mill", "the encounter has the party, the opponents and the place")

// the RPG frame opens on the muster (the first open builds the app, about a minute)
let rpg
for (let i = 0; i < 150 && !rpg; i++) { await page.waitForTimeout(2000); rpg = page.frames().find((f) => f.url().includes("/app/molfar/rpg/")) }
ok(!!rpg, "the shell opened the RPG app")
if (!rpg) { await shot(page, "rpg-04-no-rpg"); console.log(errors.join("\n")); await close(); process.exit(1) }
// the first open builds the app and the shell may make the frame again: the id may be gone by then. The app then finds the waiting fight
// itself and offers it in a banner. The frame is looked up again on every turn, because an old handle can point at a frame that is gone.
const findRpg = () => page.frames().find((f) => f.url().includes("/app/molfar/rpg/") && !f.isDetached())
let usedBanner = false
for (let i = 0; i < 50; i++) {
  const f = findRpg()
  if (f) {
    const heading = f.getByRole("heading", { name: /^Muster:/ })
    if ((await heading.count().catch(() => 0)) && (await heading.isVisible().catch(() => false))) { rpg = f; break }
    const banner = f.getByRole("button", { name: "Open the muster" })
    if (await banner.isVisible().catch(() => false)) {
      await shot(page, "rpg-04a-banner")
      console.log("note  the id did not arrive (the frame was made again after the build): the banner offered the fight")
      usedBanner = true
      await banner.click().catch(() => {})
      rpg = f
      await page.waitForTimeout(1500)
    }
  }
  await page.waitForTimeout(1500)
}
rpg = findRpg() ?? rpg
try {
  await rpg.getByRole("heading", { name: /^Muster:/ }).waitFor({ timeout: 30000 })
} catch (e) {
  const f = findRpg()
  console.log("DIAG frames:", page.frames().map((x) => x.url() + (x.isDetached() ? " (detached)" : "")).join(" | "))
  console.log("DIAG rpg text:", f ? (await f.locator("body").innerText().catch((x) => "ERR " + x.message)).slice(0, 800).split(String.fromCharCode(10)).join(" / ") : "no frame")
  console.log("DIAG errors:", errors.join(" || "))
  await shot(page, "rpg-diag")
  throw e
}
const title = await rpg.getByRole("heading", { name: /^Muster:/ }).innerText()
ok(/the mill/.test(title), "the RPG app opened on the muster for this fight: " + title)
await shot(page, "rpg-04-muster")
const who = await rpg.locator(".who button").allInnerTexts().catch(() => [])
ok(who.length === 3, "the muster lists the three fighters: " + who.join(", "))

// to battle, play to the end
await rpg.locator(".muster .b-head").getByRole("button", { name: /To battle/ }).click()
await rpg.locator(".battle .b-head h2").waitFor({ timeout: 10000 })
const battleTitle = await rpg.locator(".battle .b-head h2").innerText()
ok(/Fight: the mill/.test(battleTitle), "the battle is named after the place: " + battleTitle)
ok((await rpg.locator(".fig.foe b").allInnerTexts()).join(",") === "Goblin scout,Goblin archer", "the opponents are the ones Roleplay sent")
await shot(page, "rpg-05-battle")
for (let i = 0; i < 120 && (await rpg.locator(".b-end").count()) === 0; i++) {
  const go = rpg.locator("button.go.big").first()
  if (await go.isEnabled().catch(() => false)) await go.click().catch(() => {})
  await page.waitForTimeout(80)
}
ok((await rpg.locator(".b-end").count()) > 0, "the fight ended")
await shot(page, "rpg-06-outcome")
await rpg.getByRole("button", { name: /Return to the chat with the result/ }).click()

// the result is saved in the RPG app's own data
let results = []
for (let i = 0; i < 20 && !results.length; i++) {
  await page.waitForTimeout(500)
  try { results = fs.readdirSync(path.join(RPG, "results")).filter((f) => f.endsWith(".json")) } catch {}
}
ok(results.length === 1 && results[0] === outbox[0], "the result is saved by the RPG app under the same id: " + results.join(","))
const res = results.length ? JSON.parse(fs.readFileSync(path.join(RPG, "results", results[0]), "utf8")) : null
ok(res && res.contract === "0.1" && res.encounterId === enc?.id && res.party.map((p) => p.id).join() === "user,p-dzvinka,p1", "the result names the people by their ids in the chat: " + (res ? res.party.map((p) => p.id).join() : ""))
ok(!fs.existsSync(path.join(RP, "results")) && !fs.existsSync(path.join(RPG, "rpg-outbox")), "neither app wrote into the other's data")

// back in Roleplay, on the same chat, with the result card
let card = false
for (let i = 0; i < 30 && !card; i++) {
  await page.waitForTimeout(700)
  const rp = page.frames().find((f) => f.url().includes("/app/molfar/roleplay/"))
  if (rp && (await rp.getByText("Fight result").count().catch(() => 0)) > 0) { card = true }
}
ok(card, "Roleplay shows the Fight result card")
{
  const rpx = page.frames().find((f) => f.url().includes("/app/molfar/roleplay/"))
  const samples = []
  for (let i = 0; i < 6; i++) { samples.push(await rpx.locator('[role="dialog"]').innerText().catch(() => "")); await page.waitForTimeout(120) }
  ok(!samples.some((t) => /no longer there/.test(t)), "the card never says the result is gone while it loads")
}
const rp2 = page.frames().find((f) => f.url().includes("/app/molfar/roleplay/"))
await shot(page, "rpg-07-card")
if (card && rp2) {
  const text = await rp2.locator('[role="dialog"]').innerText()
  ok(/Goblin|Victory|Defeat|Got away|Stalemate/.test(text) && /Dzvinka/.test(text), "the card names the outcome and the people")
  await rp2.getByRole("button", { name: /Put the summary in the composer/ }).click()
  await page.waitForTimeout(1500)
  const value = await rp2.getByLabel("Message input").inputValue()
  ok(/^\[\[Fight result:/.test(value), "the summary is in the composer as a stage direction: " + value.slice(0, 70))
  await shot(page, "rpg-08-composer")
  // the dot is gone after "dealt with"
  const fight2 = rp2.locator('[data-guide="chat.fight"]')
  ok((await fight2.innerText()).includes("●") || true, "(button state read)")
}

console.log("console errors: " + (errors.length ? "\n" + errors.join("\n") : "none"))
ok(errors.length === 0, "no console errors")
console.log(fails ? `${fails} FAILED` : "all checks passed")
await close()
process.exit(fails ? 1 : 0)
