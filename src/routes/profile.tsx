import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useMe } from "@/hooks/use-me";
import { useI18n } from "@/lib/i18n";
import { getCred } from "@/lib/identity";
import { updateProfile } from "@/lib/players.functions";
import { AVATARS, COUNTRIES, NAME_MAX, flagOf } from "@/lib/profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil – Mr B Chess" },
      { name: "description", content: "Välj namn, avatar och land i Mr B Chess." },
      { property: "og:title", content: "Profil – Mr B Chess" },
      { property: "og:description", content: "Välj namn, avatar och land i Mr B Chess." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang } = useI18n();
  const { me } = useMe();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("♞");
  const [country, setCountry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (me) { setName(me.name ?? ""); setAvatar(me.avatar); setCountry(me.country); } }, [me]);
  const region = (cc: string) => { try { return new Intl.DisplayNames([lang], { type: "region" }).of(cc) ?? cc; } catch { return cc; } };
  const sorted = [...COUNTRIES].sort((a, b) => region(a).localeCompare(region(b), lang));

  async function save() {
    setBusy(true);
    try {
      const r = await updateProfile({ data: { ...getCred(), name, avatar, country } });
      if (r.error === "taken") toast.error(t("nameTaken"));
      else if (r.error === "too_long") toast.error(t("nameTooLong"));
      else if (r.error) toast.error(t("error"));
      else toast.success(t("saved"));
    } catch { toast.error(t("error")); } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-8">
      <PageHeader title={t("profile")} />
      <div className="panel flex flex-col items-center gap-2 p-5">
        <div className="profile-avatar">{avatar}</div>
        <p className="text-lg font-bold">{name.trim() || (me ? `#${me.player_number}` : "…")} {country && flagOf(country)}</p>
      </div>
      <div className="panel flex flex-col gap-3 p-4">
        <label className="field-label" htmlFor="name">{t("name")}</label>
        <input id="name" className="text-field" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder={me ? `#${me.player_number}` : ""} />
        <p className="-mt-1 text-xs text-muted-foreground">{t("nameHint")} · {[...name].length}/{NAME_MAX}</p>
        <p className="field-label">{t("avatar")}</p>
        <div className="avatar-grid">
          {AVATARS.map((a) => <button key={a} data-active={avatar === a} onClick={() => setAvatar(a)} aria-label={a}>{a}</button>)}
        </div>
        <label className="field-label" htmlFor="country">{t("country")}</label>
        <select id="country" className="text-field" value={country ?? ""} onChange={(e) => setCountry(e.target.value || null)}>
          <option value="">{t("noCountry")}</option>
          {sorted.map((c) => <option key={c} value={c}>{flagOf(c)} {region(c)}</option>)}
        </select>
        <button className="action-btn action-gold mt-2" disabled={!me || busy} onClick={save}>{t("save")}</button>
      </div>
    </main>
  );
}
