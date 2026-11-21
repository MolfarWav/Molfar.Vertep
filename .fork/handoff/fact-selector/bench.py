"""Fact selector bench (Molfar.Vertep#488).

Compares four ways of choosing which Litopys facts reach the reply prompt, on real checkpoints of real chats:
  A  every active fact (what Litopys sends today when they fit its budget)
  B  code only: pinned + a rank (weight, present people, recency), capped, worn-out facts dropped
  C  a model selector over every fact: now / hold / worn
  D  both: code prefilters to 20, the model picks, and the reply prompt gets one "do not bring up again" line
  E  B's facts plus one "worn out" line that names only the relics (facts echoed in 5 or 6 of the last 6 replies)
  G  A's facts, and the "worn out" line for the relics at the END of the request (after the history), not in the system part
  H  A's facts, and at the end a director's note instead: the relic has not moved; move it forward or leave it out
In C and D code also adds the facts the player's message names, as the design says.
Each variant's prompt goes to several writer models; a judge reads the replies blind.

The chats are the owner's workspace data: they are read from a local data folder and every output stays in --out.
Nothing of them belongs in this repository. Stages cache their model calls as files, so a rerun only pays for what
is missing.

  python bench.py --data <roleplay data folder> --out <folder> prepare --chats id1,id2 --per-chat 3
  python bench.py --data ... --out ... tag | select | write | judge | report
"""

import argparse
import concurrent.futures as cf
import hashlib
import json
import os
import random
import re
import subprocess
import sys
from pathlib import Path

ASK = Path(__file__).resolve().parents[3] / ".claude" / "skills" / "ask-model" / "scripts" / "ask.mjs"

WRITERS = {
    "small": ("nanogpt", "gemma-4-12b-it"),
    "mid": ("nanogpt", "mistralai/mistral-small-3.2-24b-instruct"),
    "large": ("nanogpt", "deepseek/deepseek-v4.1-flash"),
}
SELECTOR = ("nanogpt", "deepseek/deepseek-v4.1-flash")
TAGGER = ("nanogpt", "z-ai/glm-5.3")
JUDGE = ("nanogpt", "z-ai/glm-5.3")
VARIANTS = ["A", "B", "C", "D", "E", "G", "H"]

HISTORY = 8          # messages of chat history in the writer prompt
ECHO_WINDOW = 6      # assistant replies looked at for worn-out facts
WORN_MIN = 3         # a fact echoed in this many of them is worn out
RELIC_MIN = 5        # ... and in this many it is a relic (variant E names only these)
B_CAP = 12           # facts code keeps in variant B
D_PREFILTER = 20     # facts code hands the model in variant D
NOW_MAX = 8          # facts the model may pick as "now"
PARALLEL = 6

REMEMBERS = ("The characters remember it: it really happened to them, it shapes how they feel and act now, and a question "
             "about it gets a real answer. Let it show in what they do and say, not by retelling it; do not contradict it.")


# ---------- small helpers ----------

