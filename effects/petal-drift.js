// effects/petal-drift.js — Custom canvas petals.
// Slow-falling vivid petals with gentle horizontal sway, soft pointer
// repulsion, breath-rhythm. Pure canvas2d (no library).

import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';

const COLORS = [
  [255, 107, 157], // rose
  [167, 139, 250], // violet
  [ 96, 165, 250], // blue
  [ 52, 211, 197], // teal
  [163, 230,  53], // lime
  [251, 191,  36], // gold
  [232, 121, 249], // magenta
];

class Petal {
  constructor(w, h) {
    this.reset(w, h, true);
  }
  reset(w, h, init = false) {
    this.x = Math.random() * w;
    this.y = init ? Math.random() * h : -10 - Math.random() * 40;
    this.size = 4 + Math.random() * 10;
    // Faster fall so it feels alive.
    this.vy = 0.5 + Math.random() * 1.1;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.rot = Math.random() * Math.PI * 2;
    this.vrot = (Math.random() - 0.5) * 0.07;
    this.swayPhase = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.6 + Math.random() * 0.8;
    this.swayAmp = 0.7 + Math.random() * 1.1;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.alpha = 0.6 + Math.random() * 0.35;
  }
  update(dt, t, w, h) {
    // Swirl vortex — petals rotate around the center as they fall.
    const cx = w / 2;
    const cy = h / 2;
    const dx = this.x - cx;
    const dy = this.y - cy;
    const r = Math.sqrt(dx * dx + dy * dy) || 1;
    // Tangential force creates pinwheel spin.
    const tangX = -dy / r;
    const tangY = dx / r;
    // Sway
    const sway = Math.sin(t * this.swaySpeed + this.swayPhase) * this.swayAmp;
    // Center pull gets weaker with radius (vortex profile).
    const spinStrength = 0.018 * (1 - Math.min(1, r / Math.max(w, h)));
    this.x += (tangX * spinStrength + this.vx + sway * 0.4) * dt * 60;
    this.y += (tangY * spinStrength + this.vy) * dt * 60;
    this.rot += this.vrot * dt * 60;
    if (this.y > h + 20 || this.x < -20 || this.x > w + 20) this.reset(w, h);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = this.alpha;
    // Petal shape: an ellipse with a soft inner highlight
    const r = this.size;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0,   `rgba(${this.color[0]},${this.color[1]},${this.color[2]},1)`);
    grad.addColorStop(0.6, `rgba(${this.color[0]},${this.color[1]},${this.color[2]},0.6)`);
    grad.addColorStop(1,   `rgba(${this.color[0]},${this.color[1]},${this.color[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.globalAlpha = this.alpha * 0.5;
    ctx.shadowColor = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},0.8)`;
    ctx.shadowBlur = r * 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.5, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function mountPetalDrift(container) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const reduced = prefersReducedMotion();
  const COUNT = reduced ? 50 : 160;

  const petals = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const vis = createVisibilityObserver(canvas);

  // Pointer repulsion state.
  const ptr = { x: 0, y: 0, inside: false };

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.inside = true;
  }
  function onPointerLeave() { ptr.inside = false; }
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

  function resize() {
    const r = container.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Re-seed petals to fit the new size.
    if (petals.length === 0) {
      for (let i = 0; i < COUNT; i++) petals.push(new Petal(r.width, r.height));
    }
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let last = performance.now();
  let t = 0;
  let raf = 0;
  function frame(now) {
    if (!shouldRender(canvas, vis)) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Soft repulsion from pointer (if inside) — bigger, stronger.
    let repel = null;
    if (ptr.inside) {
      const radius = 140;
      repel = { x: ptr.x, y: ptr.y, r: radius, r2: radius * radius };
    }

    ctx.clearRect(0, 0, w, h);

    for (const p of petals) {
      if (repel) {
        const dx = p.x - repel.x;
        const dy = p.y - repel.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < repel.r2) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / repel.r) * 0.7;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }
      p.update(dt, t, w, h);
      p.draw(ctx);
    }

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      vis.destroy();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.remove();
    },
  };
}
