"""SillyTavern macro parsing, a concrete reference evaluator, and a symbolic
compiler to Molfar Vertep sections ({{#if}} with toggle/choice conditions)."""
import re

# ---------------------------------------------------------------- parsing

def prep(s):
    s = re.sub(r'\{\{//[\s\S]*?\}\}', '', s)
    s = re.sub(r'(?:\r?\n)*\{\{trim\}\}(?:\r?\n)*', '', s)
    return s


def tokens(s):
    i, out = 0, []
    while i < len(s):
        j = s.find('{{', i)
        if j < 0:
            out.append(('t', s[i:]))
            break
        if j > i:
            out.append(('t', s[i:j]))
        depth, k = 0, j
        while k < len(s):
            if s.startswith('{{', k):
                depth += 1
                k += 2
            elif s.startswith('}}', k):
                depth -= 1
                k += 2
                if depth == 0:
                    break
            else:
                k += 1
        if depth != 0:
            raise ValueError('unbalanced braces near: ' + s[j:j + 80])
        out.append(('m', s[j + 2:k - 2]))
        i = k
    return out


def split_top(s, sep='::'):
    parts, depth, cur, i = [], 0, '', 0
    while i < len(s):
        if s.startswith('{{', i):
            depth += 1; cur += '{{'; i += 2; continue
        if s.startswith('}}', i):
            depth -= 1; cur += '}}'; i += 2; continue
        if depth == 0 and s.startswith(sep, i):
            parts.append(cur); cur = ''; i += len(sep); continue
        cur += s[i]; i += 1
    parts.append(cur)
    return parts


def parse(s):
    toks = tokens(s)
    pos = [0]

    def block(stops):
        nodes = []
        while pos[0] < len(toks):
            kind, v = toks[pos[0]]
            if kind == 't':
                nodes.append(('text', v)); pos[0] += 1; continue
            inner = v.strip()
            low = inner.lower()
            if low in stops:
                return nodes, low
            pos[0] += 1
            if low.startswith('#if'):
                cond = inner[3:]
                cond = cond[2:] if cond.startswith('::') else cond
                cond = cond.strip()
                neg = cond.startswith('!')
                if neg:
                    cond = cond[1:].strip()
                then, stop = block(('else', '/if'))
                els = []
                if stop == 'else':
                    pos[0] += 1
                    els, stop = block(('/if',))
                if stop != '/if':
                    raise ValueError('unclosed #if: ' + cond[:60])
                pos[0] += 1
                if re.fullmatch(r'vertep\.\w+', cond):
                    nodes.append(('iff', cond, neg, then, els))  # an app feature flag: decided by the engine
                else:
                    nodes.append(('if', parse(cond), neg, then, els))
            elif low.startswith('#setvar::'):
                name = inner[9:].strip()
                body, stop = block(('/setvar',))
                if stop != '/setvar':
                    raise ValueError('unclosed #setvar ' + name)
                pos[0] += 1
                nodes.append(('set', name, body))
            elif low.startswith('setvar::'):
                rest = inner[8:]
                parts = split_top(rest)
                name, val = parts[0].strip(), '::'.join(parts[1:])
                nodes.append(('set', name, parse(val)))
            elif low.startswith('getvar::'):
                nodes.append(('get', inner[8:].strip()))
            elif low in ('/if', 'else', '/setvar'):
                raise ValueError('stray ' + low)
            else:
                if '{{' in inner:
                    raise ValueError('nested macro in passthrough: ' + inner[:80])
                nodes.append(('raw', v))
        return nodes, None

    nodes, stop = block(())
    return nodes

# ---------------------------------------------------------------- reference (ST semantics, concrete)

FALSY = {'', 'false', '0', 'off', 'no'}
FEATURES = {}  # reference run: app feature flags (vertep.<name>) -> bool


def ev(nodes, env):
    out = []
    for n in nodes:
        k = n[0]
        if k == 'text':
            out.append(n[1])
        elif k == 'get':
            out.append(env.get(n[1], ''))
        elif k == 'set':
            env[n[1]] = ev(n[2], env)
        elif k == 'iff':
            t = bool(FEATURES.get(n[1], False)) != bool(n[2])
            out.append(ev(n[3] if t else n[4], env))
        elif k == 'if':
            c = ev(n[1], env).strip()
            t = c.lower() not in FALSY
            if n[2]:
                t = not t
            out.append(ev(n[3] if t else n[4], env))
        elif k == 'raw':
            out.append('{{' + n[1] + '}}')
    return ''.join(out)

