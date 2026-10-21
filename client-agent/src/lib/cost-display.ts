/** Does the page show prices for runs on this model? Not when the cost checks
 *  are off for it (the user's switch, globally or for its connection, or a
 *  model on their own machine): then nobody asked to see money, and the token
 *  counts stay. `ref` is "<provider>/<model>"; none means the first shown
 *  model, the one the pickers call current. An engine that does not send the
 *  flag counts as on. */
export function modelShowsCost(
  models: readonly { provider: string; modelId: string; shown: boolean; costChecks?: boolean }[],
  ref: string | null | undefined,
): boolean {
  const m = ref ? models.find((x) => `${x.provider}/${x.modelId}` === ref) : models.find((x) => x.shown)
  return m?.costChecks !== false
}
