import { useState } from 'react';
import { motion } from 'framer-motion';

// Click (or Enter/Space) toggles a gentle, continuous bob with an intensified gold glow —
// a small tactile delight on otherwise-static preview cards/images. Purely decorative:
// no navigation or form behavior lives here, so a plain div+role is enough.
export default function FloatOnClick({ children, className = '', rounded = 'rounded-card' }) {
  const [floating, setFloating] = useState(false);

  const toggle = () => setFloating((v) => !v);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-pressed={floating}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      animate={floating ? { y: [0, -10, 0] } : { y: 0 }}
      transition={floating ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4, ease: 'easeOut' }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      className={`cursor-pointer select-none outline-none ${rounded} transition-shadow duration-500 ${
        floating
          ? 'shadow-[0_0_46px_-4px_rgba(212,175,55,0.5)]'
          : 'shadow-[0_0_22px_-6px_rgba(212,175,55,0.22)]'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