# ---------------------------------------------------------------- boolean formulas

T, F = ('T',), ('F',)


def atom(a):
    return ('v', a)


def NOT(f):
    if f == T: return F
    if f == F: return T
    if f[0] == 'not': return f[1]
    return ('not', f)


def _eqinfo(f):
    if f[0] == 'v' and f[1][0] == 'eq':
        return f[1][1], f[1][2], True
    if f[0] == 'not' and f[1][0] == 'v' and f[1][1][0] == 'eq':
        return f[1][1][1], f[1][1][2], False
    return None


def AND(*fs):
    items = []
    for f in fs:
        if f[0] == 'and': items.extend(f[1])
        else: items.append(f)
    out = []
    for f in items:
        if f == F: return F
        if f == T: continue
        if f not in out: out.append(f)
    for f in out:
        if NOT(f) in out: return F
    # choice exclusivity
    pos = {}
    for f in out:
        e = _eqinfo(f)
        if e and e[2]:
            if e[0] in pos and pos[e[0]] != e[1]: return F
            pos[e[0]] = e[1]
    out2 = []
    for f in out:
        e = _eqinfo(f)
        if e and not e[2] and e[0] in pos:
            if pos[e[0]] == e[1]: return F
            continue  # implied
        out2.append(f)
    out = out2
    # absorption: a & (a | b) -> a
    out = [f for f in out if not (f[0] == 'or' and any(g in out for g in f[1]))]
    if not out: return T
    if len(out) == 1: return out[0]
    return ('and', out)


def OR(*fs):
    items = []
    for f in fs:
        if f[0] == 'or': items.extend(f[1])
        else: items.append(f)
    out = []
    for f in items:
        if f == T: return T
        if f == F: continue
        if f not in out: out.append(f)
    for f in out:
        if NOT(f) in out: return T
    # absorption: a | (a & b) -> a
    def absorbed(f):
        if f[0] != 'and': return False
        return any(g in out for g in f[1])
    out = [f for f in out if not absorbed(f)]
    # a | (!a & b) -> a | b
    changed = True
    while changed:
        changed = False
        for i, f in enumerate(out):
            if f[0] == 'and':
                rest = [g for g in f[1] if NOT(g) not in out]
                if len(rest) != len(f[1]):
                    out[i] = AND(*rest)
                    changed = True
        if changed:
            return OR(*out)
    if not out: return F
    if len(out) == 1: return out[0]
    return ('or', out)


def atoms_of(f, acc=None):
    acc = set() if acc is None else acc
    if f[0] == 'v': acc.add(f[1])
    elif f[0] == 'not': atoms_of(f[1], acc)
    elif f[0] in ('and', 'or'):
        for g in f[1]: atoms_of(g, acc)
    return acc


def evalf(f, assign):
    k = f[0]
    if k == 'T': return True
    if k == 'F': return False
    if k == 'v': return assign(f[1])
    if k == 'not': return not evalf(f[1], assign)
    if k == 'and': return all(evalf(g, assign) for g in f[1])
    return any(evalf(g, assign) for g in f[1])


def render_cond(f, top=True):
    k = f[0]
    if k == 'v':
        a = f[1]
        if a[0] in ('tog', 'feat'): return a[1]
        if a[0] == 'eq': return '%s == "%s"' % (a[1], a[2])
        raise ValueError('unrenderable atom %r' % (a,))
    if k == 'not':
        inner = render_cond(f[1], False)
        if f[1][0] == 'v' and f[1][1][0] == 'eq':
            a = f[1][1]
            return '%s != "%s"' % (a[1], a[2])
        if f[1][0] == 'v':
            return '!' + inner
        return '!(' + render_cond(f[1], True) + ')'
    if k in ('and', 'or'):
        op = ' && ' if k == 'and' else ' || '
        s = op.join(render_cond(g, False) for g in f[1])
        return s if top else '(' + s + ')'
    if k == 'T': return 'true'
    raise ValueError('render F')

