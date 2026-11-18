import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Piece } from "@/components/Piece";
import { useI18n } from "@/lib/i18n";
import { isNative, isPreviewHost } from "@/lib/native";
import { webPathAllowed } from "@/lib/online-rules";
import { StoreButtons } from "@/components/StoreButtons";

/** On the public website only a download page is shown; /join, /legal and /admin stay open. */
export function WebGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [gate, setGate] = useState(false);
  useEffect(() => setGate(!isNative() && !isPreviewHost() && !webPathAllowed(pathname)), [pathname]);
  if (!gate) return <>{children}</>;
  return <DownloadPage />;
}

export function DownloadPage() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Piece color="w" type="k" className="size-28 drop-shadow-2xl" />
      <h1 className="brand-wordmark text-5xl">Mr B Chess</h1>
      <p className="brand-tagline">{t("tagline")}</p>
      <p className="max-w-xs text-muted-foreground">{t("downloadText")}</p>
      <StoreButtons />
      <a href="/legal" className="text-xs text-muted-foreground underline">{t("legal")}</a>
    </main>
  );
}
