import type { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

// Fades content in on mount using a pure CSS animation instead of
// framer-motion. This component used to render a `motion.div` per instance —
// harmless on desktop, but the landing page mounts 10+ of these at once, and
// each one was a separate JS-driven animation for framer-motion to schedule
// and tick on every frame. On real mobile hardware that showed up as visible
// jank on first paint and meaningfully higher CPU/battery usage. A CSS
// `animation` accomplishes the identical visual result (fade + rise) but
// runs on the compositor thread and starts as soon as the browser paints the
// element, without waiting for React effects or a JS animation loop.
export const FadeIn = ({ children, delay = 0, className = "" }: FadeInProps) => (
  <div
    className={`animate-fade-in-up ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    {children}
  </div>
);
