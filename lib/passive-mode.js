// lib/passive-mode.js — Idle state detection (5s) for soothing transitions

export function createPassiveMode(callbacks = {}) {
  const delay = callbacks.delay || 5000;
  let idleTimer = null;
  let isPassive = false;

  function resetTimer() {
    clearTimeout(idleTimer);
    
    if (isPassive) {
      isPassive = false;
      if (callbacks.onActive) callbacks.onActive();
    }
    
    idleTimer = setTimeout(() => {
      isPassive = true;
      if (callbacks.onPassive) callbacks.onPassive();
    }, delay);
  }

  const events = ['pointermove', 'pointerdown', 'keydown', 'click', 'wheel', 'touchstart'];
  events.forEach((ev) => {
    window.addEventListener(ev, resetTimer, { passive: true });
  });

  resetTimer();

  return {
    destroy() {
      clearTimeout(idleTimer);
      events.forEach((ev) => {
        window.removeEventListener(ev, resetTimer);
      });
    }
  };
}
