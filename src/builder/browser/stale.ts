/** The deps bundle a dev meta (the engine's `dev`, or a build output's `meta`) points at, or null. */
export function depsOf(meta: unknown): string | null {
  const d = (meta as { depsJs?: unknown } | null | undefined)?.depsJs;
  return typeof d === "string" ? d : null;
}

/**
 * A builder session carries the dev meta of the last build it knew: a full build keeps the deps
 * bundle that meta names instead of resending it. When another tab or device has built since
 * (an app update ran its full build elsewhere), dist holds a different deps bundle, or none, and
 * the old one is gone: the output is refused ("keeps dev/deps-x.js, which dist does not have"),
 * the session is dropped and a retry succeeds (#26). True when the engine's dist no longer
 * matches what the session builds on, so the session should be replaced before it builds.
 */
export function sessionStale(engineDev: unknown, sessionDeps: string | null): boolean {
  return depsOf(engineDev) !== sessionDeps;
}
