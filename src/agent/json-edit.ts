/**
 * One field of a big JSON file, read or changed without loading the file into
 * the model's context. A character card passes 100 KB and is often one line;
 * a recorded card task spent ~30 of its 49 model calls measuring, slicing and
 * rewriting cards through jq and python. These are the pure parts of the
 * json_get / json_set tools (tools.ts): pointers, a view of a value, and
 * edits that write the file back in the format it was found in.
 */

export type JsonPath = (string | number)[];

/** "/data/description", "data.description", "entries[3].content" or "" for the root. */
export function parsePointer(pointer: string): JsonPath {
  const p = pointer.trim();
  if (p === "" || p === "/") return [];
  if (p.startsWith("/")) {
    return p
      .slice(1)
      .split("/")
      .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  }
  const out: JsonPath = [];
  for (const part of p.split(".")) {
    const m = /^([^[\]]*)((?:\[\d+\])*)$/.exec(part);
    if (!m) throw new Error(`cannot read the path "${pointer}": use /a/b/0 or a.b[0]`);
    if (m[1]) out.push(m[1]);
    for (const i of m[2]!.matchAll(/\[(\d+)\]/g)) out.push(Number(i[1]));
  }
  return out;
}

export const showPath = (path: JsonPath): string => (path.length ? `/${path.map((k) => String(k).replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}` : "/");

const kindOf = (v: unknown): string => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** The value at a path; throws naming the first step that is not there. */
export function getAt(doc: unknown, path: JsonPath): unknown {
  let cur = doc;
  for (const [i, raw] of path.entries()) {
    if (Array.isArray(cur)) {
      const n = typeof raw === "number" ? raw : /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
      if (!(n >= 0 && n < cur.length)) throw new Error(`${showPath(path.slice(0, i + 1))}: no such index (the array has ${cur.length} items)`);
      cur = cur[n];
    } else if (cur && typeof cur === "object") {
      const k = String(raw);
      if (!Object.hasOwn(cur, k)) {
        const keys = Object.keys(cur);
        throw new Error(`${showPath(path.slice(0, i + 1))}: no such key. Keys here: ${keys.slice(0, 40).join(", ")}${keys.length > 40 ? ", …" : ""}`);
      }
      cur = (cur as Record<string, unknown>)[k];
    } else {
      throw new Error(`${showPath(path.slice(0, i))} is a ${kindOf(cur)}, not an object or array`);
    }
  }
  return cur;
}

/** A line about a value without its content. */
function sizeOf(v: unknown): string {
  if (typeof v === "string") return `string, ${v.length} chars`;
  if (Array.isArray(v)) return `array, ${v.length} items`;
  if (v && typeof v === "object") return `object, ${Object.keys(v).length} keys`;
  return JSON.stringify(v);
}

/** What json_get shows: the value when it fits, else its shape or its head. */
export function viewValue(v: unknown, at: string, maxChars: number): string {
  const whole = JSON.stringify(v, null, 2) ?? "null";
  if (whole.length <= maxChars) return `[${at}: ${sizeOf(v)}]\n${whole}`;
  if (typeof v === "string") return `[${at}: ${sizeOf(v)}; the first ${maxChars} shown, ask with a larger maxChars for more]\n${v.slice(0, maxChars)}`;
  const rows = Array.isArray(v) ? v.map((x, i) => [String(i), x] as const) : Object.entries(v as Record<string, unknown>);
  const shown = rows.slice(0, 200).map(([k, x]) => `- ${k}: ${sizeOf(x)}`);
  if (rows.length > 200) shown.push(`- … ${rows.length - 200} more`);
  return `[${at}: ${sizeOf(v)}, too big to show whole (${whole.length} chars); its parts:]\n${shown.join("\n")}`;
}

/** The container at a path, with missing object keys on the way created as
 *  {} (an imported card may have no `studio` bag yet). Array steps must exist. */
function ensureAt(doc: unknown, path: JsonPath): unknown {
  let cur = doc;
  for (const [i, raw] of path.entries()) {
    if (cur && typeof cur === "object" && !Array.isArray(cur) && !Object.hasOwn(cur, String(raw))) {
      (cur as Record<string, unknown>)[String(raw)] = {};
    }
    cur = getAt(cur, [raw]);
    if (cur === null || typeof cur !== "object") throw new Error(`${showPath(path.slice(0, i + 1))} is a ${kindOf(cur)}, not an object or array`);
  }
  return cur;
}

export interface JsonEdit {
  pointer: string;
  op?: "set" | "delete" | "append";
  value?: unknown;
}

