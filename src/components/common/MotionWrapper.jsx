import { motion } from "framer-motion";

// Animates in once on mount rather than on scroll-into-view. Scroll-triggered
// reveals (whileInView) depend on IntersectionObserver timing that's flaky on
// mobile browsers when the address bar collapses mid-scroll and resizes the
// viewport — content could end up stuck at opacity 0. Mount-based animation
// has no such failure mode: it always resolves to visible.
export const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);
