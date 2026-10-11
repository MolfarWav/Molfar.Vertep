#!/usr/bin/env node
// ask-model: send a prompt to an external model (OpenAI-compatible API or local CLI).
// Zero dependencies, Node 18+.
//
// Usage:
//   node ask.mjs -a work "prompt"                      (alias = fallback chain from providers.json)
//   node ask.mjs -p nanogpt -m <model> -f a.ts "Review this file"
//   echo "long prompt" | node ask.mjs -a free
//   node ask.mjs --check
//   node ask.mjs --list-models -p openrouter --filter deepseek

import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

// Behind a proxy (cloud sessions) Node's fetch ignores HTTPS_PROXY unless
// NODE_USE_ENV_PROXY is set at startup: re-run once with it.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], {
    stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
  });
  process.exit(r.status ?? 1);
}

const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(SKILL_DIR, 'providers.json'), 'utf8'));

class Fatal extends Error {}
const fail = (msg) => { throw new Fatal(msg); };

// ---------- args ----------
function parseArgs(argv) {
  const o = { files: [], prompt: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '-a': case '--alias': o.alias = next(); break;
      case '-p': case '--provider': o.provider = next(); break;
      case '-m': case '--model': o.model = next(); break;
      case '-s': case '--system': o.system = next(); break;
      case '--system-file': o.system = readFileSync(next(), 'utf8'); break;
      case '-f': case '--file': o.files.push(next()); break;
      case '--prompt-file': o.prompt.push(readFileSync(next(), 'utf8')); break;
      case '--max-tokens': o.maxTokens = Number(next()); break;
      case '-t': case '--temperature': o.temperature = Number(next()); break;
      case '--timeout': o.timeout = Number(next()); break;
      case '--no-fallback': o.noFallback = true; break;
      case '--json': o.json = true; break;
      case '--check': o.check = true; break;
      case '--list-models': o.listModels = true; break;
      case '--filter': o.filter = next().toLowerCase(); break;
      case '-h': case '--help': o.help = true; break;
      default: o.prompt.push(a);
    }
  }
  return o;
}

