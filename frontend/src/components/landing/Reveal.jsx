import { motion } from 'framer-motion';

export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children }) {
  const MotionTag = motion[Tag] || motion.div;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: 'easeOut' }}
    >
      {children}
    </MotionTag>
  );
}
