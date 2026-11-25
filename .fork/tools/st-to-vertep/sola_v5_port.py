"""Sola V5 Flame (SillyTavern) -> Molfar Vertep native preset.

python -I port.py <src.json> <base_vertep_preset.json> <out.json>
"""
import copy
import hashlib
import json
import re
import sys

sys.path.insert(0, __file__.rsplit('\\', 1)[0] if '\\' in __file__ else '.')
from stmacro import (AND, F, NOT, OR, T, CUR, atom, atoms_of, nonempty, parse, prep, render,
                     render_cond, sev, sym_atoms)

SRC, BASE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
src = json.load(open(SRC, encoding='utf-8'))
base = json.load(open(BASE, encoding='utf-8'))

P = {p['identifier']: copy.deepcopy(p) for p in src['prompts']}
ORDER = [[x['identifier'], x['enabled']] for x in
         [o for o in src['prompt_order'] if o['character_id'] == 100001][0]['order']]
ENABLED0 = {i: e for i, e in ORDER}


def pid_of(name):
    hits = [i for i, _ in ORDER if P[i].get('name') == name]
    assert len(hits) == 1, (name, hits)
    return hits[0]


def edit(name, old, new, regex=False, count=1):
    i = pid_of(name)
    c = P[i]['content']
    if regex:
        c2, n = re.subn(old, new, c, count=count)
        assert n >= 1, ('regex miss', name, old[:60])
    else:
        assert old in c, ('miss', name, old[:80])
        c2 = c.replace(old, new, count if count else -1)
    P[i]['content'] = c2


# ------------------------------------------------------------------ 1. drops
DROP = [
    # trackers the app already keeps (Dashboard, World DM, Litopys)
    "So No HUD? 😡", "NPC Roster 👤", "Time Tracker 🕰️", "Bond & Chemistry 💞", "Feeling Engine 📊",
    "Thought Engine 💭", "Heart Engine 🫀", "Character Matrix 🧬", "Sola's Infirmary 🩹", "Sola's Board ♟️",
    "D20 Roleplay System 🏹", "Wardrobe Tracker 🧥", "Carried Inventory 🗡️", "Active Scene Facts 👥",
    "━🎛️ 12. HUD, EASEL & EXTRAS", "Act & Consequence [EASEL] ⚖️", "Story Novelty [EASEL] 📖",
    "Story Catalyst [EASEL] ✨", "Scholar's Gloss [EASEL] 📜", "Sola's Easel: Director Notes 🎭",
    "HUD Tracker Summary 📋", "Master HUD 🎛️", "Zero Trackers 😭", "Last Word: This Turn's Rolls 🎲",
    # display the app already does (speaker colours, Dashboard clock/scene/thoughts) or cannot render
    # (HTML Font Tags + Dark Mode Colors stay: the optional Color Version, drawn by our regex)
    # (Gradient ALL, Tonal Typography, Emphasis Gradients, Kinetic stay too: optional dynamic styling)
    "[PICK 1: ↓] NPC Dialogue Colors 🎨", "Sola's Monitor 🩺", "[PICK 1: ↓] HTML Headers 🎬",
    "[PICK 1: ↑] Simple Headers 🪧", "Zero HTML 😭",
    # the old "do not enable" tail: its markers move into the Oath, the rest is unused
    "━🚫DO NOT ENABLE BELOW THIS LINE🚫", "NSFW Prompt", "Enhance Definitions",
]
dropped = set()
for n in DROP:
    dropped.add(pid_of(n))
ORDER = [x for x in ORDER if x[0] not in dropped]

# ------------------------------------------------------------------ 2. text edits
for i, _ in ORDER:
    if P[i].get('content'):
        P[i]['content'] = P[i]['content'].replace('<user_persona>', '<user-persona>').replace('</user_persona>', '</user-persona>')

# Oath: the card goes through the app's own markers (groups, empty fields skipped), the core opens a group
edit("⚜️ Oath", r"\{\{#if \{\{persona\}\}\}\}[\s\S]*?</character>\n", "@@CARD@@\n", regex=True)
edit("⚜️ Oath", "\n<core>\n", "\n@@GROUP:core@@\n")

# Blueprint: wrapper tags become app groups (xml wrap, only when a member has text)
BP = "🎀 Sola’s Master Blueprint"
edit(BP, "</core>\n", "@@END@@\n")
for g in ("sola_prose", "sola_voice", "sola_world", "sola_intimacy"):
    edit(BP, "<%s>\n" % g, "@@GROUP:%s@@\n" % g)
    edit(BP, "</%s>" % g, "@@END@@")
edit(BP, r"\{\{#if [^\n]*?\}\}<sola_presentation>", "@@GROUP:sola_presentation@@", regex=True)
edit(BP, "</sola_presentation>{{/if}}", "@@END@@")
edit(BP, "{{#if {{getvar::sola_opt_patch}}}}<sola_model>", "@@GROUP:sola_model@@")
edit(BP, "</sola_model>{{/if}}", "@@END@@")

# Section 11 becomes Sola's own HUD: three notes the app has no panel for
P[pid_of("━📊 11. TELEMETRY & STATE TRACKERS")]['name'] = "━📊 11. SOLA'S HUD"
mi = pid_of("Sola's Marginalia 📝")
ORDER = [x for x in ORDER if x[0] != mi]
at = [k for k, (i, _) in enumerate(ORDER) if i == pid_of("Sola's Notebook 📓")][0]
ORDER.insert(at + 1, [mi, True])
for n in ("Story Movement 🎼", "Sola's Notebook 📓", "Sola's Marginalia 📝"):
    ENABLED0[pid_of(n)] = True  # owner: on by default, switchable

