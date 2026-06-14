// lib/easing.js — Breath rhythm easing utilities (6-8s period, sine.inOut)

export function sineInOut(t) {
  return 0.5 * (1 - Math.cos(Math.PI * t));
}

// Map a millisecond time or timestamp to a breathing cycle (0 to 1 and back) with sine.inOut easing.
// periodSeconds can be 6 to 8 seconds.
export function getBreathValue(timeMs, periodSeconds = 7.0) {
  const periodMs = periodSeconds * 1000;
  const cycle = (timeMs % periodMs) / periodMs; // 0..1
  // Map 0..1 to 0..1..0
  const normalized = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
  return sineInOut(normalized);
}

// Damps cursor motion smoothly using standard exponential decay
export function pointerDamp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}
