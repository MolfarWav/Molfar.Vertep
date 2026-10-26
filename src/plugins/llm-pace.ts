/**
 * Pace for a plugin's model requests. A plugin that sets `limits.concurrency`
 * in its manifest gets the requests of one pass run side by side (up to that
 * many), spaced out in time, and a request the provider refused with a rate
 * limit (HTTP 429) is tried again after a pause.
 *
 * Measured on NanoGPT (Molfar.Vertep issue #127): four requests at once pass,
 * but the same count in bursts over a few hundred calls drew a 429 on about
 * one in twelve. So the spacing between starts is what matters, not only how
 * many run together, and one refusal slows every request behind it.
 */

export interface PaceConfig {
  /** Least time between the starts of two requests of one account. */
  minGapMs: number;
  /** How many times a refused request is tried again. */
  retries: number;
  /** The first pause after a refusal; each next one is twice as long. */
  baseDelayMs: number;
}

export const DEFAULT_PACE: PaceConfig = { minGapMs: 250, retries: 3, baseDelayMs: 2000 };

/** Hard bounds for the manifest's `limits`: a plugin can ask for more, never past these. */
export const PASSES_DEFAULT = 3;
export const PASSES_MAX = 12;
export const CONCURRENCY_MAX = 4;

export interface PluginLimits {
  passes?: number;
  concurrency?: number;
}

/** What a manifest's `limits` come to: whole numbers inside the bounds, nothing else. */
export function readLimits(raw: unknown): { passes: number; concurrency: number | null } {
  const l = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const whole = (v: unknown, lo: number, hi: number): number | null =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : null;
  return { passes: whole(l.passes, PASSES_DEFAULT, PASSES_MAX) ?? PASSES_DEFAULT, concurrency: whole(l.concurrency, 1, CONCURRENCY_MAX) };
}

/** Does this error say the provider is refusing for speed? The error text is all that reaches us. */
export function isRateLimited(message: string | undefined): boolean {
  return !!message && /\b429\b|rate[\s_-]?limit|too many requests/i.test(message);
}

export interface Clock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

const realClock: Clock = { now: () => Date.now(), sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };

export class Pacer {
  private nextStart = 0;
  constructor(private cfg: PaceConfig = DEFAULT_PACE, private clock: Clock = realClock) {}

  /** Wait for this request's turn: starts are at least `minGapMs` apart. */
  async turn(): Promise<void> {
    const at = Math.max(this.clock.now(), this.nextStart);
    this.nextStart = at + this.cfg.minGapMs;
    const wait = at - this.clock.now();
    if (wait > 0) await this.clock.sleep(wait);
  }

  /** A refusal: nothing starts for `ms`, so the requests behind it do not hit the same wall. */
  slowDown(ms: number): void {
    this.nextStart = Math.max(this.nextStart, this.clock.now() + ms);
  }

  /**
   * Run one request in turn. A rate-limit error is tried again after a pause
   * that doubles each time, with `again` deciding whether a retry is still safe
   * (a streamed reply that already sent text must not start over).
   */
  async run<T>(job: () => Promise<T>, again: () => boolean = () => true): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.turn();
      try {
        return await job();
      } catch (e) {
        if (!isRateLimited((e as Error).message) || attempt >= this.cfg.retries || !again()) throw e;
        const pause = this.cfg.baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
        this.slowDown(pause);
      }
    }
  }
}

/** One pacer per account: the rate limit belongs to the account's key, not to a plugin. */
const pacers = new Map<string, Pacer>();
export function pacerFor(owner: string | undefined): Pacer {
  const key = owner ?? "";
  let p = pacers.get(key);
  if (!p) pacers.set(key, (p = new Pacer()));
  return p;
}

/** Run jobs with at most `limit` at once. A job must not throw: it would end the others. */
export async function runLimited(jobs: (() => Promise<void>)[], limit: number): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) await jobs[next++]!();
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, jobs.length)) }, worker));
}
