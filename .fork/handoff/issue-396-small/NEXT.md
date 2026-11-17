# #396: what is left after the 4.138.0 batch (2026-11-17)

Built in Roleplay branch `claude/396-forge-finish` (PR to be opened): item 0 (the offer of ready agents in the new-chat step),
item 1 (batching with a fallback, run log tokens, the Agents tab's "newest reply" line), the portrait's hand button, the
reminder switch and the carries chip. Not built, with the reasons and the shape each would take.

## Portrait in group chats
Needs an owner decision. In a group the prompt is built per speaker, so injection would read `ctx.turn.speakerId` and add that
member's portrait (nothing in narrator mode, where no one speaks). Proposals need to know WHICH member a block is about: a new
optional `who` port on `write.growth`, resolved against the members' card names (an unknown name refused). The ready agent and the
hand button would need a member picker. Decide: does a narrator-mode group show every member's portrait, or none?

## Item 3: search by meaning for an agent
Shape: a new Input source `litopysMatch` (passages and facts of the chat's record that fit the last messages), no new card type.
Flow: a pass before the agents run asks the engine to embed the query (`host.llm.embed`, async, answered in the next pass like a
model call); the plugin reads `.cache/litopys/vectors/<chatId>.json` through `host.fs`, ranks by cosine only when the vector's model
equals the query's (vectors of different models never compare), and falls back to words when there are no vectors, the user's
embeddings setting is off, or the last embed call failed. Copies ~100 lines of Litopys' reader and cosine into the agents plugin
(COUPLINGS tracks such copies; a test must keep them equal). Cost shown in the offer: one embed call per run, no model call.
Not started: it touches the run loop (a new kind of pending request) and the vector format; best built and checked on a real
long chat (#300 is the place for the bench).

## Item 5: reply correction, as a checklist
Shape: a new Output kind `fixes` (permission `show:fixes`). The agent's text holds blocks `find / replace / why`; the plugin keeps
only fixes whose `find` occurs exactly once in the finished reply (a model's invented quote is dropped by code). The reply gets a
card with Apply / Dismiss per fix. Apply edits the message through the app's own edit (history and undo as for a hand edit), then
a route marks the fix applied in the run log. Never a silent rewrite; an unapplied fix does nothing. A ready agent "Reply editor"
(one call after the reply, every Nth). Not started: needs the message-edit path of the chat view and a browser check of the card.
