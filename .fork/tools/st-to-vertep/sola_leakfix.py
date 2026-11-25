# The helpers (Dashboard sensor, Litopys) read a reply through storyView, which applies only the preset's prompt
# scripts that delete a match and have no depth limit (#85). Sola's HUD, chatterbox and footnotes therefore leave
# the history at every depth now, so no helper takes the Notebook's guesses or the chatter as story. Rules that
# leaned on the old blocks being in the history are reworded here. Exec'd from sola_v5_port.py for every variant.

for _n in ("Sola Chatterbox 💬", "Sola Soapbox 📣"):
    _i = pid_of(_n)
    _c = P[_i]['content']
    _c = _c.replace("goal: I keep a rolling five-message text thread where I react to the turn",
                    "goal: I keep a short text thread under each turn where I react to it")
    _c = re.sub(r"\* rolling window: I read the (?:previous turn's|latest) <chatterbox[^\n]*\n",
                "* fresh each turn: my earlier threads are not shown to me; I start a new short thread every turn and do not invent what I said before.\n", _c)
    _c = _c.replace("* five max: when the thread exceeds five messages, I drop the oldest.\n", "")
    _c = re.sub(r"\[Carry over recent 0–4 messages from (?:the latest|previous turn's) <chatterbox[^\]]*\]\n", "", _c)
    P[_i]['content'] = _c
    assert 'rolling window' not in _c and 'Carry over' not in _c, _n
edit("Sola Soapbox 📣", "* their answer: the user's answer is established direction, and I carry it into the next beats.",
     "* their answer: the user's answer is established direction, and I carry it into the next beats. my question is not shown "
     "to me again, so I read a (U: ...) text as the answer to what I last asked.")
edit("Sola's Notebook 📓", "* continuity: I revisit useful ideas from previous notebook entries and let resolved or irrelevant ones go.",
     "* continuity: my earlier entries are not shown to me; I build on what the story itself has kept.")
MG = "Sola's Marginalia 📝"
edit(MG, "* spacing: I allow one craft note at most in any three consecutive assistant turns; after one, I leave two assistant turns without another.",
     "* rarity: my earlier footnotes are not shown to me, so I keep craft notes rare: one only when it clearly helps.")
edit(MG, "craft stays optional, with two intervening assistant turns;", "craft stays optional and rare;")
edit(MG, "craft spacing held;", "craft notes rare;")
edit(MG, "* eligibility: I suggest only when useful, even when spacing permits;", "* eligibility: I suggest only when useful;")
