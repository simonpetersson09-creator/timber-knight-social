import { isNative } from "./native";
import { getMeta, setMeta } from "./meta";
import { shouldAskRating } from "./online-rules";
/** Counts a finished game and asks for a store rating after 5, 15 and 35 games (max 3 times). */
export async function onGameFinished() {
  const m = getMeta();
  const finished = m.finished + 1;
  setMeta({ finished });
  if (!isNative() || !shouldAskRating(finished, m.rateAsked)) return;
  setMeta({ rateAsked: m.rateAsked + 1 });
  try { const { InAppReview } = await import("@capacitor-community/in-app-review"); await InAppReview.requestReview(); } catch { /* ignore */ }
}