# Secret Drawer: rebuilt for the HUD that is left (no ledgers: the app keeps state in its own panels)
P[pid_of("🗝️ Sola’s Secret Drawer")]['content'] = (
    "{{// Required. Do not turn off, edit or delete. Builds the part after the chat: the name rules, "
    "Sola's HUD (Story Movement, Notebook), the Chatterbox and the footnotes, and the reminders for them.}}{{trim}}\n"
    "{{getvar::sola_opt_names}}\n\n"
    "{{#if {{getvar::sola_opt_tempo}}{{getvar::sola_opt_director}}{{getvar::sola_opt_chatter}}{{getvar::sola_opt_margin}}}}<sola_after_story>\n"
    "{{#if {{getvar::sola_opt_tempo}}{{getvar::sola_opt_director}}}}## sola's hud\n"
    "goal: I end my response with one <sola_hud> container that holds my HUD notes, after the prose.\n"
    "* inside: only the HUD notes below; the story, the chatterbox and the footnote stay outside it.\n"
    "* no state rows: the app already tracks time, places, moods, outfits, items, relationships and plot threads "
    "in its own panels, so I add no stats, ledgers or status rows.\n\n"
    "<sola_hud>\n[the active HUD notes below, in this order]\n</sola_hud>\n{{/if}}\n"
    "{{getvar::sola_opt_tempo}}\n{{getvar::sola_opt_director}}\n{{getvar::sola_opt_chatter}}\n{{getvar::sola_opt_margin}}\n"
    "</sola_after_story>{{/if}}{{trim}}\n"
    "{{#if {{getvar::sola_opt_tempo}}{{getvar::sola_opt_director}}}}"
    "{{setvar::sola_opt_remind::* HUD: I output **every** active HUD note inside one <sola_hud>"
    "{{#if {{getvar::sola_opt_chatter}}}}{{#if {{getvar::sola_soapbox}}}}, and the chatterbox only when something catches me"
    "{{else}}, then the chatterbox{{/if}}{{/if}}.}}"
    "{{setvar::sola_opt_hudnudge::* HUD: the chatterbox and the footnote go after </sola_hud>, never inside it.}}{{/if}}{{trim}}\n"
    "{{#if !{{getvar::sola_opt_tempo}}{{getvar::sola_opt_director}}}}{{#if {{getvar::sola_opt_chatter}}}}"
    "{{#if {{getvar::sola_soapbox}}}}{{setvar::sola_opt_remind::* chatterbox: I post it only when something catches me or a text waits.}}"
    "{{else}}{{setvar::sola_opt_remind::* chatterbox: I ensure I output the chatterbox.}}{{/if}}{{/if}}{{/if}}{{trim}}\n"
)

# Story Review: the Easel and the ledgers are gone; the app's notes carry state and threads
SR = "Sola's Story Review ⭐"
edit(SR, "* [canon] continuity: I read the immediately preceding turn's ledger, carrying active threads, physical states, and established facts forward.",
     "* [canon] continuity: I read the app's notes on the scene, people, threads and story memory, and the last turn, carrying active threads, physical states, and established facts forward.")
edit(SR, r"\* \[canon\] follow-through: before choosing the beat, I read the latest Easel[\s\S]*?planning a fix is not completing one\.\n",
     "* [canon] follow-through: before choosing the beat, I check the open threads, promises and unresolved questions the story and the app's notes carry, and keep each one's state.\n"
     "* [canon] no forced tests: I do not force events, dialogue, contact, or user choices to close a thread; a thread with no opening stays open.\n",
     regex=True)
edit(SR, "* [canon] records: I fill trackers from established state and the finished reply, keeping unchanged facts and each module's own rules.",
     "* [canon] records: I write my HUD notes from established state and the finished reply, following each module's own rules.")
edit(SR, r"\{\{#if \{\{getvar::sola_opt_easel\}\}\}\}[\s\S]*?\{\{/if\}\}", "", regex=True)
edit(SR, "* [canon] restraint: I force no scene event, contact, or user choice to test an issue, fill a tool, or justify a tracker.",
     "* [canon] restraint: I force no scene event, contact, or user choice to fill a tool or justify a note.")

# HTML Tools: this app strips radio inputs, labels and inline svg; blank lines break an HTML block
HT = "Sola HTML Tools 🛠️"
edit(HT, "* interactive object: tabs show exactly one pane at a time, and every device carries its own radio group name, never reused across the chat.",
     "* interactive object: multi-view objects use stacked <details> panes, the first one open.")
edit(HT, r"\* one engine: multi-tab views[\s\S]*?\* unique group: [^\n]*\n",
     "* one engine: this app strips radio inputs and labels, so multi-view objects use stacked <details> panes: "
     "<div class=\"term\"><details open><summary>sys.log</summary><div class=\"pane\">…</div></details>"
     "<details><summary>mail</summary><div class=\"pane\">…</div></details></div>; the first pane starts open, the rest closed.\n"
     "* tab chrome: I style each summary as the object's own tab or button (list-style:none, the device's chrome), never as a bare disclosure arrow.\n",
     regex=True)
edit(HT, "* isolation: I scope every CSS selector beneath an artifact root; IDs and radio names stay unique across rendered messages.",
     "* isolation: I scope every CSS selector beneath an artifact root with a class name unique to this object.")
edit(HT, r"\* svg: [^\n]*\n",
     "* icons: this app strips inline svg, so I build icons, badges, battery and signal bars from styled spans, borders and unicode symbols.\n",
     regex=True)
edit(HT, r"; dark artifacts reset --shadowWidth:0!important\.", ".", regex=True)
edit(HT, "width:360px; min-height:680px;", "width:360px; max-width:100%; min-height:600px;")
edit(HT, "* wrapper: I emit raw HTML between <!-- HTML_START --> and <!-- HTML_END --> without markdown fences.",
     "* wrapper: I emit raw HTML between <!-- HTML_START --> and <!-- HTML_END --> without markdown fences.\n"
     "* one block: no blank lines and no indented lines inside the HTML, or the page reads the rest as text.")

# leftover tracker wording
for i, _ in ORDER:
    c = P[i].get('content') or ''
    c = c.replace('trackers do not count.', 'HUD notes, the chatterbox and footnotes do not count.')
    c = c.replace('I draw on the cards and conversation even when no other tracker is enabled.',
                  'I draw on the cards and conversation even when no other HUD note is on.')
    P[i]['content'] = c

# name rules pointed at tracker tags that are gone
for n in ("[PICK 1: ↓] Anti-Name-Slop: Standard 🪪", "[PICK 1: ↕] Anti-Name-Slop: Randomized 🪪", "[PICK 1: ↑] Anti-Name-Slop: List of 20 🪪"):
    edit(n, "* I reuse first: names already in <roster>, <scene_cast>, <bond>, or earlier turns take precedence.",
         "* I reuse first: names already in the story, the app's notes on the cast, or earlier turns take precedence.")