# ---------------------------------------------------------------- symbolic evaluation
# sym text: list of pieces: str | ('raw', inner) | ('chain', [(g, sym), ...] newest first) | ('ifp', f, sym, sym)


CUR = [None]


def chain_of(env, name):
    defs = env.get(name, [])
    br = []
    for g, s, *_ in defs:
        if g == F: continue
        br.append((g, s))
        if g == T: break
    if not br: return []
    if len(br) == 1 and br[0][0] == T: return list(br[0][1])
    return [('chain', br)]


def nonempty(sym):
    fs = []
    for p in sym:
        if isinstance(p, str):
            if p.strip(): return T
        elif p[0] == 'raw':
            return T
        elif p[0] == 'chain':
            acc, prev = [], []
            for g, s in p[1]:
                acc.append(AND(g, *[NOT(x) for x in prev], nonempty(s)))
                prev.append(g)
            fs.append(OR(*acc))
        elif p[0] == 'ifp':
            fs.append(OR(AND(p[1], nonempty(p[2])), AND(NOT(p[1]), nonempty(p[3]))))
    return OR(*fs) if fs else F


def sev(nodes, env, g):
    out = []
    for n in nodes:
        k = n[0]
        if k == 'text':
            out.append(n[1])
        elif k == 'get':
            out.extend(chain_of(env, n[1]))
        elif k == 'set':
            v = sev(n[2], env, g)
            env.setdefault(n[1], []).insert(0, (g, v, CUR[0]))
        elif k == 'iff':
            f = atom(('feat', n[1]))
            if n[2]: f = NOT(f)
            th = sev(n[3], env, AND(g, f))
            el = sev(n[4], env, AND(g, NOT(f)))
            out.append(('ifp', f, th, el))
        elif k == 'if':
            f = nonempty(sev(n[1], env, g))
            if n[2]: f = NOT(f)
            th = sev(n[3], env, AND(g, f))
            el = sev(n[4], env, AND(g, NOT(f)))
            if f == T: out.extend(th)
            elif f == F: out.extend(el)
            else: out.append(('ifp', f, th, el))
        elif k == 'raw':
            out.append(('raw', n[1]))
    return out


def keepnl(t):
    # the engine's {{#if}} eats one newline at each end of the chosen text: give it one to eat
    if not t.strip():
        return t
    if re.match(r'[ \t]*\r?\n', t):
        t = '\n' + t
    if re.search(r'\r?\n[ \t]*$', t):
        t = t + '\n'
    return t


def render(sym):
    out = []
    for p in sym:
        if isinstance(p, str):
            out.append(p)
        elif p[0] == 'raw':
            out.append('{{' + p[1] + '}}')
        elif p[0] == 'chain':
            br = [(g, keepnl(render(s))) for g, s in p[1]]
            while br and not br[-1][1].strip() and br[-1][0] != T:
                br.pop()
            if br and br[-1][0] == T and not br[-1][1].strip():
                br.pop()
                while br and not br[-1][1].strip():
                    br.pop()
            if not br:
                continue
            if br[0][0] == T:
                out.append(br[0][1]); continue
            s = '{{#if %s}}%s' % (render_cond(br[0][0]), br[0][1])
            for g, t in br[1:]:
                if g == T:
                    s += '{{else}}' + t
                    break
                s += '{{else if %s}}%s' % (render_cond(g), t)
            out.append(s + '{{/if}}')
        elif p[0] == 'ifp':
            th, el = keepnl(render(p[2])), keepnl(render(p[3]))
            if not th.strip() and not el.strip():
                continue
            if not th.strip():
                out.append('{{#if %s}}%s{{/if}}' % (render_cond(NOT(p[1])), el))
            elif not el.strip():
                out.append('{{#if %s}}%s{{/if}}' % (render_cond(p[1]), th))
            else:
                out.append('{{#if %s}}%s{{else}}%s{{/if}}' % (render_cond(p[1]), th, el))
    return ''.join(out)


def sym_atoms(sym, acc=None):
    acc = set() if acc is None else acc
    for p in sym:
        if isinstance(p, str) or p[0] == 'raw': continue
        if p[0] == 'chain':
            for g, s in p[1]:
                atoms_of(g, acc); sym_atoms(s, acc)
        else:
            atoms_of(p[1], acc); sym_atoms(p[2], acc); sym_atoms(p[3], acc)
    return acc
