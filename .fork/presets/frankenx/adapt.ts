// Builds Roleplay's built-in FRANKENX preset from the author's Marinara export.
// bun .fork/presets/frankenx/adapt.ts <roleplay clone> <FRANKENX_v1_6_Marinara.json> <out engine preset .json>
// Runs the app's own Marinara importer, then adapts the text to Molfar Vertep: what the app already
// does (scene header, tracker agents, story summary) goes, optional blocks become per-chat toggles.
// Every replacement must match exactly once, so a changed source fails loudly instead of drifting.
import fs from "node:fs";
import path from "node:path";

(globalThis as Record<string, unknown>).location = { pathname: "/app/u/roleplay/" };
(globalThis as Record<string, unknown>).window = globalThis;
const [app, src, out] = process.argv.slice(2);
const { presetImport } = await import(path.resolve(app, "src/lib/import-shapes.ts"));
const { buildDefaultPreset } = await import(path.resolve(app, "src/lib/seed.ts"));
const { presetToEngine } = await import(path.resolve(app, "src/lib/engine.ts"));

type Section = { id: string; name: string; enabled: boolean; content: string; condition?: string | null; marker: string | null; order: number };
type Variable = Record<string, unknown> & { name: string; label: string; type: string };

const base = buildDefaultPreset();
const p = presetImport(JSON.parse(fs.readFileSync(src, "utf8")), "FRANKENX", base);
if (!p) throw new Error("not a Marinara preset");

const byName = (name: string): Section => {
  const s = (p.sections as Section[]).find((x) => x.name === name);
  if (!s) throw new Error("no section " + name);
  return s;
};
const drop = (name: string) => { p.sections = (p.sections as Section[]).filter((x) => x !== byName(name)); };
const swap = (name: string, from: string, to: string) => {
  const s = byName(name);
  const n = s.content.split(from).length - 1;
  if (n !== 1) throw new Error(`"${from.slice(0, 50)}" found ${n} times in ${name}`);
  s.content = s.content.replace(from, to);
};

// 1. What the app does itself, or what does not exist here
drop("Scene Header"); // the chat's scene heading and the dashboard track time, date, place, weather
drop("Micro Chain of Thought (FF5, alt)"); // tasks 0-1 missing, phantom tags; BOLT is the plan
drop("HQ NPC Genesis (FF5, off - regenerates NPCs per swipe)");
drop("README - FRANKENX v1.6"); // the history moves to the description
swap("Physics & Perception (FF5)", "time of day from the\nscene header.", "time of day as the\nscene and the character state note establish them.");
swap("Domestic Intimacy (new)",
  "C. ESCALATE - only when 1-3 align AND the character tracker permits: Attraction and\n   Comfort both above 50, with Arousal already moving this scene.",
  "C. ESCALATE - only when 1-3 align AND the relationship is already warm and close (the\n   character state note shows it), with arousal already moving this scene.");
swap("Domestic Intimacy (new)", "- Tracker values are a CEILING, not a target.", "- Relationship warmth is a CEILING, not a target.");
swap("BOLT Chain of Thought (FF5)", "only for the following 0-10 tasks", "only for the following 0-9 tasks");
swap("BOLT Chain of Thought (FF5)", "apply all 0-10 tasks below. Never skip. Never reason beyond the 10th Task.", "apply all 0-9 tasks below. Never skip. Never reason beyond the 9th Task.");
swap("BOLT Chain of Thought (FF5)",
  /7\. Formatting: I must review [\s\S]*?write a logical response length\.\n/.exec(byName("BOLT Chain of Thought (FF5)").content)![0],
  "7. Length{{#if Colored_Dialogue}} and colors: I must keep the dialogue color each character already has in the chat (<colored_dialogue_protocol>){{/if}}. I will write the final response length range set by {{length}} here. It does not have to be exact, but close enough.\n");
swap("BOLT Chain of Thought (FF5)",
  /8\. Modes: If Realism Mode[\s\S]*?Skip if neither present\. ?\n\n/.exec(byName("BOLT Chain of Thought (FF5)").content)![0], "");
swap("BOLT Chain of Thought (FF5)", "9. Plot Momentum:", "8. Plot Momentum:");
swap("BOLT Chain of Thought (FF5)", "10. Open Threads + No more reasoning rule:", "9. Open Threads + No more reasoning rule:");
swap("BOLT Chain of Thought (FF5)",
  "TRACKER NOTE: relationship values, mood and unspoken thoughts are produced by separate tracker agents. Do not calculate, restate or narrate them here. Reason only about behaviour that the current values imply.",
  "STATE NOTE: the app tracks time, place, moods, relationships and who knows what, and may give you a short note on the current state. Do not calculate, restate or narrate it here. Reason only about behaviour the current state implies.");
