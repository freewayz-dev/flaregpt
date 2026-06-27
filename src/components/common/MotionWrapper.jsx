// src/components/common/MotionWrapper.jsx
import { motion } from "framer-motion";

export const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    className={className} // Add className here
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);