/** Apply edits in order to a parsed document (changed in place). Returns one line per edit. */
export function applyEdits(doc: unknown, edits: JsonEdit[]): { doc: unknown; lines: string[] } {
  const lines: string[] = [];
  for (const e of edits) {
    const op = e.op ?? "set";
    const path = parsePointer(e.pointer);
    const at = showPath(path);
    if (op === "append") {
      if (e.value === undefined) throw new Error(`${at}: append needs a value`);
      // a missing array under an object is created (and the objects above it)
      if (path.length) {
        const parent = ensureAt(doc, path.slice(0, -1));
        const k = String(path[path.length - 1]);
        if (!Array.isArray(parent) && !Object.hasOwn(parent as object, k)) (parent as Record<string, unknown>)[k] = [];
      }
      const target = getAt(doc, path);
      if (!Array.isArray(target)) throw new Error(`${at} is a ${kindOf(target)}: append needs an array`);
      target.push(e.value);
      lines.push(`appended to ${at} (now ${target.length} items)`);
      continue;
    }
    if (!path.length) {
      if (op === "delete") throw new Error("cannot delete the whole document");
      if (e.value === undefined) throw new Error("set needs a value");
      doc = e.value;
      lines.push(`replaced the whole document (${sizeOf(doc)})`);
      continue;
    }
    // set creates missing objects on the way; delete needs the path to exist
    const parent = op === "delete" ? getAt(doc, path.slice(0, -1)) : ensureAt(doc, path.slice(0, -1));
    const last = path[path.length - 1]!;
    if (Array.isArray(parent)) {
      const n = typeof last === "number" ? last : /^\d+$/.test(last) ? Number(last) : Number.NaN;
      if (op === "delete") {
        if (!(n >= 0 && n < parent.length)) throw new Error(`${at}: no such index (the array has ${parent.length} items)`);
        parent.splice(n, 1);
        lines.push(`deleted ${at} (the array now has ${parent.length} items)`);
        continue;
      }
      if (!(n >= 0 && n <= parent.length)) throw new Error(`${at}: index out of range (the array has ${parent.length} items; use op append to add one)`);
      if (e.value === undefined) throw new Error(`${at}: set needs a value`);
      const before = n < parent.length ? sizeOf(parent[n]) : "new";
      parent[n] = e.value;
      lines.push(`set ${at}: ${before} → ${sizeOf(e.value)}`);
    } else if (parent && typeof parent === "object") {
      const obj = parent as Record<string, unknown>;
      const k = String(last);
      if (op === "delete") {
        if (!Object.hasOwn(obj, k)) throw new Error(`${at}: no such key`);
        delete obj[k];
        lines.push(`deleted ${at}`);
        continue;
      }
      if (e.value === undefined) throw new Error(`${at}: set needs a value`);
      const before = Object.hasOwn(obj, k) ? sizeOf(obj[k]) : "new key";
      obj[k] = e.value;
      lines.push(`set ${at}: ${before} → ${sizeOf(e.value)}`);
    } else {
      throw new Error(`${showPath(path.slice(0, -1))} is a ${kindOf(parent)}, not an object or array`);
    }
  }
  return { doc, lines };
}

export interface JsonStyle {
  /** null = one line */
  indent: string | null;
  /** one-line files written by Python keep ", " and ": " */
  spaced: boolean;
  /** non-ASCII stored as \uXXXX */
  ascii: boolean;
  crlf: boolean;
  finalNewline: boolean;
}

/** How a JSON file is written, so a change keeps the diff to what changed. */
export function detectStyle(raw: string): JsonStyle {
  const body = raw.trim();
  const oneLine = !body.includes("\n");
  let indent: string | null = null;
  if (!oneLine) {
    const m = /\n([ \t]+)\S/.exec(body);
    indent = m ? m[1]! : "  ";
  }
  return {
    indent,
    spaced: oneLine && /^[[{]\s*"(?:[^"\\]|\\.)*":\s/.test(body) && /,\s"/.test(body),
    ascii: /\\u[0-9a-fA-F]{4}/.test(raw) && !/[\u0080-￿]/.test(raw),
    crlf: raw.includes("\r\n"),
    finalNewline: /\n$/.test(raw),
  };
}

const asciiOnly = (s: string): string => s.replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

/** Write a document in a found style. */
export function serialize(doc: unknown, style: JsonStyle): string {
  const str = (s: string) => (style.ascii ? asciiOnly(JSON.stringify(s)) : JSON.stringify(s));
  const walk = (v: unknown, depth: number): string => {
    if (v === null || typeof v !== "object") return typeof v === "string" ? str(v) : (JSON.stringify(v) ?? "null");
    const entries = Array.isArray(v) ? v.map((x) => [null, x] as const) : Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
    const [open, close] = Array.isArray(v) ? ["[", "]"] : ["{", "}"];
    if (!entries.length) return open + close;
    const item = ([k, x]: readonly [string | null, unknown]) => (k === null ? "" : `${str(k)}${style.indent !== null || style.spaced ? ": " : ":"}`) + walk(x, depth + 1);
    if (style.indent === null) return open + entries.map(item).join(style.spaced ? ", " : ",") + close;
    const pad = style.indent.repeat(depth + 1);
    return `${open}\n${entries.map((e) => pad + item(e)).join(",\n")}\n${style.indent.repeat(depth)}${close}`;
  };
  let out = walk(doc, 0);
  if (style.finalNewline) out += "\n";
  return style.crlf ? out.replace(/\n/g, "\r\n") : out;
}

/** Above this size a JSON file read whole is mostly not what the reader wants
 *  (a character card's base64 portrait, a lorebook's hundred entries). */
export const BIG_JSON_CHARS = 16 * 1024;

/** A big JSON text as its shape (top-level fields and their sizes) with how to
 *  read the fields themselves; null when the text does not parse. */
export function bigJsonView(text: string): string | null {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  if (doc === null || typeof doc !== "object") return null;
  return `${viewValue(doc, "/", 0)}\n(${Math.round(text.length / 1024)} KB of JSON: only its shape is shown. Read the fields you need with json_get, several pointers in one call.)`;
}