# CoT: the sheet belongs in thinking; a model that writes it in the reply puts it in <plan>, which this
# preset's reasoning tags move into the Thought block
WHERE = ("* [canon] where: the sheet lives in my thinking. If I have no separate thinking, or the sheet would land in "
         "the reply, I put all of it (opener, fields, sign-off) inside <plan>…</plan> at the very top and close </plan> "
         "before the first line of the scene; nothing of the sheet appears outside <plan>.")
edit(SR, "goal: before I write, I fill my story sheet inside thinking, top to bottom, and the turn is whatever the sheet decided.\n",
     "goal: before I write, I fill my story sheet inside thinking, top to bottom, and the turn is whatever the sheet decided.\n" + WHERE + "\n")
edit(SR, "* [craft] close: after YIELD, I add my sign-off line in my voice, then I write the turn in one continuous pass.",
     "* [craft] close: after YIELD, I add my sign-off line in my voice, close the sheet (and </plan> if I opened it), then I write the turn in one continuous pass.")
edit("Lightning Story Review ⚡", "### the call sheet\n", "### the call sheet\n" + WHERE.replace("the sheet", "the call sheet", 2) + "\n")

# Interactive Mechanics: the Monitor is gone
edit("Interactive Mechanics 🔍", "* one thought, one line: a hover ties a hidden thought to one line or gesture; the wider inner life belongs to the Monitor.",
     "* one thought, one line: a hover ties a hidden thought to one line or gesture.")

# Color Version: Sola's font-tag colour mode, optional (off); our regex makes it win over the app's quote tint
FT = "[PICK 1: ↑] HTML Font Tags 🎨"
edit(FT, r"\{\{//[\s\S]*?\}\}",
     "{{// Color Version: each character's dialogue gets its own colour and keeps it every time they speak. "
     "Drawn by this preset's regex over the app's own quote colour. The palette follows \"Color Version: dark theme\".}}",
     regex=True)
edit(FT, "* consistency: I assign each recurring NPC one hex and preserve it when they return.",
     "* consistency: I assign each recurring NPC one hex and preserve it when they return.\n"
     "* memory: before a returning NPC speaks, I look back for the hex they used last and reuse it.")
P[pid_of(FT)]['name'] = "[PICK 1: ↑] Color Version 🎨"
ENABLED0[pid_of("[PICK 1: ↑] Color Version 🎨")] = False
DM = "Dark Mode Colors 🌙"
edit(DM, r"\{\{//[\s\S]*?\}\}",
     "{{// Color Version palette: on, brighter colours for a dark theme; off, deeper colours for a light theme. "
     "Only matters while Dialogue colors is set to Color Version.}}", regex=True)

# Dynamic styling (gradients, tones, motion): optional, all off; drawn by this preset's regex and CSS.
# Sola's examples use the named-colour mode (<copper:whisper>), which is not here: the tone moves onto its own tag
NAMED = ("marigold|amber|cider|coral|honey|rust|ochre|moss|denim|indigo|heather|ash|pine|teal|periwinkle|amethyst|"
         "crimson|cerise|orchid|violet|sapphire|ocean|emerald|jade|sunflower|lemon|magenta|cyan|turquoise|aquamarine|"
         "mint|lime|copper|slate|mist|steel")
TT, EG, KT = "NPC Tonal Typography 🪶", "Emphasis Gradients 🌅", "Kinetic Tonal Emphasis ⚡"
edit(TT, "mixing them into colors (<copper:whisper>, <amber:bite>) or gradients (<dusk:bite>, <solstice:whisper>)",
     "inside a Color Version colour tag (<font color=\"#C28D79\"><whisper>…</whisper></font>) or added to gradients (<dusk:bite>, <solstice:whisper>)")
edit(TT, "* mixed with colors: I append tone directly to palette colors: <copper:whisper>\"Don't make a sound.\"</copper> or <amber:bite>\"Enough.\"</amber>.",
     "* mixed with Color Version: the tone tag goes inside the colour tag: <font color=\"#C28D79\"><whisper>\"Don't make a sound.\"</whisper></font>.")
for n in (TT, EG, KT):
    edit(n, "* combined effects: I choose one color or gradient tag per line and add the tone to that tag, such as <indigo:whisper>\"Come closer.\"</indigo>.",
         "* combined effects: on a gradient I add the tone to that tag, such as <dusk:whisper>\"Come closer.\"</dusk>; with Color Version the tone tag sits inside the colour tag.") if n != KT else None
edit(KT, "combine with colors (<coral:heavy>) or gradients (<solstice:heavy>)",
     "inside a Color Version colour tag, or added to gradients (<solstice:heavy>)")
edit(KT, "* forms: I use standalone <heavy>CRACK.</heavy>, color <coral:heavy>\"STOP.\"</coral>, or gradient <solstice:heavy>\"NEVER.\"</solstice> tags.",
     "* forms: I use standalone <heavy>CRACK.</heavy>, inside a colour tag <font color=\"#EE6C4D\"><heavy>\"STOP.\"</heavy></font>, or gradient <solstice:heavy>\"NEVER.\"</solstice> tags.")
edit(KT, "or signed color modifier <coral:tilt:-6>", "or a signed angle <tilt:-6>")
edit(KT, "* combinations: I use one color or gradient tag per line, adding tone or kinetic modifiers to that tag: <indigo:whisper>\"Come closer.\"</indigo>.",
     "* combinations: on a gradient I add the kinetic modifier to that tag (<solstice:heavy>); with Color Version the kinetic tag sits inside the colour tag.")
for n in (TT, EG, KT):
    i = pid_of(n)
    P[i]['content'] = re.sub(r"<(%s):([a-z]+)((?::-?\w+)?)>([^<]*)</\1(?::[\w:-]+)?>" % NAMED, r"<\2\3>\4</\2>", P[i]['content'])
    assert not re.search(r"<(%s)[:>]" % NAMED, P[i]['content']), n
    ENABLED0[i] = False
ENABLED0[pid_of("[PICK 1: ↕] Gradient ALL The Time 🎨")] = False
P[pid_of(DM)]['name'] = "Color Version: dark theme 🌙"
ENABLED0[pid_of("Color Version: dark theme 🌙")] = True

if not __import__('os').environ.get('SOLA_NO_DESK'):
    exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'sola_desk.py'), encoding='utf-8').read())
_here = __import__('os').path.dirname(__import__('os').path.abspath(__file__))
exec(open(__import__('os').path.join(_here, 'sola_leakfix.py'), encoding='utf-8').read())
exec(open(__import__('os').path.join(_here, 'sola_length.py'), encoding='utf-8').read())
if __import__('os').environ.get('SOLA_CUE'):
    exec(open(__import__('os').path.join(_here, 'sola_cue.py'), encoding='utf-8').read())

