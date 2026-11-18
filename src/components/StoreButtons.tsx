import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/store-links";
export function StoreButtons() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <a className="action-btn action-gold" href={APP_STORE_URL} target="_blank" rel="noreferrer"> App Store</a>
      <a className="action-btn action-blue" href={GOOGLE_PLAY_URL} target="_blank" rel="noreferrer">▶ Google Play</a>
    </div>
  );
}
