import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useI18n, type Key } from "@/lib/i18n";

export const Route = createFileRoute("/rules")({
  head: () => ({ meta: [
    { title: "Schackregler – Mr B Chess" },
    { name: "description", content: "Tydlig hjälp om rockad, en passant, bondeförvandling, patt, oavgjort och schackklockor." },
    { property: "og:title", content: "Schackregler – Mr B Chess" },
    { property: "og:description", content: "Lär dig schackens särskilda drag, regler för oavgjort och klockor i Mr B Chess." },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: RulesPage,
});

const RULES: [Key, Key][] = [
  ["ruleCastling", "ruleCastlingText"], ["ruleEnPassant", "ruleEnPassantText"],
  ["rulePromotion", "rulePromotionText"], ["ruleStalemate", "ruleStalemateText"],
  ["ruleDraws", "ruleDrawsText"], ["ruleClocks", "ruleClocksText"], ["ruleMoves", "ruleMovesText"],
];

function RulesPage() {
  const { t } = useI18n();
  return <main className="page-screen space-y-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
    <PageHeader title={t("rules")} />
    <p className="text-sm leading-6 text-muted-foreground">{t("rulesIntro")}</p>
    <div className="space-y-3">{RULES.map(([title, text]) => <details key={title} className="panel p-4" name="chess-rules">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-foreground">{t(title)}</summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(text)}</p>
    </details>)}</div>
  </main>;
}