# ------------------------------------------------------------------ 3. classify
REQUIRED = {pid_of(n) for n in ("━🧠 00. SOLA'S MIND", "⚜️ Oath", BP, "🗝️ Sola’s Secret Drawer", "🕯️ SOLA'S MIND PALACE (CoT)")}
for i, _ in ORDER:
    if (P[i].get('name') or '').startswith('━'):
        REQUIRED.add(i)
MARKERS = {i for i, _ in ORDER if P[i].get('marker')}

ARROW = re.compile(r'\[PICK 1: ([↓↕↑])\]')
TAGPICK = re.compile(r'\[PICK 1: (MIND|POV|PRONOUN|STYLE|LENGTH|PATCH)\]')
picks = {}   # var -> list of pids
pick_of = {}
cur_arrow = None
for i, _ in ORDER:
    n = P[i].get('name') or ''
    m = TAGPICK.search(n)
    if m:
        v = m.group(1).lower()
        picks.setdefault(v, []).append(i); pick_of[i] = v
        continue
    m = ARROW.search(n)
    if m:
        if m.group(1) == '↓':
            cur_arrow = None
        if cur_arrow is None:
            base_name = re.sub(r'\[PICK 1: .\]|[^\w\s-]', '', n).strip().split(':')[0].strip()
            cur_arrow = re.sub(r'\W+', '_', base_name.lower()).strip('_')
        picks.setdefault(cur_arrow, []).append(i); pick_of[i] = cur_arrow
        if m.group(1) == '↑':
            cur_arrow = None
ARROW_NAMES = {'agency_lite': 'agency', 'anti_slop_lite': 'antislop', 'anti_name_slop_standard': 'names',
               'prose_textures_lean': 'texture', 'anti_softening': 'softening', 'eroge_mode': 'explicit_mode',
               'gradient_all_the_time': 'colors'}
picks = {ARROW_NAMES.get(k, k): v for k, v in picks.items()}
pick_of = {i: ARROW_NAMES.get(v, v) for i, v in pick_of.items()}
REQUIRED_PICK = {'mind', 'pov'}


def clean(n):
    n = re.sub(r'\[PICK 1: [^\]]*\]', '', n)
    n = re.sub(r'[^\w\s&()/.,\'’:+-]', '', n)
    return re.sub(r'\s+', ' ', n).strip(' -:')


def slug(n):
    return re.sub(r'_+', '_', re.sub(r'\W', '_', clean(n).lower())).strip('_')[:40]


def hint(i):
    m = re.search(r'\{\{//\s*([\s\S]*?)\}\}', P[i].get('content') or '')
    if not m:
        return ''
    h = re.sub(r'\s+', ' ', m.group(1)).strip()
    return h if len(h) <= 240 else h[:237].rsplit(' ', 1)[0] + '…'


pick_val = {}
for v, ids in picks.items():
    for i in ids:
        pick_val[i] = slug(P[i]['name'])

# ------------------------------------------------------------------ 4. usage analysis -> who needs a toggle
AST = {}
for i, _ in ORDER:
    AST[i] = [] if i in MARKERS else parse(prep(P[i].get('content') or ''))

reads = {}    # var -> list of (pid, slot?)
defs = {}     # var -> set of pids


def walk(nodes, pid, top):
    for n in nodes:
        k = n[0]
        if k == 'get':
            reads.setdefault(n[1], []).append((pid, top))
        elif k == 'set':
            defs.setdefault(n[1], set()).add(pid)
            walk(n[2], pid, False)
        elif k == 'iff':
            walk(n[3], pid, False); walk(n[4], pid, False)
        elif k == 'if':
            walk(n[1], pid, False); walk(n[3], pid, False); walk(n[4], pid, False)


for i, _ in ORDER:
    walk(AST[i], i, True)


def top_reads(var):
    return [r for r in reads.get(var, []) if r[1] and r[0] in REQUIRED]


def slot_only(var):
    # splittable into definer sections: read once at the top level of a required host
    return len(top_reads(var)) == 1


def needs_guard(var):
    # read anywhere else (a value, a condition, a second slot): its definers need a renderable switch
    r = reads.get(var, [])
    return bool(r) and not (len(r) == 1 and slot_only(var))


toggle = {}
for i, _ in ORDER:
    if i in REQUIRED or i in MARKERS or i in pick_of:
        continue
    mine = [v for v, ps in defs.items() if i in ps]
    if any(needs_guard(v) for v in mine):
        toggle[i] = 't_' + slug(P[i]['name'])


def guard_of(i):
    if i in REQUIRED or i in MARKERS:
        return T
    if i in pick_of:
        return atom(('eq', pick_of[i], pick_val[i]))
    if i in toggle:
        return atom(('tog', toggle[i]))
    return atom(('sec', i))


# ------------------------------------------------------------------ 5. symbolic run
env = {}
OUTSYM = {}
for i, _ in ORDER:
    if i in MARKERS:
        continue
    CUR[0] = i
    g = guard_of(i)
    out = []
    # top level: keep slot gets as markers for the splitter
    for n in AST[i]:
        if n[0] == 'get' and slot_only(n[1]) and i in REQUIRED:
            out.append(('slot', n[1], [d for d in env.get(n[1], [])]))
        else:
            out.extend(sev([n], env, g))
    OUTSYM[i] = out

# ------------------------------------------------------------------ 6. emit sections
def sid(*parts):
    return 'sec_' + hashlib.sha1('|'.join(parts).encode()).hexdigest()[:10]


base_marker = {s['id']: s for s in base['studio']['sections'] if s.get('marker')}
TRIG = ["normal", "continue", "impersonate", "swipe", "regenerate", "quiet"]
groups = {}
sections = []
SECSRC = {}
gstack = [None]


def group_id(name):
    if name not in groups:
        groups[name] = {'id': 'grp_' + hashlib.sha1(name.encode()).hexdigest()[:8], 'name': name, 'wrapFormat': 'xml'}
    return groups[name]['id']


def add_section(name, content, role='system', enabled=True, condition=None, note=None, marker=None, ident=None):
    s = {
        'id': ident or sid(name, str(len(sections))), 'name': name, 'enabled': enabled, 'role': role,
        'marker': marker, 'content': content, 'position': 'relative', 'depth': 4, 'order': len(sections),
        'injectionTriggers': list(TRIG), 'forbidOverrides': False, 'groupId': gstack[-1],
        'condition': condition,
    }
    if note:
        s['note'] = note
    sections.append(s)
    return s


