# Task: write two page bodies for the Molfar Vertep website

The site is static HTML built by a small script. Each page is a BODY FRAGMENT only (what goes inside `<main>`): no `<html>`, `<head>`, header, footer, `<style>`. The first line of each fragment is a comment of exactly this form:
`<!-- title: <page title> | description: <one-sentence meta description> -->`

Attached:
- `site.css`: the stylesheet. Use ONLY its existing classes (container, section, section-header, gallery-grid, gallery-item + caption, bento, bento-card, col-span-4/6/12, steps-grid, step-item, btn btn-primary btn-secondary, center, mt-8/16/24/32, page-head, prose, summary, table-wrap, text-link, divider). No inline styles except where unavoidable.
- `index.html`: the home page body, as an example of markup and tone.
- `readme-long.md`: the facts. Use only facts from it. Do not invent features, numbers, quotes or claims.

Image paths are relative: `assets/screens/<name>.png` (home, chat, dashboard, soul, library, molfar, profile, persona, prompt-board, chat-links, quick-moves, store, phone-chat, phone-molfar). Every `<img>` has real alt text, `loading="lazy"`, and `width`/`height` are not needed.

## Page 1: features.html
Title "Features · Molfar Vertep". A `page-head` section (h1 "Features", one-line intro), then sections:
1. "Molfar, the agent inside": change it by asking (from README "Change it by asking", all five safety points), then "Make Molfar your own": skills, projects, memory. One screenshot `molfar.png`.
2. "The Roleplay app": a gallery of ALL 12 desktop screenshots (home, chat, dashboard, soul, library, molfar, profile, persona, prompt-board, chat-links, quick-moves, store), each caption = the README's full description for it (shorten only slightly). After the gallery one paragraph with the small details ("Story, move", lorebooks by keywords or meaning, presets, regex scripts, personas, data bank).
3. "On a phone": the two phone screenshots side by side (use the `gallery-grid` with two items or a simple two-column bento) and the README's sentence about Wi-Fi or the Android app.
4. "Yours, at home": the README bullets (runs locally, any model, sandboxed apps with what they ask for, 14 languages, free software AGPL-3.0, fork of Chrysalis Engine) plus "Sync through your own Google Drive (new in 1.1.0): your device talks to Google directly, the app can see only the files it made, see the privacy policy" linking `privacy.html`.
5. A closing call to action: buttons "Download" (`download.html`) and "Join Discord" (https://discord.gg/NMqSehTCTs).

## Page 2: download.html
Title "Download · Molfar Vertep". `page-head` with h1 "Download" and a line: the latest release is on GitHub; everything is free.
1. A primary button "All files of the latest release" -> https://github.com/MolfarWav/Molfar.Vertep/releases/latest . Next to it a `<span id="latest-version"></span>` that a small script fills.
2. A table (inside `div.prose > div.table-wrap > table`) with columns System | File | How to start, rows exactly as the README's install table (Windows, macOS Apple silicon, macOS Intel, Linux x64/arm64, Android 9+, Docker). The File cell holds a link `<a data-asset="windows-x64.zip" href="https://github.com/MolfarWav/Molfar.Vertep/releases/latest">Molfar-Vertep-&lt;version&gt;-windows-x64.zip</a>` (data-asset = the part after the version: windows-x64.zip, macos-arm64.tar.gz, macos-x64.tar.gz, linux-x64.tar.gz, linux-arm64.tar.gz, android-arm64.apk). Docker row: `ghcr.io/molfarwav/molfar-vertep` in `<code>`.
3. Sections in `div.container.prose` with h2: "First start" (the 4 steps from README "Start in 5 minutes", as an `<ol>`), "Windows from source in one file" (Molfar-Vertep.bat paragraph + the dubious ownership note, the `git config` command in `<code>`), "macOS" (start.command note), "Android" (debug-signed APK note), "Docker" (the docker run commands in `<pre><code>`), "Run from source" (Git + Bun 1.4, the commands in `<pre><code>`), "Updating" (only what the README says; if it says nothing specific, skip this section).
4. One inline `<script>` at the end (under 40 lines, no libraries): fetch `https://api.github.com/repos/MolfarWav/Molfar.Vertep/releases/latest`; on success set `#latest-version` text to "Latest: v1.2.3" and, for each `a[data-asset]`, find the asset whose name ends with `-` + data-asset and set its href to `browser_download_url` and its text to the asset name. On any failure do nothing (the links already point to the releases page). No other network calls.

## Style of the text
Plain direct English, short sentences, no marketing words ("seamless", "powerful", "unleash", "revolutionary"), no emoji, no em dashes (use a colon, comma or full stop instead).

## Output
Exactly two fragments, each preceded by a marker line, nothing else, no markdown fences:
===FILE features.html===
...
===FILE download.html===
...
