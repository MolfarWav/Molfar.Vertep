/**
 * Files the user attaches in the agent chat: a character card, a lorebook, a
 * log, a document. Pictures go to the model as images; everything else is
 * saved here and the message names it as `@uploads/<day>/<name>`, so the
 * agent gets it the way it gets any mentioned file (mentions.ts: the text up
 * to 64 KB, a big JSON as its shape) and reads the rest with its own tools.
 * Pasting a 300 KB card into the message instead would cost every later call
 * of the session its whole context.
 *
 *   uploads/2026-10-18/card.json
 *   uploads/2026-10-18/notes.docx.txt   a Word document, as its text
 *
 * Like project files, uploads stay out of git (paths.ts) and the agent never
 * writes them: a change there could not be undone. Backups keep them.
 */
import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import { safeResolve } from "../paths.js";

export const UPLOADS_DIR = "uploads";
export const UPLOAD_MAX = 10 * 1024 * 1024;

/** Text the agent can read as it is. Kept in step with CHAT_FILE_EXT in
 *  client-agent/src/api.ts. */
const TEXT_EXT = new Set([
  "md", "markdown", "txt", "text", "log", "json", "jsonl", "json5", "csv", "tsv", "yaml", "yml", "toml", "xml", "ini", "cfg", "conf", "env",
  "html", "htm", "css", "scss", "js", "mjs", "cjs", "ts", "tsx", "jsx", "vue", "svelte", "py", "rb", "go", "rs", "java", "kt", "c", "h", "cpp", "hpp", "cs",
  "php", "lua", "sh", "bash", "ps1", "bat", "cmd", "sql", "srt", "vtt", "ass", "rtf", "tex", "diff", "patch", "gm",
]);
/** Documents saved as the text inside them. */
const DOC_EXT = new Set(["docx", "odt"]);

export class UploadError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 413 | 415 = 400) {
    super(message);
  }
}

const extOf = (name: string): string => /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? "";

/** A name an "@path" mention can carry: no spaces (a mention ends at the
 *  first one), nothing a file system refuses. */
export function uploadName(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop() ?? "";
  const name = base.normalize("NFC").replace(/[\p{Cc}<>:"|?*'`]/gu, "").trim().replace(/\s+/g, "-").replace(/^[.-]+/, "").slice(0, 120);
  if (!name || !/[\p{L}\p{N}]/u.test(name)) throw new UploadError("that file name is not allowed");
  const ext = extOf(name);
  if (!TEXT_EXT.has(ext) && !DOC_EXT.has(ext)) {
    throw new UploadError(`"${name}" cannot be attached: Molfar reads text files (txt, md, json, csv, yaml, code…) and Word documents (docx, odt). For a PDF, copy its text into the message.`, 415);
  }
  return name;
}

/** The file as text: UTF-8, or UTF-16 with its byte order mark (what
 *  Windows Notepad calls "Unicode"). A string says why it is not text. */
function asText(body: Uint8Array, name: string): { text: string } | string {
  const utf16 = body[0] === 0xff && body[1] === 0xfe ? "utf-16le" : body[0] === 0xfe && body[1] === 0xff ? "utf-16be" : null;
  if (!utf16 && body.subarray(0, 8192).includes(0)) return `"${name}" is not a text file`;
  try {
    return { text: new TextDecoder(utf16 ?? "utf-8", { fatal: true }).decode(body).replace(/^\uFEFF/, "") };
  } catch {
    return `"${name}" is not in UTF-8: open it in a text editor, save it as UTF-8 and attach it again`;
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function xmlText(xml: string, paragraph: RegExp, tab: RegExp, lineBreak: RegExp): string {
  return xml
    .replace(paragraph, "\n")
    .replace(tab, "\t")
    .replace(lineBreak, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e] ?? m;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The text of a .docx or .odt: paragraphs, tabs and line breaks kept,
 *  formatting dropped. */
export function documentText(body: Uint8Array, ext: string): string {
  let files: Record<string, Uint8Array>;
  try {
    const want = ext === "docx" ? "word/document.xml" : "content.xml";
    files = unzipSync(body, { filter: (f) => f.name === want });
  } catch {
    throw new UploadError(`this .${ext} file could not be opened`, 415);
  }
  const xml = Object.values(files)[0];
  if (!xml) throw new UploadError(`this .${ext} file has no text in it`, 415);
  const s = new TextDecoder().decode(xml);
  return ext === "docx"
    ? xmlText(s, /<\/w:p>/g, /<w:tab\/>/g, /<w:br\/>/g)
    : xmlText(s, /<\/text:(p|h)>/g, /<text:tab\/>/g, /<text:line-break\/>/g);
}

const today = (): string => new Date().toISOString().slice(0, 10);

/** Save an attached file; returns its workspace path. The same content under
 *  the same name is saved once; a different one gets -2, -3, … */
export function saveUpload(root: string, rawName: string, body: Uint8Array): { path: string; size: number } {
  if (body.byteLength > UPLOAD_MAX) throw new UploadError("an attached file can be at most 10 MB", 413);
  let name = uploadName(rawName);
  const ext = extOf(name);
  let text: string;
  if (DOC_EXT.has(ext)) {
    text = documentText(body, ext);
    name = `${name}.txt`;
  } else {
    const t = asText(body, name);
    if (typeof t === "string") throw new UploadError(t, 415);
    text = t.text;
  }
  const bytes = Buffer.from(text, "utf8");
  const dirRel = `${UPLOADS_DIR}/${today()}`;
  const dir = safeResolve(root, dirRel);
  fs.mkdirSync(dir, { recursive: true });
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const tail = dot > 0 ? name.slice(dot) : "";
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? name : `${stem}-${n}${tail}`;
    const abs = path.join(dir, candidate);
    let st: fs.Stats | null = null;
    try {
      st = fs.lstatSync(abs);
    } catch { /* free */ }
    if (st?.isFile() && st.size === bytes.length && fs.readFileSync(abs).equals(bytes)) return { path: `${dirRel}/${candidate}`, size: bytes.length };
    if (st) continue;
    fs.writeFileSync(abs, bytes);
    return { path: `${dirRel}/${candidate}`, size: bytes.length };
  }
  throw new UploadError("too many files with that name today");
}
