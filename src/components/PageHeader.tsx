import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
export function PageHeader({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <header className="flex items-center gap-3">
      <Link to="/" className="action-ghost flex size-10 items-center justify-center rounded-full" aria-label={t("back")}><ArrowLeft className="size-5" /></Link>
      <h1 className="brand-wordmark text-3xl">{title}</h1>
    </header>
  );
}
