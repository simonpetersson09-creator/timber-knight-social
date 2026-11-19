import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-5 py-10 leading-relaxed">
      <h1 className="brand-wordmark text-4xl">Mr B Chess Legal</h1>
      <section className="space-y-2 p-5">
        <h2 className="text-xl font-bold">Support</h2>
        <p>Frågor eller problem? Mejla <a className="underline" href="mailto:support@example.com">support@example.com</a>.</p>
      </section>
      <section id="privacy" className="space-y-2 p-5">
        <h2 className="text-xl font-bold">Integritetspolicy</h2>
        <p>Mr B Chess kräver ingen inloggning. Appen skapar en anonym spelaridentitet på din telefon. Vi sparar det namn, den avatar och det land du själv väljer, dina onlinepartier, vänner, snabbchattfraser och en notistoken om du tillåter notiser.</p>
        <p>Vi sparar också vilken typ av telefon (iOS/Android) som använt appen per dag samt felrapporter, för att förbättra appen. Annonser visas via Google AdMob, som kan använda data enligt de val du gör i Googles samtyckesruta och Apples fråga om spårning. Du kan ändra dina annonsval i appens inställningar.</p>
        <p>Du kan radera alla dina data när som helst under Inställningar → Radera mina data.</p>
      </section>
      <section className="panel space-y-2 p-5">
        <h2 className="text-xl font-bold">Användarvillkor</h2>
        <p>Appen tillhandahålls i befintligt skick. Var schysst mot andra spelare; olämpliga namn kan tas bort. Partier där någon är inaktiv för länge avgörs som förlust för den inaktiva spelaren.</p>
      </section>
      <section className="panel space-y-2 p-5">
        <h2 className="text-xl font-bold">app-ads.txt</h2>
        <p>Finns på <a className="underline" href="/app-ads.txt">/app-ads.txt</a>.</p>
      </section>
    </main>
  );
}
