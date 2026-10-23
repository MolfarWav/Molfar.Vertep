/**
 * The shell's notifications for a question that waits, a run that finished or failed.
 */
import { describe, expect, it } from "bun:test";
import { noticeTag, shouldShowNotice, type NoticeState } from "../client/src/notice-rules.js";

const looking: NoticeState = { enabled: true, permission: "granted", visible: true, focused: true, agentOnScreen: true };

describe("when the shell tells the user", () => {
  it("stays quiet while the user looks at Molfar", () => {
    expect(shouldShowNotice(looking)).toBe(false);
  });

  it("speaks when the window is in the background, another tab or app is on screen, or Molfar's tab is not", () => {
    expect(shouldShowNotice({ ...looking, focused: false })).toBe(true);
    expect(shouldShowNotice({ ...looking, visible: false })).toBe(true);
    expect(shouldShowNotice({ ...looking, agentOnScreen: false })).toBe(true);
  });

  it("never speaks without the switch or the browser's permission", () => {
    const away = { ...looking, focused: false };
    expect(shouldShowNotice({ ...away, enabled: false })).toBe(false);
    for (const permission of ["default", "denied", "unsupported"]) expect(shouldShowNotice({ ...away, permission })).toBe(false);
  });

  it("gives one tag to the question of a chat and one to its run, so repeats replace each other", () => {
    expect(noticeTag("ask", "c1")).toBe("molfar-ask-c1");
    expect(noticeTag("done", "c1")).toBe(noticeTag("error", "c1"));
    expect(noticeTag("done", "c1")).not.toBe(noticeTag("done", "c2"));
  });
});
