"""Compare ST-semantics reference output with the Vertep engine's rendering of the ported preset
for random module/choice configurations.  python -I verify.py sola_vertep.json N"""
import json
import random
import re
import subprocess
import sys

sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
import stmacro
from stmacro import ev, parse, prep
FEATS = ['litopys', 'memories', 'castknowledge', 'hiddenplan', 'dashboard', 'world', 'worldnews', 'dice', 'life', 'authornote']

OUT = sys.argv[1]
N = int(sys.argv[2]) if len(sys.argv) > 2 else 40
meta = json.load(open(OUT + '.meta.json', encoding='utf-8'))
srcs = json.load(open(OUT + '.src.json', encoding='utf-8'))
preset = json.load(open(OUT, encoding='utf-8'))
ORDER, toggle, pick_of, pick_val = meta['ORDER'], meta['toggle'], meta['pick_of'], meta['pick_val']
REQUIRED, MARKERS, ENABLED0, SECSRC, picks = set(meta['REQUIRED']), set(meta['MARKERS']), meta['ENABLED0'], meta['SECSRC'], meta['picks']
CARD = {'personaDescription', 'charDescription', 'charPersonality', 'dialogueExamples'}
var_by_name = {v['name']: v for v in preset['studio']['variables']}


def reference(cfg):
    stmacro.FEATURES = {'vertep.' + k: x for k, x in cfg['feat'].items()}
    env, out = {}, []
    for i, _ in ORDER:
        if i in MARKERS:
            if i in CARD:
                continue
            out.append('[[M:%s]]' % i)
            continue
        on = True if i in REQUIRED else cfg['on'][i]
        if not on:
            continue
        t = ev(parse(prep(srcs[i])), env)
        t = t.replace('@@CARD@@', '[[CARD]]')
        t = re.sub(r'@@[A-Z]+(?::\w+)?@@', '', t)
        out.append(t)
    return '\n'.join(out)


def norm(s):
    s = re.sub(r'(\[\[CARD\]\]\s*)+', '[[CARD]] ', s)
    return re.sub(r'\s+', ' ', s).strip()


rng = random.Random(7)
cfgs = []
for k in range(N):
    on, stored, secon = {}, {}, {}
    for v, ids in picks.items():
        opts = list(ids) + ([] if v in ('mind', 'pov') else [None])
        if k == 0:
            choice = next((i for i in ids if ENABLED0.get(i)), None if v not in ('mind', 'pov') else ids[0])
        else:
            choice = rng.choice(opts)
        for i in ids:
            on[i] = (i == choice)
        var = var_by_name[v]
        want = pick_val[choice] if choice else 'off'
        stored[v] = [c['id'] for c in var['choices'] if c['value'] == want][0]
    for i, _ in ORDER:
        if i in pick_of or i in REQUIRED or i in MARKERS:
            continue
        val = ENABLED0.get(i, False) if k == 0 else (rng.random() < 0.5)
        on[i] = val
        if i in toggle:
            stored[toggle[i]] = 'true' if val else 'false'
    feat = {f: (True if k == 0 else rng.random() < 0.6) for f in FEATS}
    cfgs.append({'on': on, 'stored': stored, 'secon': {s: on[p] for s, p in SECSRC.items()}, 'feat': feat})

json.dump(cfgs, open('cfgs.json', 'w', encoding='utf-8'))
res = subprocess.run(['bun', 'vsim.mjs', OUT, 'cfgs.json', 'sim_out.json'], capture_output=True, text=True, encoding='utf-8')
if res.returncode:
    print(res.stdout, res.stderr); sys.exit(1)
sims = json.load(open('sim_out.json', encoding='utf-8'))
bad = 0
for k, (cfg, sim) in enumerate(zip(cfgs, sims)):
    r, s = norm(reference(cfg)), norm(sim['text'])
    if r != s:
        bad += 1
        if bad <= 2:
            # first difference
            j = next((x for x in range(min(len(r), len(s))) if r[x] != s[x]), min(len(r), len(s)))
            print('CONFIG', k, 'differs at', j)
            print('  REF:', r[max(0, j - 200):j + 300])
            print('  SIM:', s[max(0, j - 200):j + 300])
    if '{{#if' in sim['text'] or '{{/if' in sim['text'] or '{{else' in sim['text'] or '@@' in sim['text']:
        print('CONFIG', k, 'leftover if/marker')
print('configs', N, 'mismatches', bad)
print('default config tokens ~', len(sims[0]['text']) // 4, ' chars', len(sims[0]['text']))
open('default_prompt.txt', 'w', encoding='utf-8').write(sims[0]['text'])
open('default_reference.txt', 'w', encoding='utf-8').write(reference(cfgs[0]))
