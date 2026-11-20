import { describe, expect, it } from "vitest";
import { hourlyJobOutcome } from "./job-rules";

describe("hourly job outcome", () => {
  it("reports a run with no changed rows as noop", () => {
    expect(hourlyJobOutcome(0, 0, false)).toMatchObject({ result: "noop", changed: 0 });
  });

  it("reports only actually changed games, reminders and cleanup rows", () => {
    expect(hourlyJobOutcome(2, 1, false, 4)).toMatchObject({ result: "updated", changed: 7, cleaned: 4 });
  });

  it("never reports an exhausted time budget as complete", () => {
    expect(hourlyJobOutcome(0, 0, true)).toMatchObject({ result: "partial", truncated: true });
  });
});