// the app sanitizes <font>; an inline style survives
swap("Colored Dialogue VN", 'Format_Syntax: `<font color="#HEX">"Dialogue here."</font>`', 'Format_Syntax: `<span style="color:#HEX">"Dialogue here."</span>`');
// the prose language was fixed to English
swap("Output Format", "6. Write English prose in the", "6. Write {{Prose_Language}} prose in the");

// 2. Optional blocks: per-chat toggles (the author's on/off kept), sections gated by condition
const toggles: [string, string, string, boolean, string][] = [
  ["Reasoning_Plan", "Reasoning plan (BOLT)", "A step-by-step plan before each reply. Turn off for models that reason on their own, or to save tokens.", true, "BOLT Chain of Thought (FF5)"],
  ["Sensory_Tracking", "Sensory tracking", "Texture, heat, pain, fatigue and other sensations in the prose.", true, "Sensory Tracking"],
  ["Emotional_Beats", "Emotional beat sequencing", "A fixed order for emotional reactions.", true, "Emotional Beat Sequencing"],
  ["Rotation_Entries", "Varied openings", "Rotates how replies open so they do not start the same way.", true, "Rotation Entry Points"],
  ["Domestic_Intimacy", "Domestic intimacy", "Affection between established partners during everyday activities.", true, "Domestic Intimacy (new)"],
  ["Colored_Dialogue", "Colored dialogue", "Each character's lines in their own color. Adds markup to every reply.", false, "Colored Dialogue VN"],
];
const vars = p.variables as Variable[];
for (const [name, label, question, on, section] of toggles) {
  vars.push({ id: "var_" + name.toLowerCase(), name, label, type: "toggle", defaultValue: on ? "true" : "false", question });
  const s = byName(section);
  s.enabled = true;
  s.condition = name;
}
vars.push({ id: "var_prose_language", name: "Prose_Language", label: "Prose language", type: "text", defaultValue: "English", question: "The language replies are written in." });

// 3. Readable labels
const labels: Record<string, string> = {
  role: "Narrator role", narration: "Narration person", pov: "Point of view", tense: "Tense", length: "Reply length",
  Consent_Allow: "Dark content", Social_Dynamics: "Social resistance", NSFW_Pacing: "Romance pacing",
  Sex_Behavior: "Sex: behavior", Sex_Intimacy_Scale: "Sex: intimacy", Sex_Prose_Tone: "Sex: prose tone",
  Violence_Gore_Tone: "Violence and gore", Cultural_Diction: "Cultural diction", Author_Style: "Author style", Genre_Influence: "Genre",
};
for (const v of vars) if (labels[v.name]) v.label = labels[v.name];
for (const v of vars) for (const c of (v.choices as { label: string }[] | undefined) ?? []) if (c.label === "Game Maser") c.label = "Game Master";
const missing = Object.keys(labels).filter((n) => !vars.some((v) => v.name === n));
if (missing.length) throw new Error("labels for missing variables: " + missing.join(", "));

(p.sections as Section[]).forEach((s, i) => { s.order = i; });
Object.assign(p, {
  id: "frankenx",
  name: "FRANKENX 1.6",
  readOnly: true,
  isDefault: false,
  description: [
    "FRANKENX 1.6 by MolfarWAV: a simulation-style roleplay preset built from FF5 BOLT and agentX, adapted for Molfar Vertep.",
    "Pick its options for each chat in the Preset panel: narrator role, point of view, tense, reply length, genre, social resistance, romance and violence settings, and on/off blocks.",
    "Its instructions take about 13-14k tokens: use a model with a context window of 32k or more.",
    "Read-only: duplicate it to edit the text.",
  ].join("\n\n"),
  // the model's own parameters lead (0.9.2); these only fill what a model leaves unset
  samplers: { ...p.samplers, maxTokens: base.samplers.maxTokens, contextSize: base.samplers.contextSize, reasoning: base.samplers.reasoning },
  createdAt: 0,
});
const engine = { ...presetToEngine(p), id: "frankenx" };
fs.writeFileSync(out, JSON.stringify(engine, null, 2) + "\n");
console.log(`wrote ${out}: ${(p.sections as Section[]).length} sections, ${vars.length} variables`);
