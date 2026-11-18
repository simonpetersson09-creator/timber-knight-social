import { useEffect, useRef } from "react";
/** Stack of "close me" handlers for open popups; Android back closes the newest first. */
const stack: Array<{ id: number; fn: () => void }> = [];
let next = 1;
export function runTopBackHandler(): boolean { const top = stack[stack.length - 1]; if (!top) return false; top.fn(); return true; }
export function useBackHandler(active: boolean, onBack: () => void) {
  const ref = useRef(onBack); ref.current = onBack;
  useEffect(() => {
    if (!active) return;
    const id = next++;
    stack.push({ id, fn: () => ref.current() });
    return () => { const i = stack.findIndex((h) => h.id === id); if (i >= 0) stack.splice(i, 1); };
  }, [active]);
}
