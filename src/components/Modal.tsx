import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useBackHandler } from "@/lib/back-handler";

export function Modal({ open, onClose, children, title = "Mr B Chess" }: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
}) {
  useBackHandler(open && !!onClose, () => onClose?.());
  const wasOpen = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpen.current = open;
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose?.(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
              <motion.div className="modal-positioner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div
                  className="panel modal-panel"
                  initial={{ scale: 0.88, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.92, y: 12, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 22 }}
                >
                  {children}
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
