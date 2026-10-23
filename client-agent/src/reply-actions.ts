/** Apply proposal belongs to plan mode: there Molfar only reads and proposes, and the user
 *  approves by leaving the mode. In the other modes Molfar acts, or asks in a card, so the
 *  button under every reply would offer something nobody proposed. */
export function canApplyProposal(mode: "normal" | "plan" | "accept"): boolean {
  return mode === "plan"
}