def add_marker(ident, name=None, enabled=True):
    b = copy.deepcopy(base_marker[ident])
    b.update({'enabled': enabled, 'order': len(sections), 'groupId': gstack[-1], 'content': ''})
    if name:
        b['name'] = name
    sections.append(b)


def split_markers(sym):
    """yield ('sym', list) / ('group', name) / ('end',) / ('card',) at @@ markers in top-level strings"""
    cur = []
    for p in sym:
        if isinstance(p, str) and '@@' in p:
            for part in re.split(r'(@@[A-Z]+(?::\w+)?@@)', p):
                m = re.fullmatch(r'@@([A-Z]+)(?::(\w+))?@@', part)
                if m:
                    if cur:
                        yield ('sym', cur); cur = []
                    yield (m.group(1).lower(), m.group(2))
                else:
                    cur.append(part)
        else:
            assert isinstance(p, str) or '@@' not in json.dumps(p, ensure_ascii=False), 'marker inside dynamic text'
            cur.append(p)
    if cur:
        yield ('sym', cur)


def section_from_guard(name, sym, g, note=None, role='system'):
    """g may contain one ('sec', pid) atom (the section's own switch) plus renderable parts"""
    enabled, cond = True, None
    parts = g[1] if g[0] == 'and' else [g]
    rest = []
    for x in parts:
        if x[0] == 'v' and x[1][0] == 'sec':
            enabled = ENABLED0.get(x[1][1], False)
        else:
            rest.append(x)
    rg = AND(*rest) if rest else T
    secsrc = [x[1][1] for x in parts if x[0] == 'v' and x[1][0] == 'sec']
    text = render(sym)
    if rg != T:
        if rg[0] == 'v' and rg[1][0] == 'tog':
            cond = rg[1][1]
        elif rg[0] == 'v' and rg[1][0] == 'eq':
            cond = '%s==%s' % (rg[1][1], rg[1][2])
        else:
            text = '{{#if %s}}%s{{/if}}' % (render_cond(rg), text)
    if not text.strip():
        return None
    s = add_section(name, text.strip('\n') + '\n', role=role, enabled=enabled, condition=cond, note=note)
    if secsrc:
        SECSRC[s['id']] = secsrc[0]
    return s


def emit_sym(host_name, sym, glue_name, note=None, role='system'):
    for kind, val in split_markers(sym):
        if kind == 'group':
            gstack.append(group_id(val))
        elif kind == 'end':
            gstack.pop()
        elif kind == 'card':
            gstack.append(group_id('user_persona'))
            add_marker('personaDescription', 'User Persona')
            gstack.pop()
            gstack.append(group_id('character'))
            add_marker('charDescription', 'Character Info')
            add_marker('charPersonality', 'Character Personality')
            add_marker('dialogueExamples', 'Chat Examples')
            gstack.pop()
        else:
            t = render(val)
            if t.strip():
                add_section(glue_name, t.strip('\n') + '\n', role=role, note=note)


for i, en in ORDER:
    p = P[i]
    name = p.get('name') or i
    if i in MARKERS:
        if i in ('personaDescription', 'charDescription', 'charPersonality', 'dialogueExamples'):
            continue  # placed in the Oath
        add_marker(i, name, en)
        continue
    sym = OUTSYM[i]
    g = guard_of(i)
    buf = []
    for piece in sym + [('flush',)]:
        if isinstance(piece, tuple) and piece[0] in ('slot', 'flush'):
            if buf:
                if g == T:
                    emit_sym(name, buf, name, note=hint(i) or None, role=p.get('role', 'system'))
                else:
                    section_from_guard(name, buf, g, note=hint(i) or None, role=p.get('role', 'system'))
                buf = []
            if piece[0] == 'slot':
                live = [d for d in piece[2] if nonempty(d[1]) != F]
                excl = all(d[0][0] == 'v' and d[0][1][0] == 'eq' for d in live) and len({d[0][1][1] for d in live}) <= 1
                if len(live) > 1 and not excl:
                    # overlapping definers: one glue section with the full chain
                    from stmacro import chain_of
                    emit_sym(name, chain_of({piece[1]: piece[2]}, piece[1]), name)
                    continue
                if len(live) > 1 and excl:
                    texts = {render(d[1]) for d in live}
                    pv = live[0][0][1][1]
                    if len(texts) == 1 and {d[2] for d in live} == set(picks[pv]):
                        dname = clean(P[picks[pv][0]]['name']).split(':')[0].strip() + ' (any choice)'
                        add_section(dname, texts.pop().strip('\n') + '\n', condition='%s!=off' % pv,
                                    note='Shared text of every "%s" choice; picked in Choices.' % pv)
                        continue
                for dg, dsym, dpid in reversed(live):
                    dname = P[dpid].get('name') or dpid
                    if dpid in REQUIRED:
                        emit_sym(dname, dsym, dname)
                    else:
                        note = hint(dpid)
                        if dpid in toggle:
                            note = (note + ' ' if note else '') + '[On/off: Choices, "%s".]' % clean(dname)
                        elif dpid in pick_of:
                            note = (note + ' ' if note else '') + '[Picked in Choices, "%s".]' % pick_of[dpid]
                        section_from_guard(dname, dsym, dg, note=note or None, role=P[dpid].get('role', 'system'))
        else:
            buf.append(piece)
assert gstack == [None], gstack

# ------------------------------------------------------------------ 7. variables
variables = []
for v, ids in picks.items():
    first = P[ids[0]]['name']
    label = {'mind': "Sola's Mind", 'pov': 'Point of view', 'pronoun': "{{user}}'s pronouns", 'style': 'Author style',
             'length': 'Reply length', 'patch': 'Model patch', 'agency': 'User agency', 'antislop': 'Anti-slop',
             'names': 'Anti-name-slop', 'texture': 'Prose textures', 'softening': 'Softening / cruelty',
             'explicit_mode': 'Explicit mode', 'colors': 'Dialogue colors'}.get(v, clean(first))
    choices = []
    for i in ids:
        choices.append({'id': 'opt_' + hashlib.sha1((v + i).encode()).hexdigest()[:8], 'label': clean(P[i]['name']),
                        'value': pick_val[i], 'hint': hint(i)})
    on = [c for c, i in zip(choices, ids) if ENABLED0.get(i)]
    if v not in REQUIRED_PICK:
        off = {'id': 'opt_' + hashlib.sha1((v + 'off').encode()).hexdigest()[:8], 'label': 'Off', 'value': 'off',
               'hint': 'None of these.'}
        choices.append(off)
        default = on[0] if on else off
    else:
        default = on[0] if on else choices[0]
    variables.append({'id': 'var_' + v, 'name': v, 'label': label, 'type': 'choice', 'defaultValue': '',
                      'choices': choices, 'multi': False, 'separator': ', ',
                      'display': 'buttons' if len(choices) <= 4 else 'list', 'defaults': [default['id']]})
