// lib/symmetry-controller.js — Symmetry mode state (off, 2, 4, 8)

export function createSymmetryController() {
  const MODES = [0, 2, 4, 8];
  let currentIndex = 0;

  return {
    getMode() {
      return MODES[currentIndex];
    },
    setMode(mode) {
      const idx = MODES.indexOf(mode);
      if (idx !== -1) {
        currentIndex = idx;
      }
      return MODES[currentIndex];
    },
    toggle() {
      currentIndex = (currentIndex + 1) % MODES.length;
      return MODES[currentIndex];
    }
  };
}
