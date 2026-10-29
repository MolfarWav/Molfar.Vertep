/**
 * Environment variables were CHRYSALIS_* up to 1.7.x and are MOLFAR_VERTEP_*
 * now (#66). Both names are read, the new one first, so scripts, shortcuts
 * and container setups written for the old ones keep working. The update
 * variables are the one thing the engine still sets under both names: the
 * process it starts may be an older version (after a failed update), which
 * knows no other (src/self-update.ts).
 */
export const ENV_PREFIX = "MOLFAR_VERTEP_";
export const LEGACY_ENV_PREFIX = "CHRYSALIS_";

/** The value of MOLFAR_VERTEP_<name>, else of CHRYSALIS_<name>. An empty
 *  value counts as unset. */
export function readEnv(name: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env[ENV_PREFIX + name] || env[LEGACY_ENV_PREFIX + name] || undefined;
}

/** Forget a variable under both names (one meant for this start only). */
export function clearEnv(name: string, env: NodeJS.ProcessEnv = process.env): void {
  delete env[ENV_PREFIX + name];
  delete env[LEGACY_ENV_PREFIX + name];
}
