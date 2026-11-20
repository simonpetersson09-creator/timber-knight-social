import { beforeEach, describe, expect, it, vi } from "vitest";
import { Share } from "@capacitor/share";
import { copyText, shareLink, shareText } from "./share";
import { isNative } from "./native";

vi.mock("./native", () => ({ isNative: vi.fn(() => false) }));
vi.mock("@capacitor/share", () => ({
  Share: { canShare: vi.fn(), share: vi.fn() },
}));

const clipboardWrite = vi.fn<(text: string) => Promise<void>>();
const webShare = vi.fn<(data: ShareData) => Promise<void>>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isNative).mockReturnValue(false);
  clipboardWrite.mockResolvedValue();
  webShare.mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboardWrite } });
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
});

describe("copyText", () => {
  it("uses the clipboard API when it works", async () => {
    await copyText("ABC123");
    expect(clipboardWrite).toHaveBeenCalledWith("ABC123");
  });

  it("uses the WebView fallback when the clipboard API fails", async () => {
    clipboardWrite.mockRejectedValue(new Error("denied"));
    const exec = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: exec });
    await copyText("ABC123");
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("reports a copy failure instead of pretending it succeeded", async () => {
    clipboardWrite.mockRejectedValue(new Error("denied"));
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => false) });
    await expect(copyText("ABC123")).rejects.toThrow("copy_failed");
  });
});

describe("sharing controls", () => {
  it("passes the invitation URL through the native share sheet", async () => {
    vi.mocked(isNative).mockReturnValue(true);
    vi.mocked(Share.canShare).mockResolvedValue({ value: true });
    vi.mocked(Share.share).mockResolvedValue({ activityType: "test" });
    await expect(shareLink("Mr B Chess", "Spela", "https://example.test/join?code=ABC123")).resolves.toBe("shared");
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ url: "https://example.test/join?code=ABC123" }));
  });

  it("treats a closed web share sheet as cancelled, not an error", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: webShare });
    webShare.mockRejectedValue(new DOMException("Cancelled", "AbortError"));
    await expect(shareLink("Mr B Chess", "Spela", "https://example.test")).resolves.toBe("cancelled");
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it("copies result text when no share sheet exists", async () => {
    await expect(shareText("Mr B Chess", "Du vann!")).resolves.toBe("copied");
    expect(clipboardWrite).toHaveBeenCalledWith("Du vann!");
  });
});
