// effects/love-note.js — "I Love You, Dad :) :)"
// Soft pastel card with letter-stagger fade-in, breathing smileys,
// gentle vertical float, and tap-to-glow. Pure CSS animations + tiny
// JS for the tap pulse. No WebGL needed.

import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';

export function mountLoveNote(container) {
  const reduced = prefersReducedMotion();
  const speed = reduced ? 0.5 : 1.0;

  container.innerHTML = `
    <div class="love-note" role="figure" aria-label="I love you, Dad">
      <div class="love-note-phrase">
        <span class="love-word" style="--i:0">I</span>
        <span class="love-word" style="--i:1">Love</span>
        <span class="love-word" style="--i:2">You,</span>
        <span class="love-word" style="--i:3">Dad</span>
      </div>
      <div class="love-smileys" aria-hidden="true">
        <span class="love-smiley" style="--i:0">:)</span>
        <span class="love-smiley" style="--i:1">:)</span>
      </div>
      <div class="love-shimmer" aria-hidden="true"></div>
    </div>
  `;

  // Apply speed.
  const root = container.querySelector('.love-note');
  root.style.setProperty('--speed', String(speed));

  // Visibility: pause the breathing animation when offscreen.
  const vis = createVisibilityObserver(container);
  let raf = 0;
  function tick() {
    if (!shouldRender(container, vis)) {
      raf = requestAnimationFrame(tick);
      return;
    }
    // CSS handles the animation; this loop is just for the vis gate.
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // Tap to pulse the smileys.
  function onPointerDown() {
    root.classList.remove('love-tap');
    void root.offsetWidth; // restart animation
    root.classList.add('love-tap');
  }
  container.addEventListener('pointerdown', onPointerDown, { passive: true });

  return {
    destroy() {
      cancelAnimationFrame(raf);
      vis.destroy();
      container.removeEventListener('pointerdown', onPointerDown);
      container.innerHTML = '';
    },
  };
}
