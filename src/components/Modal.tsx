import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export function Modal({ open, onClose, children }: { open: boolean; onClose?: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="panel modal-panel"
            initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
