// effects/never-give-up.js — "Never Give Up"
// A mantra card. Letters fade in with a stagger, a rainbow gradient
// flows through the text continuously, and a thin rainbow underline
// "draws" from left to right. Tap to refresh the underline.

import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';

export function mountNeverGiveUp(container) {
  const reduced = prefersReducedMotion();
  const speed = reduced ? 0.4 : 1.0;

  const word1 = 'Never'.split('');
  const word2 = 'Give'.split('');
  const word3 = 'Up'.split('');

  const spans = (letters) => letters
    .map((ch, i) => `<span class="ng-letter" style="--i:${i}">${ch}</span>`)
    .join('');

  container.innerHTML = `
    <div class="ng" role="figure" aria-label="Never give up">
      <div class="ng-line ng-line-1">${spans(word1)}</div>
      <div class="ng-line ng-line-2">${spans(word2)}<span class="ng-space">&nbsp;</span>${spans(word3)}</div>
      <div class="ng-underline" aria-hidden="true">
        <div class="ng-underline-fill"></div>
      </div>
      <div class="ng-glow" aria-hidden="true"></div>
    </div>
  `;

  const root = container.querySelector('.ng');
  root.style.setProperty('--speed', String(speed));

  const vis = createVisibilityObserver(container);
  let raf = 0;
  function tick() {
    if (!shouldRender(container, vis)) {
      raf = requestAnimationFrame(tick);
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // Tap: restart the underline draw.
  function onPointerDown() {
    const fill = root.querySelector('.ng-underline-fill');
    fill.classList.remove('ng-redraw');
    void fill.offsetWidth;
    fill.classList.add('ng-redraw');
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
