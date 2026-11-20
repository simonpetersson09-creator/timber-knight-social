import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Color } from "@/lib/storage";
import { PROMOTION_CHOICES, type PromotionChoice } from "@/lib/board-interaction";
import { useBackHandler } from "@/lib/back-handler";
import { Piece } from "./Piece";

type Props = {
  open: boolean;
  color: Color;
  title: string;
  onSelect: (piece: PromotionChoice) => void;
  onCancel: () => void;
};

export function PromotionPicker({ open, color, title, onSelect, onCancel }: Props) {
  const reduceMotion = useReducedMotion();
  useBackHandler(open, onCancel);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="promotion-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.14 }}
          onClick={onCancel}
        >
          <motion.div
            className="promotion-popover"
            role="dialog"
            aria-label={title}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 5 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="promotion-title">{title}</p>
            <div className="promo-grid">
              {PROMOTION_CHOICES.map((piece) => (
                <button
                  key={piece}
                  type="button"
                  className="promo-btn"
                  data-piece={piece}
                  aria-label={`${title} ${piece.toUpperCase()}`}
                  onClick={() => onSelect(piece)}
                >
                  <Piece color={color} type={piece} className="size-full" />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
