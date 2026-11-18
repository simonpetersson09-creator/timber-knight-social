import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Piece } from "@/components/Piece";
import { StoreButtons } from "@/components/StoreButtons";
import { useI18n } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { isNative, isPreviewHost } from "@/lib/native";
import { joinGame } from "@/lib/online.functions";
import { askPushOnFirstOnline } from "@/lib/push";

export const Route = createFileRoute("/join")({
  validateSearch: z.object({ code: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Gå med i parti – Mr B Chess" },
      { name: "description", content: "Du är inbjuden till ett parti Mr B Chess. Öppna appen för att spela." },
      { property: "og:title", content: "Gå med i parti – Mr B Chess" },
      { property: "og:description", content: "Du är inbjuden till ett parti Mr B Chess. Öppna appen för att spela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Join,
});

function Join() {
  const { code } = Route.useSearch();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [state, setState] = useState<"web" | "joining" | "not_found" | "expired" | null>(null);
  useEffect(() => {
    if (!isNative() && !isPreviewHost()) { setState("web"); return; }
    if (!code) { setState("not_found"); return; }
    setState("joining");
    void askPushOnFirstOnline();
    joinGame({ data: { ...getCred(), code } }).then((r) => {
      if (r.result === "ok") void navigate({ to: "/match", search: { id: r.id }, replace: true });
      else setState(r.result);
    }).catch(() => setState("not_found"));
  }, [code, navigate]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Piece color="w" type="n" className="size-24 drop-shadow-2xl" />
      <h1 className="brand-wordmark text-4xl">Mr B Chess</h1>
      {state === "web" && (<><p className="max-w-xs">{t("joinWeb")}</p>{code && <div className="friend-code">{code}</div>}<StoreButtons /></>)}
      {state === "joining" && <p>{t("searching")}</p>}
      {(state === "not_found" || state === "expired") && (<><p>{state === "expired" ? t("expired") : t("notFound")}</p><button className="action-btn action-gold max-w-xs" onClick={() => navigate({ to: "/" })}>{t("home")}</button></>)}
    </main>
  );
}
