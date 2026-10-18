import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Credential } from "@earendil-works/pi-ai";
import { explainModelError, FileCredentialStore } from "../src/models.js";

const oauth = (refresh: string, expires: number) => ({ type: "oauth", refresh, access: `a-${refresh}`, expires }) as unknown as Credential;

describe("the auth.json credential store", () => {
  it("refreshes an OAuth token once when two calls find it expired together", async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "auth-")), "auth.json");
    fs.writeFileSync(file, JSON.stringify({ anthropic: oauth("r1", 0) }));
    const sent: string[] = [];
    // what pi does: re-check under the store's lock, refresh only if still expired
    const refresh = (store: FileCredentialStore) =>
      store.modify("anthropic", async (current) => {
        const c = current as unknown as { refresh: string; expires: number };
        if (c.expires > Date.now()) return undefined as unknown as Credential;
        sent.push(c.refresh);
        await new Promise((r) => setTimeout(r, 30));
        return oauth(`${c.refresh}+`, Date.now() + 3_600_000);
      });
    // two stores over the same file, as two model services would have
    await Promise.all([refresh(new FileCredentialStore(file)), refresh(new FileCredentialStore(file))]);
    expect(sent).toEqual(["r1"]);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).anthropic.refresh).toBe("r1+");
  });

  it("says to sign in again when the refresh token is refused", () => {
    const raw = 'OAuth refresh failed for anthropic: Anthropic token refresh request failed. url=https://platform.claude.com/v1/oauth/token; details=Error: HTTP request failed. status=400; body={"error": "invalid_grant", "error_description": "Refresh token not found or invalid"}; stack=Error: ...';
    expect(explainModelError(raw)).toBe("the sign-in to anthropic is no longer valid (its refresh token was refused). Sign in again: Settings > Connections > anthropic.");
    expect(explainModelError("HTTP 429: slow down")).toBe("HTTP 429: slow down");
  });
});
