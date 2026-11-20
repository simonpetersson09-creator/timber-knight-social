import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { BrandIcon } from "@/components/BrandIcon";
import { useI18n } from "@/lib/i18n";
import { isNative, isPreviewHost } from "@/lib/native";
import { webPathAllowed } from "@/lib/online-rules";
import { StoreButtons } from "@/components/StoreButtons";

/** On the public website only a download page is shown; /join, /legal and /admin stay open. */
export function WebGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const router = useRouter();
  const [runtime, setRuntime] = useState<"pending" | "app" | "download">("pending");
  useEffect(() => setRuntime(isNative() || isPreviewHost() ? "app" : "download"), []);
  const publicPath = webPathAllowed(pathname);
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "").toLowerCase() : pathname;
  const knownPath = publicPath || Object.prototype.hasOwnProperty.call(router.routesByPath, normalizedPath);
  // Unknown routes render only the router's 404; normalized protected routes must never bypass the gate.
  if (!knownPath) return <>{children}</>;
  if (runtime === "pending") return publicPath ? <>{children}</> : null;
  if (runtime === "download" && !publicPath) return <DownloadPage />;
  return <>{children}</>;
}

export function DownloadPage() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <BrandIcon className="size-40" />
      <h1 className="brand-wordmark text-5xl">Mr B Chess</h1>
      <p className="brand-tagline">{t("tagline")}</p>
      <p className="max-w-xs text-muted-foreground">{t("downloadText")}</p>
      <StoreButtons />
      <a href="/legal" className="text-xs text-muted-foreground underline">{t("legal")}</a>
    </main>
  );
}
