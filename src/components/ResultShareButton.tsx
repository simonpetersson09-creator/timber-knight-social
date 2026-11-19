import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { shareText } from "@/lib/share";
import { useI18n } from "@/lib/i18n";

export function ResultShareButton({ title, text }: { title: string; text: string }) {
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  return <button className="action-btn action-ghost" disabled={busy} onClick={async () => {
    setBusy(true);
    try {
      const result = await shareText(title, text);
      if (result === "copied") toast.success(t("shareCopied"));
    } catch { toast.error(t("shareError")); }
    finally { setBusy(false); }
  }}><Share2 className="size-4" />{t("shareResult")}</button>;
}
