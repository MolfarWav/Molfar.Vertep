/**
 * Shell i18n dictionaries: every locale answers every English key, with no
 * extras and the exact same {placeholders}. English keys ARE the copy, so a
 * translation file that drifted from en.ts would otherwise fall back to
 * English one string at a time, silently.
 */
import { describe, it, expect } from "bun:test";
import en from "../client/src/i18n/en.js";
import de from "../client/src/i18n/de.js";
import es from "../client/src/i18n/es.js";
import fr from "../client/src/i18n/fr.js";
import itDict from "../client/src/i18n/it.js";
import ja from "../client/src/i18n/ja.js";
import ko from "../client/src/i18n/ko.js";
import nl from "../client/src/i18n/nl.js";
import pl from "../client/src/i18n/pl.js";
import pt from "../client/src/i18n/pt.js";
import ru from "../client/src/i18n/ru.js";
import trDict from "../client/src/i18n/tr.js";
import uk from "../client/src/i18n/uk.js";
import zh from "../client/src/i18n/zh.js";
import { LOCALES } from "../client/src/i18n/locales.js";
import { readdirSync } from "node:fs";

const DICTS: Record<string, Record<string, string>> = { de, es, fr, it: itDict, ja, ko, nl, pl, pt, ru, tr: trDict, uk, zh };

const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe("shell i18n", () => {
  const keys = Object.keys(en);

  // English has no values to check (its keys are the copy), so the gap that is real is a locale nobody checks:
  // a dictionary file or a LOCALES entry that is missing from DICTS passes every test above.
  it("every shipped locale is checked, and every dictionary file is a shipped locale", () => {
    const shipped = Object.keys(LOCALES).filter((c) => c !== "en").sort();
    expect(Object.keys(DICTS).sort()).toEqual(shipped);
    const files = readdirSync(new URL("../client/src/i18n/", import.meta.url))
      .filter((f) => f.endsWith(".ts") && !["en.ts", "index.ts", "locales.ts"].includes(f))
      .map((f) => f.replace(/\.ts$/, ""))
      .sort();
    expect(files).toEqual(shipped);
  });

  it("the English key list is non-empty and unique", () => {
    expect(keys.length).toBeGreaterThan(100);
    expect(new Set(keys).size).toBe(keys.length);
  });

  for (const [code, dict] of Object.entries(DICTS)) {
    it(`${code}: every key translated, placeholder-for-placeholder`, () => {
      const missing = keys.filter((k) => !dict[k]);
      expect(missing).toEqual([]);
      const extra = Object.keys(dict).filter((k) => !(k in en));
      expect(extra).toEqual([]);
      const bad = keys.filter((k) => placeholders(dict[k]!).join(",") !== placeholders(k).join(","));
      expect(bad).toEqual([]);
    });
  }
});
