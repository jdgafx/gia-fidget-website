// lib/reduced-motion.js — prefers-reduced-motion helper.
// When the user has asked for reduced motion, effects slow their
// ambient cycle to 1/3 and skip particle bursts. The site still
// works — it just becomes quieter.

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Listener for live changes (user toggles in OS settings).
export function onReducedMotionChange(cb) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = () => cb(mq.matches);
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else mq.addListener(handler);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', handler);
    else mq.removeListener(handler);
  };
}
