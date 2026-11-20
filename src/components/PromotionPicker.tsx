import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import type { Color } from "@/lib/storage";
import { PROMOTION_CHOICES, type PromotionChoice } from "@/lib/board-interaction";
import { useBackHandler } from "@/lib/back-handler";
import { useI18n } from "@/lib/i18n";
import { Piece, PIECE_SYMBOLS } from "./Piece";

type Props = {
  open: boolean;
  color: Color;
  title: string;
  onSelect: (piece: PromotionChoice) => void;
  onCancel: () => void;
};

export function PromotionPicker({ open, color, title, onSelect, onCancel }: Props) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const wasOpen = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpen.current = open;
  useBackHandler(open, onCancel);

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="promotion-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.14 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-label={title}
              aria-describedby={undefined}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
              }}
            >
              <motion.div className="promotion-positioner">
                <motion.div
                  className="promotion-popover"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 5 }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
              >
                <p className="promotion-title">{title}</p>
                <div className="promo-grid">
                  {PROMOTION_CHOICES.map((piece) => (
                    <button
                      key={piece}
                      type="button"
                      className="promo-btn"
                      data-piece={piece}
                      aria-label={`${title}: ${t(color === "w" ? "ivory" : "black")} ${PIECE_SYMBOLS[color][piece]}`}
                      onClick={() => onSelect(piece)}
                    >
                      <Piece color={color} type={piece} className="size-full" />
                    </button>
                  ))}
                </div>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
