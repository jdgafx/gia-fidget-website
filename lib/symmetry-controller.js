// lib/symmetry-controller.js — Symmetry mode state holder.
// Mode cycles: off → 2 → 4 → 8 → off.
// main.js reads getMode() and applies CSS mirror transforms to card
// containers. This module is pure state — no rendering.

const MODES = [0, 2, 4, 8];
const STORAGE_KEY = 'gia-symmetry-mode';

export function createSymmetryController() {
  let idx = 0;
  // Restore from localStorage (wrapped for Safari private browsing).
  try {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    if (MODES.includes(saved)) idx = MODES.indexOf(saved);
  } catch {}

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, String(MODES[idx])); } catch {}
  }

  return {
    toggle() {
      idx = (idx + 1) % MODES.length;
      persist();
      return MODES[idx];
    },
    getMode() {
      return MODES[idx];
    },
    destroy() {
      // Pure state — nothing to clean up.
    },
  };
}