for i, en in ORDER:
    if i in toggle:
        variables.append({'id': 'var_' + toggle[i], 'name': toggle[i], 'label': clean(P[i]['name']), 'type': 'toggle',
                          'defaultValue': 'true' if ENABLED0.get(i) else 'false', 'question': hint(i)})

# ------------------------------------------------------------------ 8. utility prompts, studio, regexes
studio = copy.deepcopy(base['studio'])
up = dict(studio.get('utilityPrompts') or {})
if 'groupNudge' in up:
    up['groupNudge'] = up['groupNudge'].replace('The room holds more than the two of us: {{notChar}}.', 'The room holds more than the two of us.')
assert '{{notChar}}' not in json.dumps(up)
studio.update({
    'name': __import__('os').environ.get('SOLA_NAME', 'Sola V5 Flame (Vertep)'),
    'description': 'Sola V5 Flame by its original author, ported to Molfar Vertep. Trackers that the app already keeps '
                   '(Dashboard, World, Litopys) and display tags it cannot draw are left out; Story Movement, Notebook, '
                   'Marginalia and the Chatterbox stay, drawn by this preset\'s own regex scripts. Switch modules in Choices.',
    'sections': sections, 'groups': list(groups.values()), 'variables': variables, 'utilityPrompts': up,
    'library': [],
})
for k in ('id', 'createdAt', 'readOnly', 'isDefault', 'folderId'):
    studio.pop(k, None)

CSS = (".sola-hud,.sola-cb{margin:.9em 0 0;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:10px;padding:.35em .75em;font-size:.92em}"
       ".sola-hud>summary,.sola-cb>summary{cursor:pointer;opacity:.75;font-size:.9em;letter-spacing:.04em}"
       ".sola-sheet{margin:0 0 .9em;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:10px;padding:.3em .75em;font-size:.86em;opacity:.85}"
       ".sola-sheet>summary{cursor:pointer;opacity:.75;letter-spacing:.04em}"
       ".sola-hud-row{margin:.5em 0;white-space:pre-line}"
       ".sola-hud-tag{display:inline-block;font-size:.72em;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:0 .45em;margin-right:.4em;border-radius:6px;border:1px solid color-mix(in srgb,currentColor 30%,transparent);opacity:.85}"
       ".sola-cb-s,.sola-cb-u{margin:.4em 0;padding:.35em .7em;border-radius:12px;max-width:85%;width:fit-content;white-space:pre-line}"
       ".sola-cb-s{background:color-mix(in srgb,currentColor 8%,transparent)}"
       ".sola-cb-u{margin-left:auto;background:color-mix(in srgb,currentColor 15%,transparent)}"
       ".sola-fn{margin-top:.8em;padding-top:.4em;border-top:1px dashed color-mix(in srgb,currentColor 30%,transparent);font-size:.85em;opacity:.8;white-space:pre-line}"
       ".sola-im{text-decoration:underline dotted;text-underline-offset:3px;cursor:help}"
       ".sola-im-r{display:none;font-style:italic;opacity:.75}"
       ".sola-im:hover .sola-im-r,.sola-im:active .sola-im-r{display:inline}"
       ".sola-retract{opacity:.6}"
       # the app tints every quote (<q>) with the theme or a guessed speaker colour; the line's own colour wins
       ".sola-c,.sola-c q,.sola-c em,.sola-c i,.sola-c strong{color:var(--sola-c)!important}")

# dynamic styling: gradients, tones, motion. Colours mix with the text colour, so one set reads on dark and light themes
def mix(h, p=80):
    # the theme's text colour (gradient text has a transparent currentColor, so it cannot be the partner)
    return 'color-mix(in srgb,%s %d%%,var(--foreground,#888))' % (h, p)


GRAD = {'solstice': ('#F4A261', '#EE6C4D'), 'dusk': ('#F3B74B', '#8592E6'), 'hearth': ('#D08C5B', '#C9694B'),
        'eclipse': ('#5E6678', '#7A8B99'), 'wildwood': ('#9CAF88', '#4F8A6E'), 'mistveil': ('#B08EA2', '#A9B8C9')}
NAMED_HEX = {'marigold': '#F4A261', 'amber': '#F3B74B', 'cider': '#E9A036', 'coral': '#EE6C4D', 'honey': '#E5CC83',
             'rust': '#C28D79', 'ochre': '#BEB16B', 'moss': '#79A866', 'denim': '#7A8B99', 'indigo': '#8592E6',
             'heather': '#B08EA2', 'ash': '#BAC3C7', 'pine': '#789E8A', 'teal': '#70B4AE', 'periwinkle': '#AEA5D6',
             'amethyst': '#AD8CBF', 'crimson': '#EC718A', 'cerise': '#E773AC', 'orchid': '#C181DE', 'violet': '#AA8DF0',
             'sapphire': '#619ED9', 'ocean': '#60B9D0', 'emerald': '#53C18C', 'jade': '#63C5AD', 'sunflower': '#FFE052',
             'lemon': '#EFF579', 'magenta': '#F38DE4', 'cyan': '#68E1ED', 'turquoise': '#57DCC4', 'aquamarine': '#91ECD3',
             'mint': '#A5EDB9', 'lime': '#C7E96B', 'copper': '#C27C4E', 'slate': '#7C8C9C', 'mist': '#A9B8C9', 'steel': '#8A9BB0'}
assert set(NAMED_HEX) == set(NAMED.split('|'))
g_sel = ','.join('.sola-k-' + k for k in GRAD)
g_all = ','.join('.sola-k-%s *' % k for k in GRAD)
FX_CSS = ''.join('.sola-k-%s{background-image:linear-gradient(90deg,%s,%s)}' % (k, mix(a, 62), mix(b, 62)) for k, (a, b) in GRAD.items())
FX_CSS += (g_sel + '{-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent!important;'
           '-webkit-box-decoration-break:clone;box-decoration-break:clone}')
