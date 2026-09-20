import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

import { useNotificationStore } from "@/store/useNotificationStore";

// Same tone-to-color mapping this app already uses elsewhere for the exact
// same meanings — StatusBadge's success/warning tones, CopyableHash's own
// copied-checkmark color, and the react-toastify CSS this replaces
// (.Toastify__toast--error's icon was already brand-red, not a generic
// red) — no new color introduced anywhere in this component, per the
// Colors rule in CLAUDE.md. Icons are the outline set only, matching every
// other icon in the app's UI chrome.
const TONE_ICON = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  default: null,
};
// `info`/`default` deliberately don't reuse `text-ink-muted` here (unlike
// every other muted-icon spot in the app) — that token is tuned for
// contrast against `surface-card`/page backgrounds, not against this
// pill's own inverted `bg-ink-primary`. `text-surface-card/70` tracks the
// pill's own (also inverted) body-text color instead, so it stays legible
// in both themes without a new color.
const TONE_ICON_CLASS = {
  success: "text-emerald-500",
  error: "text-brand",
  warning: "text-amber-500",
  info: "text-surface-card/70",
  default: "text-surface-card/70",
};

function NotificationPill({ notification }) {
  const dismiss = useNotificationStore((state) => state.dismiss);
  const Icon = TONE_ICON[notification.tone] ?? null;
  const isInteractive = Boolean(notification.onClick) || notification.closeOnClick;

  const handleClick = () => {
    notification.onClick?.();
    if (notification.closeOnClick) dismiss(notification.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onClick={isInteractive ? handleClick : undefined}
      role={notification.tone === "error" ? "alert" : "status"}
      // `bg-ink-primary text-surface-card` — deliberately inverted from
      // every card's own `bg-surface-card text-ink-primary`, using the
      // exact same two tokens swapped. Since `ink-primary` and
      // `surface-card` already flip appropriately between light/dark on
      // their own (no new color, no per-theme override needed here), this
      // pill renders as the *opposite* tone of whatever surface it's
      // floating over in either theme — solid near-black on a light page,
      // solid near-white on a dark one — instead of the near-identical
      // `bg-surface-card` treatment it previously shared with every card
      // behind it, which is what made it blend in.
      className={`pointer-events-auto flex w-full items-center gap-2 rounded-full bg-ink-primary px-4 py-2.5 text-sm text-surface-card shadow-lg sm:w-auto sm:max-w-sm ${
        isInteractive ? "cursor-pointer" : ""
      }`}
    >
      {Icon && <Icon className={`h-4 w-4 shrink-0 ${TONE_ICON_CLASS[notification.tone]}`} aria-hidden="true" />}
      <div className="min-w-0 flex-1 truncate">{notification.content}</div>
    </motion.div>
  );
}

// Mounted once, app-root level (see main.jsx/prerenderEntry.jsx) — same
// single-instance role react-toastify's own <ToastContainer/> had. Top-
// anchored, offset well below the sticky Navbar (`h-12` — see Navbar.jsx's
// <header>) rather than right under it — measured against PageHeader's
// real rendered height (title + a two-line description runs to ~140px on
// a narrow phone), `top-36` clears every page's own title/description
// block outright rather than relying on horizontal separation from a
// centered pill at wider viewports, which broke down the moment a
// description happened to wrap onto a second line under the pill. Safe-
// area aware on the top edge like every other fixed element in this app
// (Sidebar, FlareWidget). The outer wrapper is deliberately
// `pointer-events-none` (so an empty notification area never blocks
// clicks on whatever's behind it) with `pointer-events-auto` restored per
// pill.
export default function NotificationCenter() {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-36 z-[100] flex flex-col items-center gap-2 px-4 pt-[env(safe-area-inset-top)]"
    >
      <AnimatePresence initial={false}>
        {notifications.map((notification) => (
          <NotificationPill key={notification.id} notification={notification} />
        ))}
      </AnimatePresence>
    </div>
  );
}
