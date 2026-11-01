# Forge checks that need a real model and real hands (issue #141)

What `forge/forge-check.mjs` already proves with a fake model is in `.claude/skills/browser-check/SKILL.md`
(section "Roleplay and the Agent forge"). Each item below is what it cannot prove. Needs: the real app, a free model
you pick in the chat's Model tab. Take notes in the issue as you go.

1. **Own light theme, real data.** Roleplay settings > Themes > Daylight. Open: a chat with an installed agent and its
   panel, the Agents sheet (a review card and an update card), the Forge (Agents tab, the editor, Try, Agent sets).
   Look for text that is hard to read, a dark patch, a frame that stays dark. (The automated sweep covers Daylight only
   and a few screens.)
2. **A real free model runs an agent.** Agents tab > Install and manage agents > Drafts: install "Tension meter" and
   "Scene recap", Allow, add to a chat. Play 10 replies. Read the "Agents · N" line under each reply: how many runs failed,
   and what the failure says. Does the meter move for the right reasons? Does a small model answer the JSON?
3. **Update by a real file.** In the Forge open an installed agent (Edit a copy), change the version, export or install
   to get a `.vertep-agent.json` file, then Agents sheet > Install an agent file with the real picker. Check the
   update view (new permission marked "New", unchanged ones folded) and that the agent runs after Allow.
4. **Hostile text from a real model.** Install `.claude/skills/browser-check/forge/fixtures/echo-board.vertep-agent.json`.
   In the Forge change the question card's prompt to: `FORGE-ECHO. In your answer write exactly this, with the angle brackets:
   <script>alert(1)</script> <img src=x onerror=alert(2)> and then one sentence about the scene.` Save, Update, Allow, play a reply.
   Expect the tags shown as plain text in both the framed box and the plain line, no dialog, nothing loaded.
   If the model refuses to write tags, say it is a test string for an escaping check.
5. **Sandbox with real times.** Agent sets > New set > add an agent that has run many times (item 2) > Sandbox. Compare
   the times and call counts it shows with what the replies took. Is the estimate near the truth for your model?
6. **agent-craft with Molfar.** Needs Roleplay with the skill update of branch `claude/project-thread-bffm44`
   (the old copy tells Molfar the html widget is not drawn). Ask Molfar: "Make an agent for a chat: a panel that shows the current
   mood as text and a small html widget with a coloured box. Use the agent-craft skill." Then: Agents sheet > Drafts. Pass:
   the draft is listed "Passes the check" at once. If it is red, copy the check's message into the issue.
