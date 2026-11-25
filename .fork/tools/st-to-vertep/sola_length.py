# Reply length (owner, 2026-11-25): with Gemma 4 31B Sola wrote about 250 words whatever the length pick
# (700-900 asked). Three causes in the text: the length rule lets a short user message shrink the reply
# ("I scale to the user's input"), the sheet plans one BEAT through OPEN, FOCUS, YIELD with no word target in
# SHAPE, and the filled example's SHAPE says "two short paragraphs, then one long", which models copy.
# Rapid Fire and Adaptive keep scaling to the user: that is what they are for. Exec'd from sola_v5_port.py.

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
