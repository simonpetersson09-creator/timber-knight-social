import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crown, Handshake, ShieldAlert } from "lucide-react";

export type BoardNoticeData = {
  text: string;
  kind: "draw" | "check" | "checkmate";
};

export function BoardNotice({ notice }: { notice: BoardNoticeData | null }) {
  const reduceMotion = useReducedMotion();
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
          {notice.kind === "checkmate" ? <Crown className="size-5" /> : notice.kind === "check" ? <ShieldAlert className="size-5" /> : <Handshake className="size-5" />}
          {notice.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
