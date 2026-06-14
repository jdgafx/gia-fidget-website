// effects/never-give-up.js — "Never Give Up"
// A mantra card. Letters fade in with a stagger, a rainbow gradient
// flows through the text continuously, and a thin rainbow underline
// "draws" from left to right. Tap to refresh the underline.

import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';

export function mountNeverGiveUp(container, opts = {}) {
  const reduced = prefersReducedMotion();
  const speed = reduced ? 0.4 : 1.0;

  const variant = opts.variant || 'Classic';
  let lines = [["Never"], ["Give", "Up"]];
  if (variant === 'Bold') {
    lines = [["Dream"], ["Big", "Dreams"]];
  } else if (variant === 'Gentle') {
    lines = [["Breathe", "In,"], ["Breathe", "Out"]];
  }

  const spans = (words) => {
    let index = 0;
    return words.map(word => {
      return word.split('').map(ch => {
        const span = `<span class="ng-letter" style="--i:${index}">${ch}</span>`;
        index++;
        return span;
      }).join('') + '<span class="ng-space">&nbsp;</span>';
    }).join('');
  };

  const line1Html = spans(lines[0]);
  const line2Html = spans(lines[1]);
  const fullText = lines.flat().join(' ');

  container.innerHTML = `
    <div class="ng" role="figure" aria-label="${fullText}">
      <div class="ng-line ng-line-1">${line1Html}</div>
      <div class="ng-line ng-line-2">${line2Html}</div>
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

  // Pointer parallax.
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  function onPointerMove(e) {
    const r = container.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
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
    cur.x += (target.x - cur.x) * 0.12;
    cur.y += (target.y - cur.y) * 0.12;
    // Active rotation phase for the pinwheel spin.
    const t = performance.now() / 1000;
    const ma = Math.sin(t * 1.5) * 0.5 + Math.sin(t * 0.9) * 0.5;
    root.style.setProperty('--mx', cur.x.toFixed(3));
    root.style.setProperty('--my', cur.y.toFixed(3));
    root.style.setProperty('--ma', ma.toFixed(3));
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
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.innerHTML = '';
    },
  };
}
