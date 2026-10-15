// The shell guide's state in the user's settings.json (`guide`): which What's new tips
// were seen, which tours are done, the last version whose What's new was shown, and
// whether tours start by themselves. The browser writes it, so it is checked here.

export interface GuideState {
  seen?: string[];
  tours?: string[];
  lastVersion?: string;
  showTours?: boolean;
}

const ID = /^[a-z0-9][a-z0-9.-]{0,63}$/;
const VERSION = /^\d{1,6}(\.\d{1,6}){0,3}$/;
const MAX_IDS = 300;

const ids = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length <= MAX_IDS && v.every((x) => typeof x === "string" && ID.test(x)) ? [...new Set(v as string[])] : null;

/** The stored shape, or null when `v` is not one (an unknown key, a wrong type, a long list). */
export function parseGuideState(v: unknown): GuideState | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (Object.keys(o).some((k) => !["seen", "tours", "lastVersion", "showTours"].includes(k))) return null;
  const out: GuideState = {};
  if (o.seen !== undefined) {
    const s = ids(o.seen);
    if (!s) return null;
    out.seen = s;
  }
  if (o.tours !== undefined) {
    const t = ids(o.tours);
    if (!t) return null;
    out.tours = t;
  }
  if (o.lastVersion !== undefined) {
    if (typeof o.lastVersion !== "string" || !VERSION.test(o.lastVersion)) return null;
    out.lastVersion = o.lastVersion;
  }
  if (o.showTours !== undefined) {
    if (typeof o.showTours !== "boolean") return null;
    out.showTours = o.showTours;
  }
  return out;
}
