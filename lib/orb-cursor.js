// lib/orb-cursor.js — Glowing orb cursor with particle trail.
// Follows mouse with spring damping, leaves fading trail,
// creates ripples on nearby elements, magnetic pull effect.

import { getDpr } from './dpr.js';

const TRAIL_LENGTH = 12;
const TRAIL_DECAY = 0.06;
const SPRING_STIFFNESS = 0.15;
const MAGNETIC_RADIUS = 150;
const MAGNETIC_STRENGTH = 0.03;
const RIPPLE_INTERVAL = 80;

export function mountOrbCursor() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = getDpr();
  let alive = true;

  function resize() {
    if (!alive) return;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Orb state.
  const orb = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const target = { x: orb.x, y: orb.y };
  const trail = [];
  let hue = 270;
  let lastRippleTime = 0;

  // Mouse tracking.
  function onMove(e) {
    target.x = e.clientX;
    target.y = e.clientY;
    hue = (hue + 0.5) % 360;
  }
  window.addEventListener('pointermove', onMove, { passive: true });

  // Cached element list — refresh periodically.
  let cachedElements = [];
  let cacheTime = 0;
  const CACHE_TTL = 500;

  function getEffectElements(now) {
    if (now - cacheTime > CACHE_TTL) {
      cachedElements = [...document.querySelectorAll('.effect-entity')];
      cacheTime = now;
    }
    return cachedElements;
  }

  function applyEffects(now) {
    const elements = getEffectElements(now);
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(orb.x - cx, orb.y - cy);

      // Ripple (throttled, nearest element only).
      if (dist < MAGNETIC_RADIUS * 0.6 && now - lastRippleTime > RIPPLE_INTERVAL) {
        if (!el.classList.contains('orb-ripple')) {
          el.classList.add('orb-ripple');
          setTimeout(() => el.classList.remove('orb-ripple'), 400);
          lastRippleTime = now;
        }
      }
    }
  }

  let raf = 0;
  function frame(now) {
    if (!alive) return;

    // Spring follow.
    orb.x += (target.x - orb.x) * SPRING_STIFFNESS;
    orb.y += (target.y - orb.y) * SPRING_STIFFNESS;

    // Add to trail.
    trail.unshift({ x: orb.x, y: orb.y, alpha: 1 });
    if (trail.length > TRAIL_LENGTH) trail.pop();

    // Decay trail.
    for (let i = 0; i < trail.length; i++) {
      trail[i].alpha = Math.max(0, trail[i].alpha - TRAIL_DECAY);
    }

    // Magnetic pull + ripples.
    applyEffects(now);

    // Draw.
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    // Draw trail.
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      if (t.alpha <= 0) continue;
      const size = 8 + (1 - i / trail.length) * 10;
      const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, size);
      grad.addColorStop(0, `hsla(${hue}, 80%, 70%, ${t.alpha * 0.6})`);
      grad.addColorStop(1, `hsla(${hue}, 80%, 70%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw main orb.
    const orbSize = 16;
    const orbGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orbSize);
    orbGrad.addColorStop(0, `hsla(${hue}, 85%, 75%, 1)`);
    orbGrad.addColorStop(0.4, `hsla(${hue}, 80%, 65%, 0.8)`);
    orbGrad.addColorStop(1, `hsla(${hue}, 80%, 65%, 0)`);
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orbSize, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow.
    const innerGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 6);
    innerGrad.addColorStop(0, `hsla(${hue}, 90%, 90%, 1)`);
    innerGrad.addColorStop(1, `hsla(${hue}, 90%, 80%, 0)`);
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 6, 0, Math.PI * 2);
    ctx.fill();

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
    get position() {
      return { x: orb.x, y: orb.y };
    },
  };
}