FX_CSS += g_all + '{-webkit-text-fill-color:transparent;color:transparent!important}'
FX_CSS += ''.join('.sola-n-%s{--sola-c:%s}' % (k, mix(h, 72)) for k, h in NAMED_HEX.items())
FX_CSS += (
    ".sola-k-whisper{font-style:italic;opacity:.85;letter-spacing:.02em;font-size:.95em}"
    ".sola-k-bite{font-weight:650}"
    ".sola-k-steady{font-weight:500;letter-spacing:.03em}"
    ".sola-k-trembling{display:inline-block;animation:sola-tremble .18s linear 6}"
    ".sola-k-heavy{font-weight:800;letter-spacing:.03em;text-shadow:0 .06em 0 color-mix(in srgb,currentColor 25%,transparent)}"
    ".sola-k-stretch{letter-spacing:.16em}"
    ".sola-k-tilt{display:inline-block;transform:rotate(calc(var(--tilt,4) * 1deg))}"
    ".sola-k-left{--tilt:-4}.sola-k-right{--tilt:4}"
    ".sola-k-crush{display:inline-block;font-weight:800;letter-spacing:-.02em;transform:scaleY(.88)}"
    ".sola-k-fracture{text-shadow:.06em 0 color-mix(in srgb,#ff4d6d 55%,transparent),-.06em 0 color-mix(in srgb,#4dd8ff 55%,transparent)}"
    ".sola-k-echo{text-shadow:.14em .1em 0 color-mix(in srgb,currentColor 28%,transparent),.28em .2em 0 color-mix(in srgb,currentColor 12%,transparent)}"
    ".sola-k-shake{display:inline-block;animation:sola-shake .4s ease-in-out 3}"
    ".sola-k-glitch{display:inline-block;animation:sola-glitch 2.2s steps(1) infinite}"
    ".sola-k-pulse,.sola-k-thump{display:inline-block;animation:sola-pulse 1.2s ease-in-out infinite}"
    ".sola-k-ember,.sola-k-breathe{animation:sola-ember 2.8s ease-in-out infinite}"
    ".sola-k-drift,.sola-k-float{display:inline-block;animation:sola-drift 3.6s ease-in-out infinite}"
    "@keyframes sola-tremble{0%,100%{transform:translate(0,0)}25%{transform:translate(.5px,-.5px)}50%{transform:translate(-.5px,.5px)}75%{transform:translate(.5px,.5px)}}"
    "@keyframes sola-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-2px) rotate(-1deg)}40%{transform:translateX(2px) rotate(1deg)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}"
    "@keyframes sola-glitch{0%,86%,100%{transform:none;text-shadow:none}88%{transform:translateX(2px);text-shadow:-2px 0 #ff4d6d,2px 0 #4dd8ff}92%{transform:translateX(-2px) skewX(8deg)}96%{transform:translateX(1px);opacity:.7}}"
    "@keyframes sola-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}"
    "@keyframes sola-ember{0%,100%{text-shadow:0 0 .2em color-mix(in srgb,#F3B74B 25%,transparent)}50%{text-shadow:0 0 .6em color-mix(in srgb,#F3B74B 70%,transparent)}}"
    "@keyframes sola-drift{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(-3px);opacity:.75}}"
    "@media (prefers-reduced-motion:reduce){.sola-fx{animation:none!important}}"
)
CSS += FX_CSS
FXBASE = '|'.join(list(GRAD) + ['whisper', 'bite', 'trembling', 'steady', 'heavy', 'stretch', 'tilt', 'crush', 'fracture',
                                'echo', 'shake', 'glitch', 'pulse', 'thump', 'ember', 'breathe', 'drift', 'float'])
FXMOD = 'whisper|bite|trembling|steady|heavy|stretch|tilt|crush|fracture|echo|shake|glitch|pulse|thump|ember|breathe|drift|float|left|right'
FX_FIND = r'/<(%s)(?::(%s))?(?::(-?\d{1,2}))?(?:\s+deg\s*=\s*"?(-?\d{1,2})"?)?\s*>([\s\S]*?)<\/\1(?::[^>]*)?>/gi' % (FXBASE, FXMOD)
NAMED_FIND = r'/<(%s)(?::(%s))?(?::(-?\d{1,2}))?\s*>([\s\S]*?)<\/\1(?::[^>]*)?>/gi' % (NAMED, FXMOD)
FX_STRIP = r'/<\/?(?:%s)(?::[^\s>]*)?(?:\s+deg\s*=\s*"?-?\d+"?)?\s*>/gi' % FXBASE
NAMED_STRIP = r'/<\/?(?:%s)(?::[^\s>]*)?\s*>/gi' % NAMED
for f in (FX_FIND, NAMED_FIND, FX_STRIP, NAMED_STRIP):
    assert len(f) - 2 < 500, len(f)


def rx(name, find, repl, display=True, min_depth=None):
    return {'scriptName': name, 'findRegex': find, 'replaceString': repl, 'trimStrings': [], 'placement': [2],
            'disabled': False, 'markdownOnly': display, 'promptOnly': not display, 'runOnEdit': False,
            'substituteRegex': 0, 'minDepth': min_depth, 'maxDepth': None}


# a Story Review / Lightning sheet written into the reply: up to 3 opener lines, ASK: ... ANCHORS: (+ OPEN/FOCUS/YIELD
# lines), an optional rule after it. Only at the start of a reply, first match only.
SHEET = (r"/^\s*((?:[^\n]{0,200}\n){0,3}?[ \t]*\**ASK\**:\**[\s\S]*?\n[ \t]*\**ANCHORS\**:\**[^\n]*"
         r"(?:\n[ \t]*\**(?:OPEN|FOCUS|YIELD)\**:[^\n]*)*)(?:\s*\n[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*(?=\n))?/")
assert len(SHEET) < 500

