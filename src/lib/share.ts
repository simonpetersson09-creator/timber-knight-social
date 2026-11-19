import { isNative } from "./native";

/** Uses the phone's share sheet in the app and the system Web Share API elsewhere. */
export async function shareText(title: string, text: string): Promise<"shared" | "cancelled" | "copied"> {
  try {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      const capability = await Share.canShare();
      if (capability.value) {
        await Share.share({ title, text, dialogTitle: title });
        return "shared";
      }
    } else if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (error) {
    if (error instanceof Error && /cancel|abort/i.test(error.message)) return "cancelled";
    throw error;
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
