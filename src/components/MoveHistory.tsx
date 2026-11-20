import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Eye, ListOrdered } from "lucide-react";
import type { Chess } from "chess.js";
import { useI18n } from "@/lib/i18n";
import { useBackHandler } from "@/lib/back-handler";

export function MoveHistory({ game, canReview, reviewPly, onReview }: {
  game: Chess;
  canReview: boolean;
  reviewPly: number | null;
  onReview: (ply: number | null) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const history = game.history();
  const rows = Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => i);
  useBackHandler(open, () => setOpen(false));

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, history.length]);

  return <div className="move-history">
    <button className="move-history-toggle" aria-expanded={open} aria-controls="move-history-list" onClick={() => setOpen((value) => !value)}>
      <ListOrdered className="size-4" /><span>{t("moveHistory")}</span><span className="move-history-count">{history.length}</span><ChevronDown className="size-4" data-open={open} />
    </button>
    <AnimatePresence>
      {open && <motion.div id="move-history-list" ref={listRef} className="move-history-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
        {canReview && reviewPly !== null && <button className="move-history-final" onClick={() => onReview(null)}><Eye className="size-4" />{t("finalPosition")}</button>}
        {rows.length === 0 ? <div className="move-history-empty">—</div> : rows.map((row) => <div className="move-history-row" key={row}>
          <span>{row + 1}.</span>
          {[0, 1].map((offset) => {
            const index = row * 2 + offset;
            const san = history[index];
            return san ? <button key={offset} disabled={!canReview} data-active={reviewPly === index + 1 || (reviewPly === null && index === history.length - 1)} onClick={() => onReview(index + 1)}>{san}</button> : <span key={offset} />;
          })}
        </div>)}
      </motion.div>}
    </AnimatePresence>
  </div>;
}