regex = [
    # display: our own HUD, chatterbox, footnote and hover tags (the saved text keeps the tags for the model)
    rx('Sola · CoT: sheet left in the reply (fold)', SHEET,
       '<details class="sola-sheet"><summary>📝 Sola\'s sheet</summary>\n\n$1\n\n</details>\n\n'),
    rx('Sola · HUD: Story Movement', r"/<tempo>\s*([A-Za-z]+)\s*(?:Sola'?s Note:\s*)?([\s\S]*?)\s*<\/tempo>/gi",
       '<div class="sola-hud-row"><span class="sola-hud-tag">$1</span>$2</div>'),
    rx('Sola · HUD: Notebook', r"/<story_notes>\s*([\s\S]*?)\s*<\/story_notes>/gi",
       '<div class="sola-hud-row"><span class="sola-hud-tag">Notebook</span>$1</div>'),
    rx('Sola · HUD: panel', r"/<sola_hud[^>]*>\s*([\s\S]*?)\s*<\/sola_hud>/gi",
       '<details class="sola-hud"><summary>☀ Sola\'s HUD</summary>$1</details>'),
    rx('Sola · Chatterbox: your texts', r"/<user_text[^>]*>\s*([\s\S]*?)\s*<\/user_text>/gi", '<div class="sola-cb-u">$1</div>'),
    rx('Sola · Chatterbox: her texts', r"/<sola_text[^>]*>\s*([\s\S]*?)\s*<\/sola_text>/gi", '<div class="sola-cb-s">$1</div>'),
    rx('Sola · Chatterbox: fold', r"/<chatterbox\b[^>]*>\s*([\s\S]*?)\s*<\/chatterbox>/gi",
       '<details class="sola-cb"><summary>💬 Sola</summary>$1</details>'),
    rx('Sola · Marginalia', r"/<sola_footnote>\s*([\s\S]*?)\s*<\/sola_footnote>/gi", '<div class="sola-fn">$1</div>'),
    rx('Sola · Interactive Mechanics: hovers',
       r'/<(subtext|tell|lore|translate|sense)\s+(?:thought|note|entry|meaning)\s*=\s*"([^"]*)"\s*>([\s\S]*?)<\/\1>/gi',
       '<span class="sola-im">$3<span class="sola-im-r"> ⟨$2⟩</span></span>'),
    rx('Sola · Interactive Mechanics: retract', r"/<retract>([\s\S]*?)<\/retract>/gi", '<s class="sola-retract">$1</s>'),
    rx('Sola · Color Version: dialogue colours',
       r"""/<font\s+color\s*=\s*["']?(#[0-9a-fA-F]{3,8})["']?\s*>([\s\S]*?)<\/font>/gi""",
       '<span class="sola-c" style="--sola-c:$1">$2</span>'),
    rx('Sola · Dynamic styling: gradients, tones, motion', FX_FIND,
       '<span class="sola-fx sola-k-$1 sola-k-$2" style="--tilt:$3$4">$5</span>'),
    rx('Sola · Dynamic styling: nested tags (second pass)', FX_FIND,
       '<span class="sola-fx sola-k-$1 sola-k-$2" style="--tilt:$3$4">$5</span>'),
    rx('Sola · Dynamic styling: named colours', NAMED_FIND,
       '<span class="sola-fx sola-c sola-n-$1 sola-k-$2" style="--tilt:$3">$4</span>'),
    rx('Sola · styles', r'/^([\s\S]*class="sola-[\s\S]*)$/', '$1\n\n<style>' + CSS + '</style>'),
    # prompt: old blocks leave the history (the newest stay, so the model keeps the format)
    rx('Sola · prompt: CoT sheet left in a reply', SHEET, '', display=False),
    # no depth limit: storyView (Dashboard sensor, Litopys) applies only these, so helpers never read Sola's asides as story
    rx('Sola · prompt and helpers: HUD', r"/<sola_hud[^>]*>[\s\S]*?<\/sola_hud>/gi", '', display=False),
    rx('Sola · prompt and helpers: chatterbox', r"/<chatterbox\b[^>]*>[\s\S]*?<\/chatterbox>/gi", '', display=False),
    rx('Sola · prompt and helpers: footnotes', r"/<sola_footnote>[\s\S]*?<\/sola_footnote>/gi", '', display=False),
    rx('Sola · prompt: old HTML objects', r"/<!-- HTML_START -->[\s\S]*?<!-- HTML_END -->/g",
       '[an in-world object was shown here as a card]', display=False, min_depth=4),
    rx('Sola · prompt: old colour tags', r"/<font\s+color\s*=[^>]*>([\s\S]*?)<\/font>/gi", '$1', display=False, min_depth=10),
    rx('Sola · prompt: old styling tags', FX_STRIP, '', display=False, min_depth=10),
    rx('Sola · prompt: old named colour tags', NAMED_STRIP, '', display=False, min_depth=10),
    rx('Sola · prompt: old hover tags', r'/<(subtext|tell|lore|translate|sense)\s+[^>]*>([\s\S]*?)<\/\1>/gi', '$2',
       display=False, min_depth=8),
]

if __import__('os').environ.get('SOLA_CUE'):
    _st = [k for k, r in enumerate(regex) if r['scriptName'] == 'Sola · styles'][0]
    regex.insert(_st, rx('Sola · Cue for the crew: fold', r"/<cue>\s*([\s\S]*?)\s*<\/cue>/gi",
                         '<details class="sola-hud sola-cue"><summary>🎬 Cue for the crew</summary><div class="sola-hud-row">$1</div></details>'))
    # minDepth 0: out of the writer's prompt at every depth; storyView skips depth-limited scripts, so the helpers keep it
    regex.append(rx('Sola · prompt only: cue (helpers keep it)', r"/<cue>[\s\S]*?<\/cue>/gi", '', display=False, min_depth=0))
out = {'name': studio['name'], 'studio': studio, 'extensions': {'regex_scripts': regex}}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# report
print('sections', len(sections), 'groups', [g['name'] for g in groups.values()])
print('choices', [(v['name'], len(v['choices'])) for v in variables if v['type'] == 'choice'])
print('toggles', len(toggle), sorted(toggle.values()))
json.dump({'ORDER': ORDER, 'toggle': toggle, 'pick_of': pick_of, 'pick_val': pick_val, 'REQUIRED': sorted(REQUIRED),
           'MARKERS': sorted(MARKERS), 'ENABLED0': ENABLED0, 'SECSRC': SECSRC, 'picks': picks},
          open(OUT + '.meta.json', 'w', encoding='utf-8'), ensure_ascii=False)
json.dump({i: P[i].get('content') or '' for i, _ in ORDER}, open(OUT + '.src.json', 'w', encoding='utf-8'), ensure_ascii=False)
