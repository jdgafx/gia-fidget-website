// lib/free-transform.js — EXTREME multi-pointer free transform.
// Single pointer: drag (with momentum on release).
// Two pointers: pinch (scale 0.05–10x) + rotate (any angle, any axis).
// Triple pointers: full 3D free rotation.
// No resistance. Glide on release. Inertia.
// Double-tap: close callback.

import { prefersReducedMotion } from './reduced-motion.js';
import { applyViewportBounce } from './viewport-bounce.js';

const SCALE_MIN = 0.05;
const SCALE_MAX = 10.0;
const DRAG_DAMP = 0.86;       // velocity decay per frame
const ROT_DAMP = 0.95;        // higher decay for ultimate long spin!
const MOMENTUM_THRESHOLD = 0.4;

/**
 * Attach extreme free transform to an element.
 * @param {HTMLElement} el
 * @param {Object} [opts]
 * @param {(el) => void} [opts.onDoubleTap]
 * @param {(speed: number) => void} [opts.onExplosion]
 * @param {() => void} [opts.onBounce]
 * @returns {{ setTransform, getState, destroy }}
 */
export function makeFreeTransform(el, opts = {}) {
  el.style.position = el.style.position || 'absolute';
  el.style.transformOrigin = '50% 50%';
  el.style.willChange = 'transform';
  el.style.touchAction = 'none';
  // 3D perspective for any future Z translation.
  el.style.perspective = '1200px';

  const pointers = new Map();
  let state = { x: 0, y: 0, scale: 1, rotZ: 0, rotX: 0, rotY: 0, stretchX: 1, stretchY: 1 };
  let start = {};
  // Velocity for momentum after release.
  let vel = { x: 0, y: 0, rotZ: 0, rotX: 0, rotY: 0 };
  let lastPointer = new Map();   // last position per pointer id
  let downAt = 0;
  let lastTapAt = 0;
  let tapStartX = 0, tapStartY = 0;
  let lastT = 0;
  let raf = 0;

  const reduced = prefersReducedMotion();

  function apply() {
    const sx = (state.scale * state.stretchX).toFixed(3);
    const sy = (state.scale * state.stretchY).toFixed(3);
    const size = el.offsetWidth || 200;
    const halfSize = size / 2;
    const tx = state.x - halfSize;
    const ty = state.y - halfSize;
    el.style.transform =
      `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) ` +
      `rotateX(${state.rotX.toFixed(2)}deg) ` +
      `rotateY(${state.rotY.toFixed(2)}deg) ` +
      `rotateZ(${state.rotZ.toFixed(2)}deg) ` +
      `scale(${sx}, ${sy})`;
    opts.onTransform && opts.onTransform(state);
  }

  // Inertia tick — runs every frame after release, decays velocity.
  function inertiaTick() {
    if (reduced) {
      vel.x = vel.y = vel.rotX = vel.rotY = vel.rotZ = 0;
    }
    const stillMoving =
      Math.abs(vel.x) > MOMENTUM_THRESHOLD ||
      Math.abs(vel.y) > MOMENTUM_THRESHOLD ||
      Math.abs(vel.rotZ) > 0.3 ||
      Math.abs(state.rotX) > 0.3 ||
      Math.abs(state.rotY) > 0.3 ||
      Math.abs(state.stretchX - 1) > 0.01 ||
      Math.abs(state.stretchY - 1) > 0.01;

    if (stillMoving) {
      state.x += vel.x;
      state.y += vel.y;
      state.rotZ += vel.rotZ;
      
      // Decay 3D tilt back to 0 on release
      state.rotX *= 0.85;
      state.rotY *= 0.85;

      // Elastic spring back to 1 for squash-stretch
      state.stretchX += (1 - state.stretchX) * 0.16;
      state.stretchY += (1 - state.stretchY) * 0.16;

      const size = el.offsetWidth || 200;
      const scaledSize = size * state.scale;
      const oldVelX = vel.x;
      const oldVelY = vel.y;

      if (applyViewportBounce(state, vel, scaledSize, scaledSize)) {
        opts.onBounce && opts.onBounce();
        
        if (Math.sign(oldVelX) !== Math.sign(vel.x)) {
          const force = Math.min(0.35, Math.abs(oldVelX) * 0.018);
          state.stretchX = 1 - force;
          state.stretchY = 1 + force;
        }
        if (Math.sign(oldVelY) !== Math.sign(vel.y)) {
          const force = Math.min(0.35, Math.abs(oldVelY) * 0.018);
          state.stretchY = 1 - force;
          state.stretchX = 1 + force;
        }
      }

      vel.x *= DRAG_DAMP;
      vel.y *= DRAG_DAMP;
      vel.rotZ *= ROT_DAMP;
      vel.rotX *= ROT_DAMP;
      vel.rotY *= ROT_DAMP;
      apply();
      raf = requestAnimationFrame(inertiaTick);
    } else {
      raf = 0;
    }
  }

  function startInertia() {
    if (raf) return;
    raf = requestAnimationFrame(inertiaTick);
  }

  // Two-pointer pinch: compute center, distance, angle.
  function pinchMetrics() {
    const pts = [...pointers.values()];
    const c = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
    const a = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    return { c, d, a };
  }

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { el.setPointerCapture(e.pointerId); } catch {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPointer.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    vel.x = vel.y = vel.rotZ = vel.rotX = vel.rotY = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;

    if (pointers.size === 1) {
      start.x = e.clientX - state.x;
      start.y = e.clientY - state.y;
      downAt = performance.now();
      tapStartX = e.clientX; tapStartY = e.clientY;
    } else if (pointers.size === 2) {
      const m = pinchMetrics();
      start.x = m.c.x - state.x;
      start.y = m.c.y - state.y;
      start.dist = m.d;
      start.angle = m.a;
      start.scale = state.scale;
      start.rotZ = state.rotZ;
      // Estimate rotation axes from pointer motion for 3D feel.
      start.rotX = state.rotX;
      start.rotY = state.rotY;
    } else if (pointers.size === 3) {
      // Triple-finger gesture: free 3D rotation. Capture baselines.
      start.rotX = state.rotX;
      start.rotY = state.rotY;
      start.rotZ = state.rotZ;
      start.p1 = [...pointers.values()][0];
      start.p2 = [...pointers.values()][1];
      start.p3 = [...pointers.values()][2];
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const now = performance.now();
    const last = lastPointer.get(e.pointerId) || { x: e.clientX, y: e.clientY, t: now };
    const dt = Math.max(now - last.t, 1);
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPointer.set(e.pointerId, { x: e.clientX, y: e.clientY, t: now });

    if (pointers.size === 1) {
      state.x = e.clientX - start.x;
      state.y = e.clientY - start.y;
      
      // Track velocity for momentum on release.
      vel.x = dx / dt * 16;
      vel.y = dy / dt * 16;

      // Torque/Spin calculation for off-center dragging (fidget spin behavior)
      const rx = last.x - state.x;
      const ry = last.y - state.y;
      const dist = Math.hypot(rx, ry);
      if (dist > 30) {
        const torque = (rx * dy - ry * dx) / (dist * dist || 1);
        const torqueDeg = (torque * 180 / Math.PI) / dt * 16;
        const clampedTorque = Math.max(-14, Math.min(14, torqueDeg * 0.25));
        vel.rotZ += clampedTorque;
      }
      vel.rotZ *= 0.85; // drag rotational friction
      state.rotZ += vel.rotZ;

      // 3D tilt dynamic effect on drag
      const targetRotX = -vel.y * 1.6;
      const targetRotY = vel.x * 1.6;
      state.rotX += (targetRotX - state.rotX) * 0.18;
      state.rotY += (targetRotY - state.rotY) * 0.18;
    } else if (pointers.size === 2) {
      const m = pinchMetrics();
      state.x = m.c.x - start.x;
      state.y = m.c.y - start.y;
      const scale = start.scale * (m.d / start.dist);
      state.scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale));
      // Z rotation from line angle.
      const dAng = m.a - start.angle;
      state.rotZ = start.rotZ + dAng * 180 / Math.PI;
      // X rotation from vertical pinch motion.
      state.rotX = start.rotX + (m.c.y - start.x) * 0.3;
      // Y rotation from horizontal pinch motion.
      state.rotY = start.rotY - (m.c.x - start.y) * 0.3;
      vel.rotZ = dAng * 1.5;
    } else if (pointers.size === 3) {
      // Three-finger drag tilts in 3D.
      const pts = [...pointers.values()];
      const avgX = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const avgY = (pts[0].y + pts[1].y + pts[2].y) / 3;
      const cx = (start.p1.x + start.p2.x + start.p3.x) / 3;
      const cy = (start.p1.y + start.p2.y + start.p3.y) / 3;
      state.rotX = start.rotX + (avgY - cy) * 0.5;
      state.rotY = start.rotY - (avgX - cx) * 0.5;
      state.rotZ = start.rotZ + (avgX - cx + avgY - cy) * 0.2;
    }
    apply();
  }

  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    lastPointer.delete(e.pointerId);
    try { el.releasePointerCapture(e.pointerId); } catch {}

    const elapsed = performance.now() - downAt;
    // Tap detection.
    if (pointers.size === 0 && elapsed < 280) {
      const dist = Math.hypot(e.clientX - tapStartX, e.clientY - tapStartY);
      if (dist < 8) {
        const now = performance.now();
        if (now - lastTapAt < 320) {
          opts.onDoubleTap && opts.onDoubleTap(el);
          lastTapAt = 0;
        } else {
          lastTapAt = now;
        }
      }
    }

    // Start inertia if released with velocity.
    if (pointers.size === 0) {
      const speed = Math.hypot(vel.x, vel.y) + Math.abs(vel.rotZ) * 0.5;
      if (speed > MOMENTUM_THRESHOLD) startInertia();
      if (speed > 8) opts.onExplosion && opts.onExplosion(speed);
    } else if (pointers.size === 1) {
      // Reset drag origin to remaining pointer.
      const p = [...pointers.values()][0];
      start.x = p.x - state.x;
      start.y = p.y - state.y;
    }
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  // Wheel zoom for desktop — scales the element around its center.
  // Shift+wheel rotates, plain wheel scales.
  function onWheel(e) {
    e.preventDefault();
    if (e.shiftKey) {
      state.rotZ += e.deltaY * 0.15;
      vel.rotZ = state.rotZ * 0.1;
    } else {
      const factor = Math.exp(-e.deltaY * 0.0015);
      const next = state.scale * factor;
      const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, next));
      const k = clamped / state.scale;
      // Zoom around pointer — translate so the point under cursor stays put.
      const offX = e.clientX - state.x;
      const offY = e.clientY - state.y;
      state.x = e.clientX - offX * k;
      state.y = e.clientY - offY * k;
      state.scale = clamped;
    }
    apply();
  }
  el.addEventListener('wheel', onWheel, { passive: false });

  return {
    setTransform(x, y, scale = 1, rotZ = 0, rotX = 0, rotY = 0) {
      state = { 
        x, 
        y, 
        scale, 
        rotZ, 
        rotX, 
        rotY, 
        stretchX: state.stretchX !== undefined ? state.stretchX : 1, 
        stretchY: state.stretchY !== undefined ? state.stretchY : 1 
      };
      apply();
    },
    getState() { return { ...state }; },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    },
  };
}
