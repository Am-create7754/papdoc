import { motion } from 'framer-motion';

// Ambient decorative element used across the landing page — a small medical-themed icon that
// gently drifts and fades in on scroll. Always positioned absolutely by the caller (via
// `className`), never interactive, never part of layout flow. Framer Motion's app-wide
// `MotionConfig reducedMotion="user"` (see App.jsx) automatically collapses both the entrance
// fade and the looping drift when the OS prefers reduced motion — no extra handling needed here.
export default function FloatingMotif({
  icon: Icon,
  className = '',
  size = 'w-8 h-8',
  tone = 'text-primary/20',
  duration = 10,
  delay = 0,
  driftY = 14,
  rotate = 6,
}) {
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute select-none z-0 ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1, delay: delay / 1000 }}
    >
      <motion.div
        animate={{ y: [0, -driftY, 0], rotate: [0, rotate, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay: delay / 1000 }}
      >
        <Icon className={`${size} ${tone}`} />
      </motion.div>
    </motion.div>
  );
}
