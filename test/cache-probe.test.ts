/**
 * "Check the cache" (Settings → model panel): two calls of the same prompt, one after the other,
 * and what the second one read from the provider's cache.
 */
import { describe, expect, it } from "bun:test";
import { cacheProbe, cacheVerdict, probeText } from "../src/cache-probe.js";
import { estimateTextTokens } from "../src/agent/context-budget.js";
import type { GenerateRequest, GenerateResult } from "../src/models.js";

const result = (usage: Partial<GenerateResult["usage"]>, model = "p/m"): GenerateResult =>
  ({ text: "ready", model, usage: { input: 0, output: 1, cacheRead: 0, cacheWrite: 0, costTotal: 0, priced: false, ...usage } }) as GenerateResult;

describe("cache check", () => {
  it("sends one long prompt twice, in turn, with a short answer and the same session", async () => {
    const seen: GenerateRequest[] = [];
    let active = 0;
    const out = await cacheProbe(async (req) => {
      active++;
      expect(active).toBe(1);
      seen.push(req);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return seen.length === 1 ? result({ input: 2600 }) : result({ input: 300, cacheRead: 2300 });
    }, "nano/glm");
    expect(seen).toHaveLength(2);
    expect(out.calls).toBe(2);
    expect(seen[0]).toEqual(seen[1]!);
    expect(seen[0]!.model).toBe("nano/glm");
    expect(seen[0]!.presetParams?.max_tokens).toBeLessThanOrEqual(16);
    expect(seen[0]!.paramsSource).toBe("request");
    expect(estimateTextTokens(String(seen[0]!.messages[0]!.content))).toBeGreaterThan(2048);
    expect(out.verdict).toBe("cached");
    expect(out.second).toMatchObject({ prompt: 2600, cacheRead: 2300 });
  });

  it("a miss gets one more try; a provider with no counts gets none", async () => {
    let n = 0;
    const miss = async () => {
      n++;
      return result({ input: 2600 });
    };
    expect(await cacheProbe(miss, "p/m")).toMatchObject({ verdict: "none", calls: 3 });
    expect(n).toBe(3);
    n = 0;
    const late = async () => (++n === 3 ? result({ input: 300, cacheRead: 2300 }) : result({ input: 2600 }));
    expect((await cacheProbe(late, "p/m")).verdict).toBe("cached");
    expect(await cacheProbe(async () => result({}), "p/m")).toMatchObject({ verdict: "silent", calls: 2 });
  });

  it("two checks start from a different first line, so one never warms the next", () => {
    expect(probeText("a").split("\n")[0]).not.toBe(probeText("b").split("\n")[0]);
    expect(probeText("a").split("\n").slice(1)).toEqual(probeText("b").split("\n").slice(1));
  });

  it("names a miss, and a provider that reports no tokens at all", () => {
    const c = (prompt: number, cacheRead = 0) => ({ prompt, cacheRead, cacheWrite: 0, ms: 1 });
    expect(cacheVerdict(c(2600), c(2600))).toBe("none");
    expect(cacheVerdict(c(0), c(0))).toBe("silent");
    expect(cacheVerdict(c(2600), c(2600, 2048))).toBe("cached");
  });

  it("a failed call fails the check with its reason", async () => {
    await expect(cacheProbe(async () => ({ ...result({}), model: "error", error: "bad key" }), "p/m")).rejects.toThrow("bad key");
  });
});
