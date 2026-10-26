import { describe, it, expect } from "bun:test";
import { Pacer, isRateLimited, readLimits, runLimited, type Clock } from "../src/plugins/llm-pace.js";

/** A clock that only moves when something sleeps, so a pause costs no real time. */
function fakeClock(): Clock & { t: number; slept: number[] } {
  const c = {
    t: 1000,
    slept: [] as number[],
    now: () => c.t,
    sleep: async (ms: number) => { c.slept.push(ms); c.t += ms; },
  };
  return c;
}

describe("rate limit detection", () => {
  it("reads a refusal for speed from the error text", () => {
    expect(isRateLimited("model error: 429 Too Many Requests")).toBe(true);
    expect(isRateLimited("Provider returned error: rate limit exceeded")).toBe(true);
    expect(isRateLimited("rate_limit_error")).toBe(true);
    expect(isRateLimited("model error: 401 invalid key")).toBe(false);
    expect(isRateLimited("took 14290 ms")).toBe(false);
    expect(isRateLimited(undefined)).toBe(false);
  });
});

describe("manifest limits", () => {
  it("keeps whole numbers inside the bounds and ignores the rest", () => {
    expect(readLimits(undefined)).toEqual({ passes: 3, concurrency: null });
    expect(readLimits({ passes: 8, concurrency: 2 })).toEqual({ passes: 8, concurrency: 2 });
    expect(readLimits({ passes: 99, concurrency: 99 })).toEqual({ passes: 12, concurrency: 4 });
    expect(readLimits({ passes: 1, concurrency: 0 })).toEqual({ passes: 3, concurrency: 1 });
    expect(readLimits({ passes: "9", concurrency: NaN })).toEqual({ passes: 3, concurrency: null });
    expect(readLimits({ passes: 5.9 })).toEqual({ passes: 5, concurrency: null });
  });
});

describe("Pacer", () => {
  it("spaces the starts of requests by the minimum gap", async () => {
    const pacer = new Pacer({ minGapMs: 40, retries: 3, baseDelayMs: 2000 });
    const starts: number[] = [];
    await Promise.all([1, 2, 3].map(() => pacer.run(async () => { starts.push(performance.now()); })));
    starts.sort((x, y) => x - y);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(35);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(35);
  });

  it("tries a refused request again after a pause that doubles, and returns the answer", async () => {
    const clock = fakeClock();
    const pacer = new Pacer({ minGapMs: 0, retries: 3, baseDelayMs: 1000 }, clock);
    let calls = 0;
    const out = await pacer.run(async () => {
      if (++calls < 3) throw new Error("model error: 429 rate limit");
      return "ok";
    });
    expect(out).toBe("ok");
    expect(calls).toBe(3);
    // 1000 + jitter, then 2000 + jitter
    expect(clock.slept[0]!).toBeGreaterThanOrEqual(1000);
    expect(clock.slept[0]!).toBeLessThan(1250);
    expect(clock.slept[1]!).toBeGreaterThanOrEqual(2000);
    expect(clock.slept[1]!).toBeLessThan(2250);
  });

  it("gives up after the retries and throws the last error", async () => {
    const pacer = new Pacer({ minGapMs: 0, retries: 2, baseDelayMs: 1 }, fakeClock());
    let calls = 0;
    await expect(pacer.run(async () => { calls++; throw new Error("429"); })).rejects.toThrow("429");
    expect(calls).toBe(3);
  });

  it("does not retry another kind of error, or when a retry is no longer safe", async () => {
    const pacer = new Pacer({ minGapMs: 0, retries: 3, baseDelayMs: 1 }, fakeClock());
    let calls = 0;
    await expect(pacer.run(async () => { calls++; throw new Error("401 bad key"); })).rejects.toThrow("401");
    expect(calls).toBe(1);
    calls = 0;
    await expect(pacer.run(async () => { calls++; throw new Error("429"); }, () => false)).rejects.toThrow("429");
    expect(calls).toBe(1);
  });

  it("holds back the requests behind a refused one", async () => {
    const pacer = new Pacer({ minGapMs: 10, retries: 1, baseDelayMs: 150 });
    const t0 = performance.now();
    let refused = false;
    let late = 0;
    await Promise.all([
      pacer.run(async () => { if (!refused) { refused = true; throw new Error("429"); } }),
      // asks after the refusal: its turn comes after the pause, not 10 ms later
      (async () => {
        await new Promise((r) => setTimeout(r, 30));
        await pacer.run(async () => { late = performance.now() - t0; });
      })(),
    ]);
    expect(late).toBeGreaterThanOrEqual(140);
  });
});

describe("runLimited", () => {
  it("never runs more than the limit at once, and runs every job", async () => {
    let inflight = 0;
    let peak = 0;
    let done = 0;
    const jobs = Array.from({ length: 7 }, () => async () => {
      peak = Math.max(peak, ++inflight);
      await new Promise((r) => setTimeout(r, 5));
      inflight--;
      done++;
    });
    await runLimited(jobs, 3);
    expect(peak).toBe(3);
    expect(done).toBe(7);
  });

  it("runs one after another with a limit of 1, and takes an empty list", async () => {
    const order: number[] = [];
    await runLimited([1, 2, 3].map((n) => async () => { await new Promise((r) => setTimeout(r, 3)); order.push(n); }), 1);
    expect(order).toEqual([1, 2, 3]);
    await runLimited([], 4);
  });
});
