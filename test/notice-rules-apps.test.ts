// How a message from an app reaches the user (client/src/notice-rules.ts, appNoticeMode).
import { describe, expect, it } from "bun:test";
import { appNoticeMode, type AppNoticeState } from "../client/src/notice-rules.js";

const base: AppNoticeState = { appEnabled: true, systemEnabled: true, permission: "granted", visible: true, focused: true, appOnScreen: false };

describe("appNoticeMode", () => {
  it("a popup when the user is in the shell, somewhere else", () => {
    expect(appNoticeMode(base)).toBe("popup");
  });
  it("nothing when the user is looking at the app (it shows the message itself)", () => {
    expect(appNoticeMode({ ...base, appOnScreen: true })).toBe("none");
  });
  it("a system notification when the window is not in front, if the user and the browser allow it", () => {
    expect(appNoticeMode({ ...base, focused: false })).toBe("system");
    expect(appNoticeMode({ ...base, visible: false })).toBe("system");
    expect(appNoticeMode({ ...base, focused: false, appOnScreen: true })).toBe("system");
    expect(appNoticeMode({ ...base, focused: false, systemEnabled: false })).toBe("none");
    expect(appNoticeMode({ ...base, focused: false, permission: "denied" })).toBe("none");
    expect(appNoticeMode({ ...base, focused: false, permission: "default" })).toBe("none");
    expect(appNoticeMode({ ...base, focused: false, permission: "unsupported" })).toBe("none");
  });
  it("nothing at all when the user switched the app off", () => {
    for (const s of [base, { ...base, focused: false }, { ...base, visible: false }]) expect(appNoticeMode({ ...s, appEnabled: false })).toBe("none");
  });
});
