globalThis.location = { pathname: "/app/u/roleplay/", origin: "http://localhost", href: "http://localhost/app/u/roleplay/", search: "", hash: "" } as any; globalThis.window = globalThis as any; globalThis.localStorage = { getItem(){return null}, setItem(){}, removeItem(){} } as any; globalThis.document = undefined as any;
const { renderToStaticMarkup } = await import((process.env.ROLEPLAY_DIR || ".") + "/node_modules/react-dom/server.js"); // from "react-dom/server";
const { Markdown } = await import((process.env.ROLEPLAY_DIR || ".") + "/src/components/markdown.tsx");
const { createElement } = await import((process.env.ROLEPLAY_DIR || ".") + "/node_modules/react/index.js");
import fs from "node:fs";
import os from "node:os";
// output goes to OUT_DIR (default: the temp folder), never into the Roleplay folder these scripts run from
const OUT = process.env.OUT_DIR || os.tmpdir();
const preset = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const sample = `Maren set the ledger down. <font color="#8592E6">"Come closer."</font> <subtext thought="If the audit lands, we're finished.">"Everything's under control."</subtext> He <tell note="Thumb worrying the ring · pulse ticking at the jaw">straightened his cuffs</tell>. "<retract>I can't do this without you.</retract> Pass me the keys."

<dusk:whisper>"Come closer."</dusk> <font color="#EE6C4D"><shake>"Don't."</shake></font> <heavy>SLAM.</heavy> <tilt:-6>"Which way?"</tilt> <indigo:trembling>"I... I didn't know."</indigo> <hearth>*He had buried three brothers.*</hearth> <shake><heavy>BOOM.</heavy></shake>

They crossed <lore entry="Tidal flats the company drained, then abandoned.">the Sallow Reach</lore> by dusk.

<sola_hud>
<tempo>DEVELOP
Sola's Note: The cuffs did the talking. Heavy.
</tempo>

<story_notes>
He's lying about the audit, and she half knows it.

The keys matter more than either says.
</story_notes>
</sola_hud>

<chatterbox mind="Riot">
<user_text>is he lying?</user_text>
<sola_text mind="Riot">Obviously, kid. Watch the cuffs.</sola_text>
</chatterbox>

<sola_footnote>
¹ "the keys was" — Grammar: subject and verb. "the keys were".
</sola_footnote>`;
let text = sample;
for (const r of preset.extensions.regex_scripts) {
  if (!r.markdownOnly) continue;
  const m = /^\/(.*)\/([a-z]*)$/s.exec(r.findRegex);
  if (m[1].length > 500) { console.log("TOO LONG", r.scriptName); continue; }
  const re = new RegExp(m[1], m[2]);
  text = text.replace(re, (...a) => r.replaceString.replace(/\$(\d)/g, (_, n) => a[Number(n)] ?? ""));
}
fs.writeFileSync(OUT + "/after_regex.txt", text);
const html = renderToStaticMarkup(createElement(Markdown, { content: text }));
fs.writeFileSync(OUT + "/rendered.html", html);
console.log(html.slice(0, 6000));