def jload(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def jsave(p, obj):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def est_tokens(text):
    return len(text) // 4


def msg_text(m):
    sw = m.get("swipes")
    if isinstance(sw, list) and sw and isinstance(m.get("swipe"), int) and 0 <= m["swipe"] < len(sw):
        s = sw[m["swipe"]]
        return s.get("text", "") if isinstance(s, dict) else str(s)
    return m.get("text", "")


def ask(provider, model, system, prompt, out_file, max_tokens=None, temperature=None):
    """One cached model call; returns the parsed --json answer."""
    if Path(out_file).exists():
        return jload(out_file)
    tmp = Path(out_file).with_suffix(".prompt.txt")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(prompt, encoding="utf-8")
    sys_file = Path(out_file).with_suffix(".system.txt")
    sys_file.write_text(system, encoding="utf-8")
    cmd = ["node", str(ASK), "-p", provider, "-m", model, "--no-fallback", "--json", "--timeout", "300",
           "--system-file", str(sys_file), "--prompt-file", str(tmp)]
    if max_tokens:
        cmd += ["--max-tokens", str(max_tokens)]
    if temperature is not None:
        cmd += ["-t", str(temperature)]
    for attempt in range(3):
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        if r.returncode == 0 and r.stdout.strip():
            try:
                res = json.loads(r.stdout)
                if str(res.get("text", "")).strip():
                    jsave(out_file, res)
                    tmp.unlink(missing_ok=True)
                    sys_file.unlink(missing_ok=True)
                    return res
            except json.JSONDecodeError:
                pass
        err = (r.stderr or "")[-300:]
    raise RuntimeError(f"{model}: {err}")


def parse_json_block(text):
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


# ---------- prepare: checkpoints from the chats ----------

def card_text(data, char_id, char_name, user_name):
    p = Path(data) / "characters" / char_id / "card.json"
    if not p.exists():
        return "", "", ""
    c = jload(p)
    d = c.get("data", c)
    def sub(s):
        return str(s or "").replace("{{char}}", char_name).replace("{{user}}", user_name)
    body = "\n\n".join(sub(d.get(k)) for k in ("description", "personality") if d.get(k))
    scen = sub(d.get("scenario"))
    sysp = sub(d.get("system_prompt"))
    post = sub(d.get("post_history_instructions"))
    return body + ("\n\n# Scenario\n" + scen if scen else ""), sysp, post


def facts_at(lit, at, idx_of, k):
    out = []
    for f in lit.get("facts", []):
        if not isinstance(f, dict) or not f.get("text"):
            continue
        if (f.get("at") or 0) > at:
            continue
        st = f.get("status", "active")
        if st != "active" and (f.get("updatedAt") or 0) <= at:
            continue
        if f.get("type") == "belief":
            continue
        src_to = (f.get("src") or {}).get("to")
        if src_to in idx_of and idx_of[src_to] >= k:
            continue
        out.append({k2: f.get(k2) for k2 in ("id", "text", "subject", "knownBy", "type", "weight", "pinned", "secret", "also")}
                   | {"srcIdx": idx_of.get(src_to, -1)})
    return out


def chapters_before(lit, idx_of, upto):
    out = []
    for c in lit.get("chapters", []):
        to = idx_of.get(c.get("to"), 10**9)
        if to < upto:
            out.append({"id": c.get("id"), "label": c.get("label", ""), "text": c.get("text", ""), "toIdx": to})
    return sorted(out, key=lambda c: c["toIdx"])


def prepare(a):
    data, out = Path(a.data), Path(a.out)
    cps = []
    for cid in a.chats.split(","):
        msgs = [json.loads(l) for l in open(data / "chats" / f"{cid}.jsonl", encoding="utf-8") if l.strip()]
        lit = jload(data / "litopys" / "chats" / f"{cid}.json")
        idx_of = {m["id"]: i for i, m in enumerate(msgs)}
        char = next(m for m in msgs if m.get("role") != "user")
        user = next(m for m in msgs if m.get("role") == "user")
        char_name, user_name, char_id = char.get("name", "Character"), user.get("name", "User"), char.get("charId", "")
        card, sysp, post = card_text(data, char_id, char_name, user_name)
        users = [i for i, m in enumerate(msgs) if m.get("role") == "user" and i >= HISTORY + 4 and i + 1 < len(msgs)]
        if not users:
            continue
        picks = sorted({users[int(round(q * (len(users) - 1)))] for q in [(j + 1) / a.per_chat for j in range(a.per_chat)]})
        for k in picks:
            at = msgs[k].get("at") or 0
            facts = facts_at(lit, at, idx_of, k)
            if len(facts) < 8:
                continue
            hist = [{"i": i, "role": msgs[i].get("role"), "name": msgs[i].get("name"), "text": msg_text(msgs[i])}
                    for i in range(max(0, k - HISTORY + 1), k + 1)]
            echo = [{"i": i, "text": msg_text(msgs[i])} for i in range(k - 1, 0, -1) if msgs[i].get("role") != "user"][:ECHO_WINDOW]
            cps.append({"id": f"{cid}@{k}", "chat": cid, "k": k, "char": char_name, "user": user_name,
                        "card": card, "system": sysp, "post": post, "facts": facts,
                        "chapters": chapters_before(lit, idx_of, k - HISTORY + 1), "history": hist, "echo": echo,
                        "realReply": msg_text(msgs[k + 1])})
    jsave(out / "checkpoints.json", cps)
    for c in cps:
        print(c["id"], "facts", len(c["facts"]), "chapters", len(c["chapters"]))


# ---------- tag: which facts the recent replies and the player's message echo ----------

TAG_SYSTEM = ("You map story text to a numbered list of facts. A fact is referenced when the text mentions the specific thing "
              "it is about (an object, an amount, a person's specific circumstance, a place detail), in any language. A general "
              "mood is not a reference. Answer with JSON only.")


def tag(a):
    out = Path(a.out)
    cps = jload(out / "checkpoints.json")
    def one(c):
        facts = "\n".join(f"{f['id']}: {f['text']}" for f in c["facts"])
        texts = [("user", c["history"][-1]["text"])] + [(f"r{j}", e["text"]) for j, e in enumerate(c["echo"])]
        body = "\n\n".join(f"<text id=\"{tid}\">\n{t}\n</text>" for tid, t in texts)
        prompt = (f"Facts:\n{facts}\n\nTexts:\n{body}\n\nFor each text id, list the fact ids it references. "
                  'Answer: {"<text id>": ["f12", ...], ...}')
        res = ask(*TAGGER, TAG_SYSTEM, prompt, out / "calls" / "tag" / f"{key(c['id'])}.json", max_tokens=4000, temperature=0)
        tags = parse_json_block(res["text"]) or {}
        count = {}
        for j in range(len(c["echo"])):
            for fid in set(tags.get(f"r{j}", [])):
                count[fid] = count.get(fid, 0) + 1
        return c["id"], {"needed": sorted(set(tags.get("user", []))), "echoCount": count,
                         "worn": sorted(f for f, n in count.items() if n >= WORN_MIN)}
    res = dict(run_all(one, cps))
    jsave(out / "tags.json", res)
    for cid, t in res.items():
        print(cid, "worn", t["worn"], "needed", t["needed"])


# ---------- select: the four inserts ----------

def code_rank(c, worn, needed):
    present = {c["char"].lower(), c["user"].lower()}
    hist_text = " ".join(h["text"] for h in c["history"][-3:]).lower()
    def score(f):
        s = 0.0
        if f.get("pinned"):
            s += 100
        if f.get("weight") == "key":
            s += 6
        subj = str(f.get("subject") or "").lower()
        if subj and (subj in present or subj.split(" ")[0] in hist_text):
            s += 4
        s += 3 * (f.get("srcIdx", 0) / max(1, c["k"]))
        if f["id"] in worn and f["id"] not in needed:
            s -= 50
        if f["id"] in needed:
            s += 20
        return s
    return sorted(c["facts"], key=score, reverse=True)


SEL_SYSTEM = (
    "You prepare the memory for the next reply of a roleplay. From the facts the story has gathered, choose what this "
    "scene needs, so the writer is not flooded with every fact on every turn and does not keep repeating the same details. "
    "Rules: pick 'now' only for facts that matter to what happens right now or to what the player just said (at most "
    f"{NOW_MAX}); put in 'hold' secrets that should not surface yet; put in 'worn' facts whose details the recent replies "
    "keep repeating and that this scene does not need. Never change who knows what. Answer with JSON only: "
    '{"now": ["f1", ...], "hold": ["f2", ...], "worn": ["f3", ...], "why": "one short line"}')


def select(a):
    out = Path(a.out)
    cps, tags = jload(out / "checkpoints.json"), jload(out / "tags.json")
    def one(c):
        t = tags[c["id"]]
        worn, needed = set(t["worn"]), set(t["needed"])
        ranked = code_rank(c, worn, needed)
        by_id = {f["id"]: f for f in c["facts"]}
        pinned = [f["id"] for f in c["facts"] if f.get("pinned")]
        res = {"A": {"facts": [f["id"] for f in c["facts"]]}}
        b = [f["id"] for f in ranked if not (f["id"] in worn and f["id"] not in needed)][:B_CAP]
        res["B"] = {"facts": b}
        scene = "\n\n".join(f"[{h['name']}]: {h['text'][-1500:]}" for h in c["history"][-3:])
        echo = ", ".join(f"{fid} ({n} of {len(c['echo'])})" for fid, n in sorted(t["echoCount"].items(), key=lambda x: -x[1])) or "none"
        for v, pool in (("C", c["facts"]), ("D", ranked[:D_PREFILTER])):
            facts = "\n".join(f"{f['id']}: {f['text']}" + (" (kept secret)" if f.get("secret") else "") for f in pool)
            prompt = (f"Facts:\n{facts}\n\nHow often each fact was echoed in the last replies: {echo}\n\n"
                      f"The scene so far (last messages):\n{scene}\n\nChoose.")
            r = ask(*SELECTOR, SEL_SYSTEM, prompt, out / "calls" / "select" / f"{key(c['id'])}-{v}.json", max_tokens=3000, temperature=0)
            j = parse_json_block(r["text"]) or {}
            now = [x for x in j.get("now", []) if x in by_id][:NOW_MAX]
            chosen = list(dict.fromkeys(pinned + now + [x for x in t["needed"] if x in by_id]))
            # a model may name one id in two lists: what goes into the prompt wins, so "worn" and "hold" never
            # contradict the insert (the design keeps the same rule in code)
            res[v] = {"facts": chosen, "hold": [x for x in j.get("hold", []) if x in by_id and x not in chosen],
                      "worn": [x for x in j.get("worn", []) if x in by_id and x not in chosen], "why": j.get("why", ""),
                      "failed": not j, "overlap": sorted(set(chosen) & set(j.get("worn", []) + j.get("hold", []))),
                      "usage": r.get("usage", {})}
        relics = [f for f, n in t["echoCount"].items() if n >= RELIC_MIN and f in by_id and f not in needed]
        res["E"] = {"facts": b, "worn": relics}
        res["G"] = {"facts": res["A"]["facts"], "tail": relics}
        res["H"] = {"facts": res["A"]["facts"], "tail": relics}
        return c["id"], res
    res = dict(run_all(one, cps))
    jsave(out / "selections.json", res)
    for cid, r in res.items():
        print(cid, {v: len(r[v]["facts"]) for v in VARIANTS})


def memory_insert(c, sel, v):
    by_id = {f["id"]: f for f in c["facts"]}
    def line(f):
        tail = []
        if f.get("knownBy"):
            tail.append("known to: " + ", ".join(f["knownBy"]))
        if f.get("secret") and f.get("knownBy"):
            tail.append("kept secret")
        return "- " + f["text"] + (" (" + "; ".join(tail) + ")" if tail else "")
    parts = []
    if c["chapters"]:
        parts.append("[Story record (Litopys): the story so far, up to the messages below. " + REMEMBERS + "]\n"
                     + "\n".join("- " + (ch["label"] + ": " if ch["label"] else "") + ch["text"] for ch in c["chapters"]))
    ids = sel[v]["facts"]
    if ids:
        parts.append("[Story record (Litopys): what stays true. " + REMEMBERS + "]\nFacts:\n" + "\n".join(line(by_id[i]) for i in ids))
    if v in ("D", "E") and sel[v].get("worn"):
        motifs = "; ".join(by_id[i]["text"][:90] for i in sel[v]["worn"])
        parts.append("[Worn out: the recent replies keep returning to these. Do not bring them up again unless this scene "
                     "really needs them: " + motifs + "]")
    return "\n\n".join(parts)


# ---------- write: the replies ----------

def tail_note(c, sel, v):
    """G and H: one out-of-character note after the history, about the relics."""
    ids = sel[v].get("tail") or []
    if v not in ("G", "H") or not ids:
        return ""
    by_id = {f["id"]: f for f in c["facts"]}
    motifs = "; ".join(by_id[i]["text"][:90] for i in ids)
    if v == "G":
        return ("[Out of character, for this reply only: the recent replies keep returning to these. Do not bring them up "
                "again in this reply unless the scene really needs them: " + motifs + "]")
    return ("[Out of character, for this reply only: these have come up in nearly every recent reply without anything "
            "changing. In this reply either move one of them forward with something concrete and new, or leave them out "
            "entirely: " + motifs + "]")


def writer_prompt(c, insert, tail=""):
    system = (f"You are the narrator and {c['char']} in a roleplay with {c['user']}. Write the next reply only: "
              f"{c['char']}'s and the world's part. Never write {c['user']}'s words, actions or thoughts. "
              "Write in the language of the chat's last messages.")
    if c["system"]:
        system += "\n\n" + c["system"]
    system += "\n\n# Character\n" + c["card"]
    if insert:
        system += "\n\n" + insert
    if c["post"]:
        system += "\n\n" + c["post"]
    hist = "\n\n".join(f"[{h['name']}]: {h['text']}" for h in c["history"])
    prompt = f"The chat so far (oldest first):\n\n{hist}\n\n" + (tail + "\n\n" if tail else "") + f"Write {c['char']}'s next reply to {c['user']}'s last message."
    return system, prompt


def write(a):
    out = Path(a.out)
    cps, sels = jload(out / "checkpoints.json"), jload(out / "selections.json")
    jobs = [(c, v, w) for c in cps for v in VARIANTS for w in WRITERS]
    def one(job):
        c, v, w = job
        system, prompt = writer_prompt(c, memory_insert(c, sels[c["id"]], v), tail_note(c, sels[c["id"]], v))
        r = ask(*WRITERS[w], system, prompt, out / "calls" / "write" / f"{key(c['id'])}-{w}-{v}.json", max_tokens=1600, temperature=0.8)
        return f"{c['id']}|{w}|{v}", {"text": r["text"], "usage": r.get("usage", {}), "insertTokens": est_tokens(memory_insert(c, sels[c["id"]], v))}
    res = dict(run_all(one, jobs))
    jsave(out / "replies.json", res)
    print(len(res), "replies")


# ---------- judge: blind, one call per checkpoint and writer ----------

JUDGE_SYSTEM = (
    "You judge roleplay replies blind. You get the scene, the facts that are true in the story, the facts the recent "
    "replies already kept repeating ('worn'), and several candidate replies to the same message in random order. For each "
    "candidate report: echoes (ids of worn facts whose specific details reappear), contradictions (short notes on anything "
    "that contradicts a fact or the scene), and scores 1-10: fit (follows the scene and the player's message), fresh "
    "(moves the story, does not rehash), character (in character, consistent with the facts). Answer with JSON only: "
    '{"R1": {"echoes": [], "contradictions": [], "fit": 0, "fresh": 0, "character": 0}, ...}')


def judge(a):
    out = Path(a.out)
    cps, tags, reps = jload(out / "checkpoints.json"), jload(out / "tags.json"), jload(out / "replies.json")
    jobs = [(c, w) for c in cps for w in WRITERS]
    def one(job):
        c, w = job
        order = VARIANTS[:]
        random.Random(c["id"] + w).shuffle(order)
        by_id = {f["id"]: f for f in c["facts"]}
        facts = "\n".join(f"{f['id']}: {f['text']}" for f in c["facts"])
        worn = "\n".join(f"{i}: {by_id[i]['text']}" for i in tags[c["id"]]["worn"] if i in by_id) or "none"
        scene = "\n\n".join(f"[{h['name']}]: {h['text'][-2000:]}" for h in c["history"][-3:])
        cands = "\n\n".join(f"<candidate id=\"R{j + 1}\">\n{reps[c['id'] + '|' + w + '|' + v]['text']}\n</candidate>" for j, v in enumerate(order))
        prompt = f"Facts:\n{facts}\n\nWorn facts:\n{worn}\n\nScene (last messages):\n{scene}\n\nCandidates:\n{cands}"
        r = ask(*JUDGE, JUDGE_SYSTEM, prompt, out / "calls" / "judge" / f"{key(c['id'])}-{w}.json", max_tokens=5000, temperature=0)
        j = parse_json_block(r["text"]) or {}
        return f"{c['id']}|{w}", {v: j.get(f"R{n + 1}", {}) for n, v in enumerate(order)}
    res = dict(run_all(one, jobs))
    jsave(out / "judgements.json", res)
    print(len(res), "judgements")


# ---------- echo: the tagger, not the judge, counts which facts each reply touches ----------
# The judge's echo counts moved by 2x between runs on the same replies (it reads 4 to 7 long candidates at once and notices
# fewer). The tagger is the instrument that defined the relics in the history, so it counts them in the replies too:
# shuffled ids, temperature 0, two passes with a different order to see its own noise.

def echo(a):
    out = Path(a.out)
    cps, reps = jload(out / "checkpoints.json"), jload(out / "replies.json")
    jobs = [(c, w, p) for c in cps for w in WRITERS for p in (1, 2)]
    def one(job):
        c, w, p = job
        order = VARIANTS[:]
        random.Random(f"{c['id']}{w}{p}").shuffle(order)
        facts = "\n".join(f"{f['id']}: {f['text']}" for f in c["facts"])
        body = "\n\n".join(f"<text id=\"t{j + 1}\">\n{reps[c['id'] + '|' + w + '|' + v]['text']}\n</text>" for j, v in enumerate(order))
        prompt = (f"Facts:\n{facts}\n\nTexts:\n{body}\n\nFor each text id, list the fact ids it references. "
                  'Answer: {"<text id>": ["f12", ...], ...}')
        r = ask(*TAGGER, TAG_SYSTEM, prompt, out / "calls" / "echo" / f"{key(c['id'])}-{w}-{p}.json", max_tokens=6000, temperature=0)
        j = parse_json_block(r["text"]) or {}
        return f"{c['id']}|{w}|{p}", {v: sorted(set(j.get(f"t{n + 1}", []))) for n, v in enumerate(order)}
    res = dict(run_all(one, jobs))
    jsave(out / "echoes.json", res)
    tags = jload(out / "tags.json")
    for p in (1, 2):
        tot = {}
        for c in cps:
            relics = {f for f, n in tags[c["id"]]["echoCount"].items() if n >= RELIC_MIN}
            for w in WRITERS:
                got = res.get(f"{c['id']}|{w}|{p}", {})
                for v in VARIANTS:
                    x = tot.setdefault((w, v), [0, 0])
                    x[0] += len(set(got.get(v, [])) & relics)
                    x[1] += len(relics)
        print(f"pass {p}:", " ".join(f"{w}/{v} {x[0]}/{x[1]}" for (w, v), x in sorted(tot.items())))


# ---------- report ----------

def report(a):
    out = Path(a.out)
    cps, tags, sels = jload(out / "checkpoints.json"), jload(out / "tags.json"), jload(out / "selections.json")
    reps, jud = jload(out / "replies.json"), jload(out / "judgements.json")
    rows = {}
    for c in cps:
        t = tags[c["id"]]
        for w in WRITERS:
            jj = jud.get(f"{c['id']}|{w}", {})
            for v in VARIANTS:
                r = rows.setdefault((w, v), {"n": 0, "insert": 0, "echo": 0, "relic": 0, "relics": 0, "contra": 0, "fit": 0, "fresh": 0, "char": 0, "lost": 0, "needed": 0, "len": 0})
                relics = {f for f, n in t["echoCount"].items() if n >= RELIC_MIN}
                r["relic"] += len(set(g.get("echoes", [])) & relics) if (g := jj.get(v, {})) else 0
                r["relics"] += len(relics)
                rep = reps[f"{c['id']}|{w}|{v}"]
                g = jj.get(v, {})
                r["n"] += 1
                r["insert"] += rep["insertTokens"]
                r["len"] += len(rep["text"])
                r["echo"] += len(set(g.get("echoes", [])))
                r["contra"] += len(g.get("contradictions", []))
                r["fit"] += g.get("fit", 0) or 0
                r["fresh"] += g.get("fresh", 0) or 0
                r["char"] += g.get("character", 0) or 0
                needed = set(t["needed"])
                r["needed"] += len(needed)
                r["lost"] += len(needed - set(sels[c["id"]][v]["facts"]))
    lines = ["| writer | variant | n | insert tok | reply chars | worn echoes | relic echoes | contradictions | needed lost | fit | fresh | character |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for (w, v), r in sorted(rows.items()):
        n = r["n"] or 1
        lines.append(f"| {w} | {v} | {r['n']} | {r['insert'] // n} | {r['len'] // n} | {r['echo'] / n:.2f} | {r['relic']}/{r['relics']} | {r['contra'] / n:.2f} | "
                     f"{r['lost']}/{r['needed']} | {r['fit'] / n:.1f} | {r['fresh'] / n:.1f} | {r['char'] / n:.1f} |")
    calls = sum(1 for _ in (out / "calls").rglob("*.json"))
    text = "\n".join(lines) + f"\n\nCheckpoints: {len(cps)}. Model calls cached: {calls}.\n"
    (out / "report.md").write_text(text, encoding="utf-8")
    print(text)


# ---------- plumbing ----------

def key(s):
    return re.sub(r"[^A-Za-z0-9_-]", "_", s)


def run_all(fn, items):
    results, errors = [], []
    with cf.ThreadPoolExecutor(PARALLEL) as ex:
        futs = {ex.submit(fn, it): it for it in items}
        for f in cf.as_completed(futs):
            try:
                results.append(f.result())
            except Exception as e:  # keep going: a rerun picks up what failed
                errors.append(str(e)[:200])
    for e in errors:
        print("FAILED:", e, file=sys.stderr)
    if errors:
        print(f"{len(errors)} calls failed; rerun this stage", file=sys.stderr)
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    sp = ap.add_subparsers(dest="stage", required=True)
    p = sp.add_parser("prepare")
    p.add_argument("--chats", required=True)
    p.add_argument("--per-chat", type=int, default=3)
    for s in ("tag", "select", "write", "judge", "echo", "report"):
        sp.add_parser(s)
    a = ap.parse_args()
    {"prepare": prepare, "tag": tag, "select": select, "write": write, "judge": judge, "echo": echo, "report": report}[a.stage](a)


if __name__ == "__main__":
    main()
