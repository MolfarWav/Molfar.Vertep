# Cue for the crew (third preset, an experiment): after each reply Sola leaves her helpers a short card of what this
# reply's prose changed. It is folded on screen and left out of the writer's own prompt by a script with minDepth 0;
# storyView skips scripts with a depth limit, so the Dashboard sensor and Litopys still read it (World DM reads raw
# text anyway). Exec'd from sola_v5_port.py when SOLA_CUE is set, after the desk.

CUE = r"""{{// Experiment: after each reply Sola leaves her crew (Dashboard, Litopys, World DM) a short cue card of what the reply changed, so they miss fewer facts. Folded on screen, never sent back to the writing model. Compare a chat with and without it.}}{{trim}}
{{setvar::sola_opt_cue::
## cue for the crew
goal: after the story, I leave my crew one short cue card of what this reply changed, so the board, the chronicle and the world stay true to the page.

### what goes on it
* only the page: every line names something this reply's prose shows happening. no guesses, no plans, no future, nothing I only thought about writing.
* only changes: a line appears only when something changed; an unchanged field is left out.
* plain and short: one line per fact, names as the story spells them, the story's language for the content.
* lines I use, in this order:
  here: place · time of day, or how much time passed
  in: who entered the scene | out: who left, and where to
  wears: <name>: what they put on, took off or ruined
  holds: <name>: what they took, gave, dropped or hid
  learned: <name> learned <what>, from <whom or how>
  said: <name> promised, threatened, swore or lied: <what>
  threads: opened <...> | moved <...> | closed <...>
  mood: <name>: the shift, and what caused it
* nothing changed: I write <cue>no change</cue>.

### output format
at the very end of my post, after everything else, I append exactly one:

<cue>
[the changed lines only]
</cue>}}{{trim}}"""

CUE_ID = 'sola_cue_vertep'
P[CUE_ID] = {'identifier': CUE_ID, 'name': "🎬 Cue for the Crew", 'role': 'system', 'system_prompt': False,
             'marker': False, 'content': CUE, 'injection_position': 0, 'injection_depth': 4}
_at = [k for k, (i, _) in enumerate(ORDER) if i == pid_of("Sola's Marginalia 📝")][0]
ORDER.insert(_at + 1, [CUE_ID, True])
ENABLED0[CUE_ID] = True

SD = "🗝️ Sola’s Secret Drawer"
edit(SD, "{{getvar::sola_opt_chatter}}{{getvar::sola_opt_margin}}}}<sola_after_story>",
     "{{getvar::sola_opt_chatter}}{{getvar::sola_opt_margin}}{{getvar::sola_opt_cue}}}}<sola_after_story>")
edit(SD, "{{getvar::sola_opt_margin}}\n</sola_after_story>",
     "{{getvar::sola_opt_margin}}\n{{getvar::sola_opt_cue}}\n</sola_after_story>")
edit(SD, "{{getvar::sola_opt_names}}\n",
     "{{getvar::sola_opt_names}}\n{{#if {{getvar::sola_opt_cue}}}}{{setvar::sola_opt_cuenudge::* cue: I close the post with one <cue> card for my crew: only what this reply's prose showed changing.}}{{/if}}{{trim}}\n")
edit("Post-History Instructions 🏁", "{{getvar::sola_opt_hudnudge}} {{getvar::sola_box}}",
     "{{getvar::sola_opt_hudnudge}} {{getvar::sola_box}}\n{{getvar::sola_opt_cuenudge}}")
# the desk names the cue as her half of the conversation with the crew
edit("🗂️ Sola's Desk", "\n\n### who has the last word",
     "\n{{#if {{getvar::sola_opt_cue}}}}\n\n### my cue back to them\nthe crew reads the page after I write it, and on a busy page they can miss a beat. so the talk goes both ways: "
     "after the story I leave them a cue card of what this reply changed. it is a stagehand's chalk mark, not a second story: "
     "only what the page shows, only what changed, nothing I merely hope will happen.\n{{/if}}\n\n### who has the last word")
