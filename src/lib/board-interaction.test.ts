import { describe, expect, it } from "vitest";
import { PROMOTION_CHOICES, squareAtPoint } from "./board-interaction";

const rect = { left: 100, top: 200, width: 400, height: 400 };

describe("board interaction", () => {
  it("offers all four legal promotion pieces, with queen first", () => {
    expect(PROMOTION_CHOICES).toEqual(["q", "r", "b", "n"]);
  });

  it("maps a drop to the correct square with white at the bottom", () => {
    expect(squareAtPoint({ x: 125, y: 575 }, rect, "w")).toBe("a1");
    expect(squareAtPoint({ x: 475, y: 225 }, rect, "w")).toBe("h8");
  });

  it("mirrors both axes when black is at the bottom", () => {
    expect(squareAtPoint({ x: 125, y: 575 }, rect, "b")).toBe("h8");
    expect(squareAtPoint({ x: 475, y: 225 }, rect, "b")).toBe("a1");
  });

  it("rejects drops outside every board edge", () => {
    expect(squareAtPoint({ x: 99, y: 300 }, rect, "w")).toBeNull();
    expect(squareAtPoint({ x: 500, y: 300 }, rect, "w")).toBeNull();
    expect(squareAtPoint({ x: 300, y: 199 }, rect, "w")).toBeNull();
    expect(squareAtPoint({ x: 300, y: 600 }, rect, "w")).toBeNull();
  });
});
