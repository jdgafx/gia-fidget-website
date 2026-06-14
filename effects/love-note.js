// effects/love-note.js — "I Love You, Dad :) :)"
// Soft pastel card with letter-stagger fade-in, breathing smileys,
// gentle vertical float, and tap-to-glow. Pure CSS animations + tiny
// JS for the tap pulse. No WebGL needed.

import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';

export function mountLoveNote(container, opts = {}) {
  const reduced = prefersReducedMotion();
  const speed = reduced ? 0.5 : 1.0;

  const variant = opts.variant || 'Classic';
  let phrase = "I Love You, Dad";
  let smileys = [":)", ":)"];
  if (variant === 'Playful') {
    phrase = "You Are Awesome, Dad!";
    smileys = ["★", "★"];
  } else if (variant === 'Tender') {
    phrase = "You Make Me Smile";
    smileys = ["♥", "♥"];
  }

  const words = phrase.split(' ');
  const phraseHtml = words.map((w, idx) => `<span class="love-word" style="--i:${idx}">${w}</span>`).join(' ');
  const smileysHtml = smileys.map((s, idx) => `<span class="love-smiley" style="--i:${idx}">${s}</span>`).join(' ');

  container.innerHTML = `
    <div class="love-note" role="figure" aria-label="${phrase}">
      <div class="love-note-phrase">
        ${phraseHtml}
      </div>
      <div class="love-smileys" aria-hidden="true">
        ${smileysHtml}
      </div>
      <div class="love-shimmer" aria-hidden="true"></div>
    </div>
  `;

  // Apply speed.
  const root = container.querySelector('.love-note');
  root.style.setProperty('--speed', String(speed));

  // Visibility: pause the parallax loop when offscreen.
  const vis = createVisibilityObserver(container);
  let raf = 0;

  // Pointer parallax: phrase drifts toward the cursor.
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  function onPointerMove(e) {
    const r = container.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1..1
    target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  function onPointerLeave() { target.x = 0; target.y = 0; }
  container.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerleave', onPointerLeave, { passive: true });

  function tick() {
    if (!shouldRender(container, vis)) {
      raf = requestAnimationFrame(tick);
      return;
    }
    // Smooth follow.
    cur.x += (target.x - cur.x) * 0.12;
    cur.y += (target.y - cur.y) * 0.12;
    // Active rotation phase for the spin animation.
    const t = performance.now() / 1000;
    const ma = Math.sin(t * 1.2) * 0.6 + Math.sin(t * 0.7) * 0.4;
    root.style.setProperty('--mx', cur.x.toFixed(3));
    root.style.setProperty('--my', cur.y.toFixed(3));
    root.style.setProperty('--ma', ma.toFixed(3));
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
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.innerHTML = '';
    },
  };
}
