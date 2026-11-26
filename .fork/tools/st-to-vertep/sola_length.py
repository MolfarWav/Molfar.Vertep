# Reply length (owner, 2026-11-25): with Gemma 4 31B Sola wrote about 250 words whatever the length pick
# (700-900 asked). Three causes in the text: the length rule lets a short user message shrink the reply
# ("I scale to the user's input"), the sheet plans one BEAT through OPEN, FOCUS, YIELD with no word target in
# SHAPE, and the filled example's SHAPE says "two short paragraphs, then one long", which models copy.
# Rapid Fire and Adaptive keep scaling to the user: that is what they are for. Exec'd from sola_v5_port.py.
#
# Second part (owner, 2026-11-26): the same target also goes out as one plain note at depth 0, like Vertep Medium's
# "This reply" note. Measured in the owner's chat: Gemini wrote no sheet at all, so the target in SHAPE never existed;
# MiMo and DeepSeek wrote a sheet and then ignored it or dropped the number; a card line "narration will not exceed
# 2 paragraphs" beat the target on GLM (story 229 words; 280 and 331 once the card lines were gone). The note takes the
# pick's own value, replaces card-side caps, and does not depend on the model keeping a sheet.

NO_SHRINK = "a short message from the user does not shrink it; only a request for another length does"
for _n in ("Bookey-quo (400-500 Words) ⚜️ [PICK 1: LENGTH]", "Novelistic Epic (700-900 Words) 📘 [PICK 1: LENGTH]",
           "Absolute Cinema (1500-2000 Words) 🎥 [PICK 1: LENGTH]"):
    _i = pid_of(_n)
    _c = P[_i]['content']
    _k = _c.count("I scale to the user's input")
    assert _k >= 2, (_n, _k)
    P[_i]['content'] = _c.replace("I scale to the user's input", NO_SHRINK)
    # Vertep Medium, where the same model writes 600-850 words, says how to fill a long turn: deeper, not further
    _c = P[_i]['content']
    _c2, _k = re.subn(r"(\* length: [^\n]*?)(?=\}\}|\n)", r"\1\n* depth: I fill the length by going deeper into the moment (senses, actions, "
                      r"the characters' dialogue and inner life, the world around them), never by running past {{user}}'s next move.", _c, count=1)
    assert _k == 1, _n
    P[_i]['content'] = _c2
edit("Bookey-quo (400-500 Words) ⚜️ [PICK 1: LENGTH]", "About 400–500 words, scaled to how much you wrote.",
     "About 400–500 words, whatever the length of your own message.")

SR = "Sola's Story Review ⭐"
edit(SR, "SHAPE: register dry and wry, held · open on dialogue (last turn opened on action) · two short paragraphs, then one long · one question at most.",
     "SHAPE: register dry and wry, held · open on dialogue (last turn opened on action) · length on target, enough beats to fill it, paragraph shapes varied · one question at most.")
edit(SR, "* [craft] paragraphs: I scan this and the previous turn's paragraph structure and diversify.",
     "{{#if {{getvar::check_length}}}}* [canon] length: SHAPE names my length target ({{getvar::check_length}}) and how many beats fill it, "
     "about one beat for every 120–150 words.{{/if}}\n"
     "* [craft] paragraphs: I scan this and the previous turn's paragraph structure and diversify.")
edit(SR, "* [craft] anchors: I commit three parts: OPEN (where the turn begins), FOCUS (what it attends to, even a quiet beat), YIELD (the last shot).",
     "* [craft] anchors: I commit three parts: OPEN (where the turn begins), FOCUS (what it attends to, even a quiet beat), YIELD (the last shot).\n"
     "* [craft] long turns: when my length target is 700 words or more, FOCUS lists two or three movements in order, so the turn has room to unfold before YIELD.")
# the sheet competed with the story: on Sola, Gemma wrote 500-700 words of sheet and ~250 of story; on Vertep
# Medium (plan capped at 50-80 words) the same model wrote 600-850 words of story
edit(SR, "* [craft] the sheet: eight labels ASK NOW PEOPLE THREADS TOOLS BEAT SHAPE ANCHORS; short decisive fragments, one decision per field, no trial dialogue or prose rehearsal.",
     "* [craft] the sheet: eight labels ASK NOW PEOPLE THREADS TOOLS BEAT SHAPE ANCHORS; short decisive fragments, one decision per field, no trial dialogue or prose rehearsal.\n"
     "* [craft] sheet size: the whole sheet stays under 200 words; the words of this turn belong to the story, not to the plan.")
edit("Lightning Story Review ⚡", "### the call sheet\n",
     "### the call sheet\n* [craft] sheet size: the whole call sheet stays under 120 words; the words of this turn belong to the story.\n")
