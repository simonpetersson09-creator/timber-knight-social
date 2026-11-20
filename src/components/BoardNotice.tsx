import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bot, Crown, Handshake, ShieldAlert, type LucideIcon } from "lucide-react";

export type BoardNoticeKind = "draw" | "check" | "checkmate" | "info";

export type BoardNoticeData = {
  text: string;
  kind: BoardNoticeKind;
};

const ICONS: Record<BoardNoticeKind, LucideIcon> = {
  draw: Handshake,
  check: ShieldAlert,
  checkmate: Crown,
  info: Bot,
};

export function BoardNotice({ notice }: { notice: BoardNoticeData | null }) {
  const reduceMotion = useReducedMotion();
  const Icon = notice ? ICONS[notice.kind] : Handshake;
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice.text}
          className="board-notice"
          data-tone={notice.kind}
          role={notice.kind === "checkmate" ? "alert" : "status"}
          initial={reduceMotion ? { opacity: 1, x: "-50%", y: "-50%" } : { opacity: 0, scale: 0.85, x: "-50%", y: "-40%" }}
          animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
          exit={reduceMotion ? { opacity: 0, x: "-50%", y: "-50%" } : { opacity: 0, scale: 0.92, x: "-50%", y: "-50%" }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 24 }}
        >
          <span className="board-notice-icon"><Icon className="size-4" /></span>
          {notice.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
