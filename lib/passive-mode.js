// lib/passive-mode.js — Idle-state passive mode.
// After `delay` ms of no pointer/key input, calls onPassive().
// On first input after passive, calls onActive().
// Decoupled from ambient/audio — knows nothing about them internally.

export function createPassiveMode({ onPassive, onActive, delay = 5000 } = {}) {
  let passive = false;
  let timer = null;

  function resetTimer() {
    if (passive) {
      // We're exiting passive mode.
      passive = false;
      onActive && onActive();
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!passive) {
        passive = true;
        onPassive && onPassive();
      }
    }, delay);
  }

  function onInput() {
    resetTimer();
  }

  // Listen on document for intentional input only (no pointermove/touchmove —
  // ambient drift on touch devices would otherwise prevent passive mode).
  document.addEventListener('pointerdown', onInput, { passive: true });
  document.addEventListener('keydown', onInput, { passive: true });
  document.addEventListener('wheel', onInput, { passive: true });

  // Start the initial timer.
  resetTimer();

  return {
    get isInPassiveMode() { return passive; },
    destroy() {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onInput);
      document.removeEventListener('keydown', onInput);
      document.removeEventListener('wheel', onInput);
    },
  };
}
