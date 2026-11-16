// Phase 2: Daylight and a 390 px phone, on the engine phase 1 used (it left a chat and an empty memory).
import fs from "node:fs"
import { DATA } from "./pw.mjs"
import { openRp, skipTours, shot, close, setAppTheme } from "./roleplay.mjs"

const out = []
const ok = (name, pass, extra = "") => { out.push({ name, pass, extra }); console.log((pass ? "PASS " : "FAIL ") + name + (extra ? " : " + String(extra).slice(0, 260) : "")) }
const RP = `${DATA}/apps/roleplay/data`
const chatId = fs.readdirSync(`${RP}/chats`).filter((f) => f.endsWith(".meta.json"))[0].replace(".meta.json", "")
const tidy = (s) => s.replace(/\s+/g, " ")
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// seed: two proposals waiting, a rule for this chat, a rule for all chats, ten names kept
const now = Date.now()
const st = JSON.parse(fs.readFileSync(`${RP}/world/state/${chatId}.json`, "utf8"))
st.settings.things = "reasons"
st.settings.cast = "rare"
st.signals = ["Cup", "Bag", "Rope", "Plate", "Chair", "Candle", "Coin"].map((name, i) => ({ at: now - 90000 + i, op: "delete", kind: "thing", name, madeBy: "dm" }))
const ev = { n: 7, total: 9, share: 78, min: 5, thr: 60, days: 30, names: ["Coin", "Candle", "Chair"], kind: "thing" }
st.learned = {
  next: 9,
  rules: [{ id: "r1", scope: "chat", lever: { key: "things", to: "reasons" }, was: "all", source: "proposal", ev, at: now - 5000 }],
  proposals: [
    { id: "q7", key: "textMax", lever: { key: "textMax", from: 900, to: 450 }, ev: { n: 3, total: 5, share: 60, min: 3, thr: 30, days: 30, names: ["Bohdan", "Nina", "Old Tom"], kind: "person", len: 450 }, at: now - 4000 },
    { id: "q8", key: "things", lever: { key: "things", from: "reasons", to: "off" }, ev: { ...ev, n: 6, total: 6, share: 100 }, at: now - 3000 },
  ],
  answered: [], applied: [{ id: "g1", key: "cast", to: "rare", was: "normal" }], log: [{ at: now - 4000, act: "raise", key: "textMax", to: 450, ev: { n: 3, total: 5, share: 60, min: 3, thr: 30, days: 30, names: [] } }],
}
fs.writeFileSync(`${RP}/world/state/${chatId}.json`, JSON.stringify(st))
fs.writeFileSync(`${RP}/world/learned.json`, JSON.stringify({ v: 1, next: 2, rules: [{ id: "g1", scope: "all", lever: { key: "cast", to: "rare" }, source: "proposal", ev: { ...ev, kind: "person" }, at: now - 6000 }], queue: [{ chatId, id: "q7", key: "textMax", at: now - 4000 }, { chatId, id: "q8", key: "things", at: now - 3000 }] }))

const overX = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
async function toMemory(h, label) {
  const fr = () => h.page.frames().find((f) => f.url().includes("/app/molfar/roleplay/")) ?? h.app
  // the World section from the rail (a desktop) or the menu (a phone)
  let opened = false
  for (const name of [/^World$/, /World/]) {
    const b = fr().getByRole("button", { name }).first()
    if (await b.count()) { await b.click({ force: true }).catch(() => {}); opened = true; break }
  }
  await sleep(1500)
  await shot(h.page, label + "-a-after-world")
  const dm = fr().locator('[data-testid="world-top-dm"]').first()
  await dm.waitFor({ timeout: 20000 }).catch(() => {})
  ok(label + ": World hub opened", opened && (await dm.count()) > 0)
  await dm.click({ force: true })
  await sleep(800)
  await shot(h.page, label + "-b-dm-list")
  await fr().locator('[data-testid="world-memory-row"]').first().click({ force: true })
  await fr().locator('[data-testid="memory-view"]').first().waitFor({ timeout: 20000 }).catch(() => {})
  await sleep(1500)
  return fr
}

// Daylight on a desktop
{
  const d = await openRp({ lang: "en" })
  await setAppTheme(d.page, d.app, "Daylight").catch((e) => console.log("theme", e.message))
  const fr = await toMemory(d, "daylight")
  const t = tidy(await fr().locator('[data-testid="memory-view"]').first().innerText().catch(() => ""))
  ok("daylight: two proposals and the rules are shown", /Waiting for your answer 2/.test(t) && /Things in the book: Only with a reason/.test(t) && /People coming back: Rare/.test(t), t.slice(0, 200))
  await shot(d.page, "daylight-1-memory")
  await fr().locator('[data-testid="memory-add"]').first().scrollIntoViewIfNeeded()
  await shot(d.page, "daylight-2-add")
  await fr().locator('[data-testid="memory-reset"]').first().scrollIntoViewIfNeeded()
  await shot(d.page, "daylight-3-bottom")
  await close().catch(() => {})
}

// a phone, 390 px
{
  const p = await openRp({ width: 390, theme: "light", lang: "en" })
  const fr = await toMemory(p, "phone")
  const t = tidy(await fr().locator('[data-testid="memory-view"]').first().innerText().catch(() => ""))
  ok("phone: the Memory view is a screen of its own with the proposals", /Waiting for your answer 2/.test(t), t.slice(0, 160))
  await shot(p.page, "phone-1-memory")
  const btn = await fr().locator('[data-testid="memory-answer-chat"]').first().boundingBox()
  ok("phone: the answer buttons are at least 40 px high", !!btn && btn.height >= 40, btn ? String(Math.round(btn.height)) : "no box")
  await fr().locator('[data-testid="memory-rule"]').first().scrollIntoViewIfNeeded()
  await shot(p.page, "phone-2-rules")
  await fr().locator('[data-testid="memory-add"]').first().scrollIntoViewIfNeeded()
  await shot(p.page, "phone-3-add")
  await fr().locator('[data-testid="memory-reset"]').first().scrollIntoViewIfNeeded()
  await shot(p.page, "phone-4-bottom")
  ok("phone: no sideways scroll", (await overX(p.page)) === false)
  const inner = await fr().locator('[data-testid="memory-view"]').first().evaluate((el) => { let n = el; while (n && n.scrollWidth <= n.clientWidth + 1) n = n.parentElement; return n ? n.tagName + "." + String(n.className).slice(0, 40) : null })
  ok("phone: nothing inside scrolls sideways", inner === null || /BODY|HTML/.test(inner) === false ? inner === null : true, String(inner))
  await close().catch(() => {})
}
const failed = out.filter((o) => !o.pass)
console.log("\n" + (out.length - failed.length) + " of " + out.length + " passed")
process.exit(failed.length ? 1 : 0)
