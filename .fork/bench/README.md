# Roleplay send timing in the real plugin sandbox

`roleplay-send.ts` builds a throwaway Roleplay data dir (a long chat whose replies carry HUD and HTML
blocks, a preset, the regex scripts from a folder you give it) and times `POST /prompt/preview` (the
send's assembly) in the engine's QuickJS sandbox, three runs. From the engine root:

    bun .fork/bench/roleplay-send.ts <roleplay checkout> <regex dir (may be empty)> [messages] [plugins dir]

`instrument.mjs <roleplay>/plugins <out>` copies the plugins with timers around the main functions;
pass `<out>` as the 4th argument and every pass logs `PASS <ms> [function=ms/calls …]`.
The sandbox limit is 10 s per pass on every device; a phone runs QuickJS several times slower than a
desktop, so a desktop result over ~2 s is a phone timeout waiting to happen.
Regex dirs from a real workspace stay local: never commit them.

2026-10-10 (desktop, 150 Sola scripts, 12 at the prompt stage), 400 messages: 3.3 s before, 1.3 s after
Roleplay `0490c68`; no regex 1.6 s -> 0.37 s.
