// SillyBunny's own macro engine (SillyTavern's newer one), run headless: the core, env and variable macros on an
// in-memory variable store. random, pick, roll and the clock are unregistered, so they stay raw for the app to fill.
// SILLYBUNNY = a SillyBunny (or SillyTavern) folder; run with `bun --preload ./preload.ts`.
const SB = String(process.env.SILLYBUNNY || "").replace(/\\/g, "/");
if (!SB) throw new Error("set SILLYBUNNY to a SillyBunny or SillyTavern folder");
const M = `${SB}/public/scripts/macros/`;
const local = new Map();
const global = new Map();
const store = (m) => ({
  get: (k) => m.get(k) ?? "",
  set: (k, v) => m.set(k, v),
  has: (k) => m.has(k),
  del: (k) => m.delete(k),
  // SillyTavern's addLocalVariable: numbers add, anything else is appended
  add: (k, v) => {
    const a = Number(m.get(k) ?? 0);
    const b = Number(v);
    m.set(k, !Number.isNaN(a) && !Number.isNaN(b) && String(v).trim() !== "" ? a + b : String(m.get(k) ?? "") + v);
  },
  inc: (k) => { const n = Number(m.get(k) ?? 0) + 1; m.set(k, n); return n; },
  dec: (k) => { const n = Number(m.get(k) ?? 0) - 1; m.set(k, n); return n; },
});
globalThis.SillyTavern = { getContext: () => ({ variables: { local: store(local), global: store(global) } }) };
globalThis.toastr = { warning() {}, error() {}, info() {} };
globalThis.$ = () => ({ prop() { return this; }, trigger() { return this; } });
globalThis.window = globalThis;
const { MacroEngine } = await import(`${M}engine/MacroEngine.js`);
const { MacroRegistry } = await import(`${M}engine/MacroRegistry.js`);
const { registerCoreMacros } = await import(`${M}definitions/core-macros.js`);
const { registerEnvMacros } = await import(`${M}definitions/env-macros.js`);
const { registerVariableMacros } = await import(`${M}definitions/variable-macros.js`);
registerCoreMacros();
registerEnvMacros();
registerVariableMacros();
for (const n of ["random", "pick", "roll", "time", "date", "isotime", "isodate", "weekday"]) {
  try { MacroRegistry.unregisterMacro(n); } catch {}
}
if (!process.env.ST_DEBUG) { console.warn = () => {}; console.error = () => {}; }

export function stReset() { local.clear(); global.clear(); }
export function stEval(text) {
  return MacroEngine.evaluate(text, {
    names: { user: "Anna", char: "Arthur", group: "Arthur", notChar: "Anna" },
    character: { description: "DESC", personality: "PERS", scenario: "SCEN", persona: "PERSONA" },
    system: {},
    functions: { postProcess: (x) => x },
    contentHash: 1,
    dynamicMacros: {},
  });
}
export const stVars = local;
