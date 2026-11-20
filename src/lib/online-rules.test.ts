import { describe, expect, it } from "vitest";
import { canCloseOnlineGame, DAY, HOUR, INVITE_TTL_MS, LOBBY_TTL_MS, moveDeadline, QUICK_WAIT_MS, shouldAskRating, shouldSendPlayReminder, statsFor, webPathAllowed } from "./online-rules";

const m = (white: string, black: string, result: "w" | "b" | "d", counts = true) => ({ white, black, result, counts, finished_at: "" });
describe("online rules", () => {
  it("searches for an online opponent for exactly 20 seconds before computer fallback", () => { expect(QUICK_WAIT_MS).toBe(20_000); });
  it("invites last 24 h, lobbies 6 h", () => { expect(INVITE_TTL_MS).toBe(24 * HOUR); expect(LOBBY_TTL_MS).toBe(6 * HOUR); });
  it("lets participants delete waiting and active games, but never finished history", () => {
    const game = { status: "waiting", host: "host", invitee: "guest", white: null, black: null };
    expect(canCloseOnlineGame(game, "host")).toBe(true);
    expect(canCloseOnlineGame(game, "guest")).toBe(true);
    expect(canCloseOnlineGame(game, "stranger")).toBe(false);
    expect(canCloseOnlineGame({ ...game, status: "active", white: "host", black: "guest" }, "guest")).toBe(true);
    expect(canCloseOnlineGame({ ...game, status: "finished" }, "host")).toBe(false);
  });
  it("resigned games do not affect stats", () => {
    const s = statsFor("a", [m("a", "b", "w"), m("a", "b", "b", false), m("b", "a", "b"), m("a", "c", "d")]);
    expect(s).toEqual({ played: 3, wins: 2, losses: 0, draws: 1, winRate: 67, streak: 2 });
  });
  it("inactive player is reminded after 24 h and loses after 48 h", () => {
    expect(moveDeadline(0, 23 * HOUR)).toBe("ok");
    expect(moveDeadline(0, 24 * HOUR)).toBe("remind");
    expect(moveDeadline(0, 48 * HOUR)).toBe("timeout");
  });
  it("play reminder after 7 days, at 18 local time, max once a week", () => {
    const at18 = new Date("2026-11-18T17:00:00Z"); // 18:00 Stockholm
    const old = new Date(at18.getTime() - 8 * DAY).toISOString();
    const base = { last_played: old, last_reminder: null, tz: "Europe/Stockholm", created_at: old };
    expect(shouldSendPlayReminder(base, at18)).toBe(true);
    expect(shouldSendPlayReminder(base, new Date("2026-11-18T16:00:00Z"))).toBe(false);
    expect(shouldSendPlayReminder({ ...base, last_played: new Date(at18.getTime() - 6 * DAY).toISOString() }, at18)).toBe(false);
    expect(shouldSendPlayReminder({ ...base, last_reminder: new Date(at18.getTime() - 3 * DAY).toISOString() }, at18)).toBe(false);
  });
  it("asks for rating after 5, 15 and 35 games, max 3 times", () => {
    expect(shouldAskRating(4, 0)).toBe(false);
    expect(shouldAskRating(5, 0)).toBe(true);
    expect(shouldAskRating(14, 1)).toBe(false);
    expect(shouldAskRating(15, 1)).toBe(true);
    expect(shouldAskRating(35, 2)).toBe(true);
    expect(shouldAskRating(500, 3)).toBe(false);
  });
  it("web shows only join and legal pages", () => {
    expect(webPathAllowed("/join")).toBe(true);
    expect(webPathAllowed("/legal")).toBe(true);
    expect(webPathAllowed("/")).toBe(false);
    expect(webPathAllowed("/play")).toBe(false);
  });
});
