// lib/easing.js — Breath-rhythm easings.
// Sinusoidal ease for all autonomous animation. Back / elastic /
// bounce are FORBIDDEN — they read as jump-scares to a stressed
// nervous system. Power2.inOut and sine.inOut are the only shapes
// we use, on 6-8s cycles (human breath rate).

// GSAP-compatible ease strings we permit. Anything else throws.
const ALLOWED = new Set(['sine.in', 'sine.out', 'sine.inOut',
                         'power1.inOut', 'power2.inOut', 'power3.inOut',
                         'none']);

// Breath period (seconds) — between a slow inhale and a slow exhale.
export const BREATH_PERIOD = 7.0; // ~8.5 breaths/min, calming

export function assertAllowed(name) {
  if (!ALLOWED.has(name)) {
    throw new Error(
      `[easing] forbidden ease "${name}". ` +
      `Use only sine/power eases — back/elastic/bounce are banned.`
    );
  }
  return name;
}

// Breath scale: returns a multiplier in [0.95, 1.05] over a 6s cycle.
export function breathScale(t, period = BREATH_PERIOD, amp = 0.05) {
  return 1.0 + Math.sin((t / period) * Math.PI * 2) * amp;
}

// Slow hue drift for ambient color cycling (radians/sec).
export const HUE_DRIFT = 0.025;

// Pointer-damped follow: returns a smoothing factor that pulls
// a follower toward a target with a time constant `tau` (seconds).
// Use in a render loop: state += (target - state) * pointerDamp(dt, 0.4).
export function pointerDamp(dt, tau = 0.4) {
  return 1 - Math.exp(-dt / tau);
}
