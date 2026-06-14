// lib/perf-monitor.js — Frame-time monitor + effect capper.
// Tracks rolling 3-frame average. Sets data-quality on body:
//   "full"    (<16ms)
//   "reduced" (16-20ms)
//   "minimal" (>33ms)
// Also exports capEffects(max=4) to auto-close oldest card.

export function createPerfMonitor() {
  let lastT = performance.now();
  let avgMs = 0;
  let raf = 0;

  function tick() {
    const now = performance.now();
    const dt = now - lastT;
    lastT = now;
    // Rolling average over 3 frames: avg = avg * 2/3 + dt * 1/3.
    avgMs = avgMs * (2 / 3) + dt * (1 / 3);

    const body = document.body;
    if (avgMs > 33) {
      body.dataset.quality = 'minimal';
    } else if (avgMs > 20) {
      body.dataset.quality = 'reduced';
    } else {
      body.dataset.quality = 'full';
    }

    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  return {
    getAvgMs() { return avgMs; },
    getQuality() { return document.body.dataset.quality || 'full'; },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

export function capEffects(max = 4) {
  const stage = document.getElementById('effects-stage');
  if (!stage) return;
  const cards = stage.querySelectorAll('.effect-card:not(.closing)');
  if (cards.length <= max) return;

  // Close the oldest (first in DOM order).
  const oldest = cards[0];
  // Trigger the card's close behavior — dispatch a double-tap or call close.
  // The card has a data-effect attribute; we find its free-transform instance.
  // Simplest: add closing class + remove after transition.
  oldest.classList.add('closing');
  setTimeout(() => {
    try {
      if (oldest._instance && oldest._instance.destroy) oldest._instance.destroy();
    } catch {}
    oldest.remove();
  }, 420);
}
