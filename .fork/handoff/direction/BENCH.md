# Direction bench, phase 0 (#496)

Decided with the owner (2026-11-22): a **synthetic** school rom-com group chat (the owner's group chats are 1 to 16
replies, too short); four measurements; models DeepSeek V4 Flash, GLM 5.2 and MiMo 2.6 through NanoGPT only.
Nothing here changes the product. Builds on the #401 bench (`.fork/handoff/turn-director/MEASUREMENTS.md`).

## Where things are
- Scripts: Roleplay repo, branch `claude/direction-bench`: `scripts/director-bench.ts` (existing sensor replay, reused
  as is for the snapshots) and `scripts/direction-bench.ts` (new: corpus build, variants A and B, rules, delivery, score).
- Corpus: outside any repo, `D:\Claude\tmp\direction-bench\` (the outline, the generated chat, `root/` in the shape
  `director-bench.ts` reads, results). Synthetic and fictional: no owner data in it, so it may go to any provider.

## Corpus
- Five fictional members (second-year class, one school), one player persona, a narrator-mode group, English.
- An **outline** of about 48 turns is the answer key: per turn the player's action, the beat, and the truth:
  `place`, `time` (clock and day), `tag`, `present` (members only, never the player), `aloneWith` (the one member
  when the player is alone with exactly one, else null), `sceneNew` (place change or time jump in this turn),
  `direction` (the sensor's vocabulary).
- The outline must contain: lessons with the whole class, breaks and lunch with 2-4 present, a club, walks home,
  alone stretches with one girl of 1, 2, 3, 4 and 5 turns, interruptions that end some of them, one member absent for
  10+ turns, two time jumps (next morning, the weekend), a date, a study session at home, one festival evening.
- Prose: an external model writes each turn (player message 1-3 sentences, reply 150-300 words, narrator voice for
  all present) from the outline, never naming tags or stating the labels.
- Checks by code before use: `aloneWith` set exactly when `present` has one member; `sceneNew` true on every place or
  day change; every name in `present` is a member.

## Genre tags (rom-com set v0)
`lesson`, `break`, `lunch`, `club`, `commute` (to or from school), `group_out` (several, outside school),
`date`, `alone_moment` (the player and one member in a private moment), `at_home`, `event` (festival, sports day).
Precedence in the key: when the player is alone with one member, `commute`, `break`, `lunch` and `club` become
`alone_moment`; `date` and `at_home` stay. `sceneNew` in the key is computed by code (place differs, or the day
changes, or more than 30 minutes pass), not taken from the outline writer.

## Rules v0 (conditions only; the dice are left out of the bench)
- `interrupt`: the player has been alone with the same member for 3 or more turns in a row.
- `crowd`: tag is `break`, `lunch`, `club` or `group_out`, and a member has been out of the scene for 6 or more turns.
- `payoff`: once `interrupt` fired twice for the same member, the next alone stretch with her is protected for 4 turns
  (`interrupt` does not fire there).
The key's firing = these rules over the key's state. Simulated firing does not change the fixed chat.

## Measurements
- **M4, sensor inputs:** the real Dashboard sensor replayed over the chat (`director-bench.ts --mode baseline`) per
  model. Scored against the key per turn: `present` (precision, recall, exact), `aloneWith` (derived), `sceneNew`
  (F1), `direction` (agreement).
- **M1, scene tag:** A = code from the sensor's snapshot (place words, clock, how many present, `direction`);
  B = a director call per turn (closed tag list, the previous state and the turn's two messages, JSON out).
  Accuracy against the key, confusion on `alone_moment` / `date` / `at_home`, tokens, time.
- **M2, firing:** for each rule, per turn true or false: code over the key (truth), code over the sensor's state
  (A), the director's answer (B, asked in the same call as its tag). Precision, recall, F1, and how many turns late.
- **M3, delivery:** about 12 points from the outline, each a stage note: bring someone in (`interrupt`, `crowd`),
  hold the lock ("only X is here"), return ("the others come back"). The reply model writes the next reply from a
  narrator-group prompt (members' short cards, the last 8 messages, the next player message with the note appended
  where World puts its event). Note text: template (names filled in) or written by a cheap model (variant C).
  Judged came / mentioned / ignored, and for the lock whether anyone absent appeared, by a strong judge model with a
  rubric; a sample re-judged by hand. Delivery rate per reply model and note kind, words of the reply.
- Each run is one run; differences of a few points are noise (#401 measured the band).

## Models (NanoGPT subscription ids)
- `deepseek/deepseek-v4-flash` (the Dashboard default), `z-ai/glm-5.2`, `xiaomi/mimo-v2.6-flash`: sensor, director
  and reply model in turn.
- Prose of the corpus and the judge: models outside the tested three (a strong one), named only in the results.
