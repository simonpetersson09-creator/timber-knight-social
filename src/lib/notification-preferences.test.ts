import { describe, expect, it } from "vitest";
import { allowsNotification } from "./notification-preferences";
const prefs = { notify: true, notify_turn: true, notify_reminders: true, notify_play: true };
describe("independent notification choices", () => {
  it("turn notifications can be disabled without disabling invites", () => {
    expect(allowsNotification("pushTurn", { ...prefs, notify_turn: false })).toBe(false);
    expect(allowsNotification("pushInvite", { ...prefs, notify_turn: false })).toBe(true);
  });
  it("move reminders follow their own choice", () => expect(allowsNotification("pushRemindMove", { ...prefs, notify_reminders: false })).toBe(false));
  it("play reminders follow their own choice", () => expect(allowsNotification("pushPlayReminder", { ...prefs, notify_play: false })).toBe(false));
  it("master switch disables all notifications", () => expect(allowsNotification("pushInvite", { ...prefs, notify: false })).toBe(false));
});