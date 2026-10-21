/**
 * Cost checks: the agent's questions about money. run_budget (and the plan
 * gate that waits for its answer), the confirmation before a paid test
 * generation, and the one before a paid picture. A model on the user's own
 * machine costs nothing per call, so there auto turns them off; the user can
 * also switch them off or on for everything (#77).
 */
import fs from "node:fs";
import { readEnv } from "../env.js";
import { isLocalEndpoint } from "../providers/custom.js";
import { readConnections, type ConnectionDef } from "../connections.js";
import type { UserPaths } from "../paths.js";

export type CostChecksMode = "auto" | "on" | "off";
export const COST_CHECKS_MODES: readonly CostChecksMode[] = ["auto", "on", "off"];

export const isCostChecksMode = (v: unknown): v is CostChecksMode =>
  typeof v === "string" && (COST_CHECKS_MODES as readonly string[]).includes(v);

/** The user's choice from settings.json (`costChecks`); auto when unset.
 *  MOLFAR_VERTEP_COST_CHECKS=off switches the checks off for the whole
 *  instance (a container, a machine with only local models). */
export function readCostChecksMode(settingsFile: string, env: NodeJS.ProcessEnv = process.env): CostChecksMode {
  if (readEnv("COST_CHECKS", env)?.trim().toLowerCase() === "off") return "off";
  try {
    const v = (JSON.parse(fs.readFileSync(settingsFile, "utf8")) as { costChecks?: unknown }).costChecks;
    return isCostChecksMode(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

/** Does a question about money apply to this model? `baseUrl` is the model's
 *  endpoint; a loopback, LAN or single-label host is the user's own machine. */
export function costChecksApply(mode: CostChecksMode, model: { baseUrl?: unknown } | null | undefined): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  const url = typeof model?.baseUrl === "string" ? model.baseUrl : "";
  return !(url && (isLocalEndpoint(url) || isHomeName(url)));
}

/** Names a container or a home network uses (host.docker.internal, nas.lan),
 *  which isLocalEndpoint, a safety check, does not count as local. */
function isHomeName(url: string): boolean {
  try {
    return /\.(internal|lan|home\.arpa)$/.test(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** MOLFAR_VERTEP_COST_CHECKS=off: the instance says "never", and no setting
 *  of a connection overrides it. */
export function costChecksOffByEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return readEnv("COST_CHECKS", env)?.trim().toLowerCase() === "off";
}

/** The override a connection carries for the models it serves (#91); the
 *  model's `provider` is the connection id, or the builtin provider id the
 *  connection labels. undefined = follow the global setting. */
export function connectionCostChecks(connections: Record<string, ConnectionDef>, provider: string | undefined): CostChecksMode | undefined {
  if (!provider) return undefined;
  for (const [id, def] of Object.entries(connections)) {
    const target = def.oauthProvider === "radius" ? "radius" : (def.providerId ?? id);
    if (target === provider && isCostChecksMode(def.costChecks)) return def.costChecks;
  }
  return undefined;
}

/** The mode that decides for one model: the connection's override when it has
 *  one, else the global setting. The instance-wide env switch beats both. */
export function resolveCostChecksMode(global: CostChecksMode, override: CostChecksMode | undefined, env: NodeJS.ProcessEnv = process.env): CostChecksMode {
  if (costChecksOffByEnv(env)) return "off";
  return override ?? global;
}

type CostPaths = Pick<UserPaths, "settings" | "connections">;

/** The effective mode for a model, read from the user's settings and
 *  connections files. */
export function effectiveCostChecksMode(paths: CostPaths, model: { provider?: unknown } | null | undefined, env: NodeJS.ProcessEnv = process.env): CostChecksMode {
  const global = readCostChecksMode(paths.settings, env);
  const provider = typeof model?.provider === "string" ? model.provider : undefined;
  return resolveCostChecksMode(global, connectionCostChecks(readConnections(paths as UserPaths).connections, provider), env);
}

/** Does a question about money (and a price on screen) apply to this model,
 *  with the connection's override and the global setting taken together? */
export function costChecksFor(paths: CostPaths, model: { provider?: unknown; baseUrl?: unknown } | null | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  return costChecksApply(effectiveCostChecksMode(paths, model, env), model);
}
