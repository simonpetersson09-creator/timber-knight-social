import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Chess } from "chess.js";
import { useI18n } from "@/lib/i18n";
import { MAX_REVIEW_PLIES, stepReviewPly } from "@/lib/game-presentation";

export function MoveHistory({ game, reviewPly, onReview }: {
  game: Chess;
  reviewPly: number | null;
  onReview: (ply: number | null) => void;
}) {
  const { t } = useI18n();
  const historyLength = game.history().length;
  const currentPly = reviewPly ?? historyLength;
  const earliestPly = Math.max(0, historyLength - MAX_REVIEW_PLIES);
  const canGoBack = historyLength > 0 && currentPly > earliestPly;
  const canGoForward = reviewPly !== null;

  return (
    <div className="move-history" role="group" aria-label={t("moveHistory")}>
      <button
        type="button"
        className="move-history-arrow"
        aria-label={t("back")}
        data-review-direction="back"
        disabled={!canGoBack}
        onClick={() => onReview(stepReviewPly(historyLength, reviewPly, "back"))}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        className="move-history-arrow"
        aria-label={t("finalPosition")}
        data-review-direction="forward"
        disabled={!canGoForward}
        onClick={() => onReview(stepReviewPly(historyLength, reviewPly, "forward"))}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