// ---------- keys ----------
// Order: environment (cloud sessions), then keys.env beside this copy, then the
// personal copy's keys.env (~/.claude/skills/ask-model), so the repo copy works
// on the desktop too. keys.env is gitignored here: never commit one.
function parseKeysFile(p) {
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const KEY_FILES = [join(SKILL_DIR, 'keys.env'), join(homedir(), '.claude', 'skills', 'ask-model', 'keys.env')];
const fileKeys = Object.assign({}, ...KEY_FILES.slice().reverse().map(parseKeysFile));
const getKey = (name) => process.env[name] || fileKeys[name] || '';

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

// ---------- providers ----------
async function httpJson(url, { method = 'GET', headers = {}, body, timeout = 300 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout * 1000);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (Array.isArray(data)) data = data[0]; // Gemini wraps errors in an array
    if (!res.ok || data?.error) {
      const detail = data?.error?.message || data?.message || text.slice(0, 300);
      throw new Error(`HTTP ${res.status}: ${String(detail).replace(/\s+/g, ' ').slice(0, 300)}`);
    }
    if (!data) throw new Error(`Non-JSON response: ${text.slice(0, 300)}`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timed out after ${timeout}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(prov) {
  const key = getKey(prov.keyEnv);
  if (!key) fail(`${prov.keyEnv} is not set. Add it to the environment (cloud) or ${KEY_FILES[1]} (desktop).`);
  return { Authorization: `Bearer ${key}`, ...(prov.headers || {}) };
}

async function callOpenAI(prov, t, o, userContent) {
  const messages = [];
  if (t.system) messages.push({ role: 'system', content: t.system });
  messages.push({ role: 'user', content: userContent });
  const body = { model: t.model, messages };
  if (o.maxTokens) body.max_tokens = o.maxTokens;
  if (o.temperature !== undefined) body.temperature = o.temperature;

  const data = await httpJson(`${prov.baseUrl}/chat/completions`, {
    method: 'POST', headers: authHeaders(prov), body, timeout: o.timeout || 300,
  });
  const choice = data.choices?.[0];
  let text = choice?.message?.content ?? '';
  if (Array.isArray(text)) text = text.map((p) => p.text || '').join('');
  if (!text.trim()) {
    const why = choice?.finish_reason === 'length' ? ' (hit max_tokens while reasoning — raise --max-tokens)' : '';
    throw new Error(`Empty answer${why}`);
  }
  return { text, model: data.model || t.model, finish: choice?.finish_reason, usage: data.usage };
}

// Prompts longer than this go to a temp file that the CLI reads itself (Windows command-line limit is ~32k).
const MAX_ARG_PROMPT = 20000;

function callCli(prov, t, o, userContent) {
  const input = t.system ? `${t.system}\n\n${userContent}` : userContent;
  const args = [...(prov.args || [])];
  if (t.model) args.push(prov.modelFlag || '-m', t.model);
  const command = prov.command.replace(/%([A-Z0-9_]+)%/gi, (_, v) => process.env[v] ?? '');

  let child, tmpFile;
  if (prov.promptVia === 'arg') {
    // Real .exe: no shell, Node quotes each argument itself.
    let prompt = input;
    if (input.length > MAX_ARG_PROMPT) {
      const dir = mkdtempSync(join(tmpdir(), 'ask-model-'));
      tmpFile = join(dir, 'task.md');
      writeFileSync(tmpFile, input, 'utf8');
      // "@path" makes the CLI inline the file itself — no tool call, so it works in read-only mode.
      prompt = `Do exactly what the attached file says. Reply with the answer only. @${tmpFile}`;
    }
    args.push(prov.promptFlag || '-p', prompt);
    child = spawn(command, args, { shell: false });
  } else {
    // shell lets Windows resolve npm .cmd/.ps1 shims; the prompt goes via stdin to avoid quoting issues.
    child = spawn([command, ...args.map((x) => JSON.stringify(x))].join(' '), { shell: true });
  }
  const cleanup = () => { if (tmpFile) rmSync(dirname(tmpFile), { recursive: true, force: true }); };

  return new Promise((resolve, reject) => {
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Timed out after ${o.timeout || 600}s`)); }, (o.timeout || 600) * 1000);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); cleanup(); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      cleanup();
      const errText = err.split(/\r?\n/).filter((l) => !/logging before google\.Init/.test(l)).join('\n').trim();
      if (code !== 0) reject(new Error(`${basename(command)} exited ${code}: ${errText.slice(0, 500)}`));
      else if (!out.trim()) reject(new Error(`Empty answer${errText ? `: ${errText.slice(0, 300)}` : ''}`));
      else resolve({ text: out.trim(), model: t.model || `${basename(command)} (default)` });
    });
    child.stdin.on('error', () => {}); // a missing command closes stdin before we write
    child.stdin.end(prov.promptVia === 'arg' ? '' : input);
  });
}

async function listModels(name, prov, filter) {
  if (prov.type !== 'openai') fail(`--list-models is only supported for API providers.`);
  const data = await httpJson(`${prov.baseUrl}/models`, { headers: authHeaders(prov), timeout: 60 });
  let rows = (data.data || data.models || []).map((m) => {
    const id = (m.id || m.name || '').replace(/^models\//, '');
    const p = m.pricing;
    const price = p && p.prompt !== undefined
      ? (p.unit ? `  $${p.prompt}/$${p.completion} per M`
        : `  $${(+p.prompt * 1e6).toFixed(2)}/$${(+p.completion * 1e6).toFixed(2)} per M`)
      : '';
    return { id, line: id + price };
  });
  if (filter) rows = rows.filter((r) => r.id.toLowerCase().includes(filter));
  rows.sort((a, b) => a.id.localeCompare(b.id));
  process.stdout.write(`${name}: ${rows.length} models\n${rows.map((r) => r.line).join('\n')}\n`);
}

async function check() {
  for (const [name, p] of Object.entries(config.providers)) {
    let status;
    if (p.type === 'cli') {
      status = await new Promise((r) => {
        const c = spawn(`${p.command} --version`, { shell: true, stdio: 'ignore' });
        c.on('close', (code) => r(code === 0 ? 'installed' : 'NOT FOUND'));
        c.on('error', () => r('NOT FOUND'));
      });
    } else {
      status = getKey(p.keyEnv) ? `key set (${p.keyEnv})` : `NO KEY (${p.keyEnv})`;
    }
    process.stdout.write(`${name.padEnd(14)} ${status.padEnd(34)} ${p.note || ''}\n`);
  }
  process.stdout.write('\nAliases (tried in order, falls back on error):\n');
  for (const [a, v] of Object.entries(config.aliases || {})) {
    const chain = (Array.isArray(v) ? v : [v]).map((x) => `${x.provider}/${x.model || 'default'}`).join('  ->  ');
    process.stdout.write(`  ${a.padEnd(8)} ${chain}\n`);
  }
}

// ---------- main ----------
async function main() {
  const o = parseArgs(process.argv.slice(2));

  if (o.help) {
    const src = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 11);
    process.stdout.write(src.join('\n').replace(/^\/\/ ?/gm, '') + '\n');
    return;
  }
  if (o.check) return check();

  // Build the list of targets to try.
  let targets;
  if (o.alias) {
    const a = config.aliases?.[o.alias];
    if (!a) fail(`Unknown alias "${o.alias}". Known: ${Object.keys(config.aliases || {}).join(', ')}`);
    targets = (Array.isArray(a) ? a : [a]).map((x) => ({ ...x }));
    if (o.provider || o.model) targets = [{ ...targets[0], ...(o.provider && { provider: o.provider }), ...(o.model && { model: o.model }) }];
  } else {
    if (!o.provider) fail('Specify -a <alias> or -p <provider>. Run --check to see options.');
    targets = [{ provider: o.provider, model: o.model }];
  }
  if (o.system) targets.forEach((t) => (t.system = o.system));
  if (o.noFallback) targets = targets.slice(0, 1);

  for (const t of targets) {
    if (!config.providers[t.provider]) fail(`Unknown provider "${t.provider}". Known: ${Object.keys(config.providers).join(', ')}`);
  }

  if (o.listModels) return listModels(targets[0].provider, config.providers[targets[0].provider], o.filter);

  const parts = [];
  // Read stdin only when nothing else carries the prompt: an open, silent stdin
  // (a non-TTY shell that never sends EOF) would otherwise hang forever.
  const stdin = o.prompt.length || o.files.length ? '' : await readStdin();
  if (stdin.trim()) parts.push(stdin);
  if (o.prompt.length) parts.push(o.prompt.join(' '));
  for (const f of o.files) parts.push(`<file path="${basename(f)}">\n${readFileSync(f, 'utf8')}\n</file>`);
  const userContent = parts.join('\n\n');
  if (!userContent.trim()) fail('Empty prompt.');

  const errors = [];
  for (const t of targets) {
    const prov = config.providers[t.provider];
    if (prov.type === 'openai' && !t.model) fail(`No model given. List options: node ask.mjs --list-models -p ${t.provider}`);
    if (prov.type === 'openai' && !getKey(prov.keyEnv)) { errors.push(`${t.provider}: no key`); continue; }
    const started = Date.now();
    try {
      const r = prov.type === 'cli' ? await callCli(prov, t, o, userContent) : await callOpenAI(prov, t, o, userContent);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      if (o.json) {
        process.stdout.write(JSON.stringify({ provider: t.provider, ...r, seconds: Number(secs), skipped: errors }, null, 2) + '\n');
      } else {
        process.stdout.write(r.text + '\n');
        const u = r.usage ? ` | tokens in ${r.usage.prompt_tokens ?? '?'} / out ${r.usage.completion_tokens ?? '?'}` : '';
        const cost = r.usage?.cost !== undefined ? ` | $${Number(r.usage.cost).toFixed(5)}` : '';
        const fin = r.finish && r.finish !== 'stop' ? ` | finish: ${r.finish}` : '';
        const fb = errors.length ? ` | fell back after: ${errors.join('; ')}` : '';
        process.stderr.write(`[${t.provider} / ${r.model} | ${secs}s${u}${cost}${fin}${fb}]\n`);
      }
      return;
    } catch (e) {
      if (e instanceof Fatal) throw e;
      errors.push(`${t.provider}/${t.model}: ${e.message}`);
    }
  }
  fail(`All targets failed:\n  ${errors.join('\n  ')}`);
}

// Set exitCode instead of calling process.exit(): exiting while fetch handles close
// triggers a libuv assertion on Windows.
main().catch((e) => {
  process.stderr.write(`ask-model: ${e.message}\n`);
  process.exitCode = 1;
});
