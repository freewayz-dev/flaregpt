import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared Tab-trap for every overlay in the app (ConnectWalletModal,
// TransactionDrawer, FlareWidget, ConversationHistoryPanel) — each already
// moves focus in on open and closes on Escape, but none of them stopped Tab
// from walking past the overlay's own last focusable element into the page
// behind it, despite `aria-modal="true"` claiming true modality. Cycles
// focus within `containerRef`'s subtree while `isActive`, re-querying
// focusable elements on every Tab press (not once on mount) since an
// overlay's own content can change while it's open (e.g. a rename input
// appearing, a list re-filtering).
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = [
        ...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!container.contains(document.activeElement)) {
        // Focus somehow ended up outside the trap entirely (e.g. a
        // programmatic .focus() call elsewhere) — pull it back in rather
        // than letting Tab continue from wherever it escaped to.
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, isActive]);
}
