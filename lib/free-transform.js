// lib/free-transform.js — Multi-pointer free transform.
// Single pointer: drag. Two pointers: pinch (scale) + rotate.
// Double-tap: close callback. Long-press: extra callback.
// All transforms compose into a single CSS transform for perf.

/**
 * Attach free transform to an element.
 * @param {HTMLElement} el
 * @param {Object} [opts]
 * @param {(el) => void} [opts.onDoubleTap]
 * @param {(el) => void} [opts.onLongPress]
 * @returns {{ setTransform, destroy }}
 */
export function makeFreeTransform(el, opts = {}) {
  el.style.position = el.style.position || 'absolute';
  el.style.transformOrigin = '50% 50%';
  el.style.willChange = 'transform';
  el.style.touchAction = 'none';

  const pointers = new Map();
  let state = { x: 0, y: 0, scale: 1, rot: 0 };  // current
  let start = { x: 0, y: 0, scale: 1, rot: 0, dist: 0, angle: 0 };
  let downAt = 0;
  let lastTapAt = 0;
  let longPressTimer = 0;
  let longPressed = false;

  function apply() {
    el.style.transform =
      `translate(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px) ` +
      `rotate(${state.rot.toFixed(2)}deg) ` +
      `scale(${state.scale.toFixed(3)})`;
  }

  function distance() {
    const pts = [...pointers.values()];
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  }
  function angle() {
    const pts = [...pointers.values()];
    return Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180 / Math.PI;
  }
  function center() {
    const pts = [...pointers.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      start.x = e.clientX - state.x;
      start.y = e.clientY - state.y;
      downAt = Date.now();
      longPressed = false;
      longPressTimer = window.setTimeout(() => {
        if (pointers.size === 1 && !longPressed) {
          longPressed = true;
          opts.onLongPress && opts.onLongPress(el);
        }
      }, 600);
    } else if (pointers.size === 2) {
      // Capture pinch start state from current.
      start.dist = distance() || 1;
      start.angle = angle();
      start.scale = state.scale;
      start.rot = state.rot;
      // Reset drag origin to current pointer center.
      const c = center();
      start.x = c.x - state.x;
      start.y = c.y - state.y;
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      state.x = e.clientX - start.x;
      state.y = e.clientY - start.y;
    } else if (pointers.size === 2) {
      const c = center();
      state.x = c.x - start.x;
      state.y = c.y - start.y;
      const d = distance();
      const a = angle();
      state.scale = Math.max(0.3, Math.min(4, start.scale * (d / start.dist)));
      state.rot = start.rot + (a - start.angle);
    }
    apply();
  }

  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    try { el.releasePointerCapture(e.pointerId); } catch {}
    clearTimeout(longPressTimer);

    const elapsed = Date.now() - downAt;
    if (pointers.size === 0) {
      // Tap detection.
      if (elapsed < 250 && Math.abs(state.x - start.x + state.y - start.y) < 8) {
        const now = Date.now();
        if (now - lastTapAt < 300) {
          opts.onDoubleTap && opts.onDoubleTap(el);
          lastTapAt = 0;
        } else {
          lastTapAt = now;
        }
      }
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

  return {
    setTransform(x, y, scale = 1, rot = 0) {
      state = { x, y, scale, rot };
      apply();
    },
    getState() { return { ...state }; },
    destroy() {
      clearTimeout(longPressTimer);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    },
  };
}