edit("Lightning Story Review ⚡", "### the call sheet\n",
     "### the call sheet\n{{#if {{getvar::check_length}}}}* [canon] length: my length target ({{getvar::check_length}}) decides how many beats the turn holds, "
     "about one for every 120–150 words.{{/if}}\n")


# ---- the reply note at depth 0 (see the header). reply_note is set by the length pick, empty for Adaptive and Off.
NOTE_NOT_SHRINK = "; a short message from the user does not shrink it"
NOTES = {
    "Rapid Fire (200-300 Words) ⏩ [PICK 1: LENGTH]": "about 200–300 words, two or three paragraphs, scaled to how much {{user}} wrote.",
    "Bookey-quo (400-500 Words) ⚜️ [PICK 1: LENGTH]": "400–500 words, never under 400, four or five paragraphs" + NOTE_NOT_SHRINK + ".",
    "Novelistic Epic (700-900 Words) 📘 [PICK 1: LENGTH]": "700–900 words, never under 700, four to eight paragraphs" + NOTE_NOT_SHRINK + ". A short reply is a failure here.",
    "Absolute Cinema (1500-2000 Words) 🎥 [PICK 1: LENGTH]": "1500–2000 words, never under 1500, ten to sixteen paragraphs" + NOTE_NOT_SHRINK + ". A short reply is a failure here.",
}
for _n, _v in NOTES.items():
    _i = pid_of(_n)
    _c = P[_i]['content']
    _k = "{{setvar::check_length::"
    assert _c.count(_k) == 1, _n
    P[_i]['content'] = _c.replace(_k, "{{setvar::reply_note::%s}}{{trim}}\n%s" % (_v, _k))

NOTE_ID = 'sola_reply_note_vertep'
NOTE_NAME = "📏 This reply: length"
P[NOTE_ID] = {
    'identifier': NOTE_ID, 'name': NOTE_NAME, 'role': 'system', 'system_prompt': False, 'marker': False,
    'injection_position': 0, 'injection_depth': 0,
    'content': "{{// Added in the port: the length pick as one plain note at the very end of the prompt, like Vertep Medium's. "
               "A model that writes no sheet, or a card that caps narration, no longer decides the length alone.}}{{trim}}\n"
               "{{#if {{getvar::reply_note}}}}[This reply: {{getvar::reply_note}} "
               "This replaces any limit on narration length, paragraph count or wordiness written in the character card. "
               "Fill the length by going deeper into the moment (senses, actions, the characters' dialogue and inner life, the world around them), "
               "never by running past {{user}}'s next move. "
               "The HUD notes, the chatterbox and the cue come after the story and do not count toward it.]{{/if}}",
}
ORDER.append([NOTE_ID, True])
ENABLED0[NOTE_ID] = True

# ---- Story language (#534). The old "Language Selector" switch wrote a fixed Spanish line and had no place to type a
# language; it is dropped (sola_v5_port.py DROP) and its slot in the Post-History text goes with it. The choice below is
# Vertep Medium's own (same options and wording, "Same as my messages" by default) plus "Other" with a text box, and its
# note goes in the chat at depth 0. The port adds both after the compile (LANG_VARS, LANG_SECTIONS).
edit("Post-History Instructions 🏁", "{{getvar::sola_opt_lang}}\n", "")
LANG_VARS = [
    {"id": "var_language", "name": "language", "label": "Story language", "type": "choice", "defaultValue": "",
     "question": "The language the story is written in.",
     "choices": [
         {"id": "language_same", "label": "Same as my messages", "value": "the language of the user's last message, even when the card, the greeting, earlier replies or these instructions are in another one.",
          "hint": "Follows the language you write in."},
         {"id": "language_uk", "label": "Українська", "value": "Ukrainian, whatever language the user writes in.", "hint": "Always Ukrainian."},
         {"id": "language_en", "label": "English", "value": "English, whatever language the user writes in.", "hint": "Always English."},
         {"id": "language_ru", "label": "Русский", "value": "Russian, whatever language the user writes in.", "hint": "Always Russian."},
         {"id": "language_other", "label": "Other (write it below)", "value": "other", "hint": "Any other language: write its name in the box below."},
     ],
     "multi": False, "separator": ", ", "display": "list", "defaults": ["language_same"]},
    {"id": "var_language_other", "name": "language_other", "label": "Your language", "type": "text", "defaultValue": "",
     "question": "Used when \"Other\" is picked above. Write the language, for example Polish."},
]
LANG_SECTIONS = [(
    "🌐 Story language",
    "[Language: {{#if language == \"other\"}}{{#if language_other}}{{var:language_other}}, whatever language the user writes in.{{else}}the language of the user's last message.{{/if}}{{else}}{{var:language}}{{/if}}]",
    "The story language, one line at the very end of the prompt. Replaces the old Language Selector switch, which wrote a fixed Spanish line. [Choices: Story language.]",
)]
