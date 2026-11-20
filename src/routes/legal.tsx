import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PRIVACY_POLICY_LABEL, PRIVACY_POLICY_URL } from "@/lib/legal-links";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Mr B Chess Legal – support, integritet och villkor" },
      { name: "description", content: "Support, integritetspolicy och användarvillkor för Mr B Chess." },
      { property: "og:title", content: "Mr B Chess Legal" },
      { property: "og:description", content: "Support, integritetspolicy och användarvillkor för Mr B Chess." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Legal,
});

function Legal() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-5 py-10 leading-relaxed">
      <h1 className="brand-wordmark text-4xl">Mr B Chess Legal</h1>
      <section className="space-y-2 p-5">
        <h2 className="text-xl font-bold">{t("legalSupport")}</h2>
        <p>{t("legalSupportText")} <a className="underline" href="mailto:simon@shiningdays.se">simon@shiningdays.se</a>.</p>
      </section>
      <section id="privacy" className="space-y-2 p-5">
        <h2 className="text-xl font-bold">{t("privacy")}</h2>
        <p>{t("legalPrivacy1")}</p>
        <p>{t("legalPrivacy2")}</p>
        <p>{t("legalPrivacy3")}</p>
        <p><a className="underline break-all" href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">{PRIVACY_POLICY_LABEL}</a></p>
      </section>
      <section className="panel space-y-2 p-5">
        <h2 className="text-xl font-bold">{t("legalTerms")}</h2>
        <p>{t("legalTermsText")}</p>
      </section>
      <section className="panel space-y-2 p-5">
        <h2 className="text-xl font-bold">app-ads.txt</h2>
        <p>{t("legalAppAdsText")} <a className="underline" href="/app-ads.txt">/app-ads.txt</a>.</p>
      </section>
    </main>
  );
}
