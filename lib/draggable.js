// lib/draggable.js — Pointer-events draggable wrapper.
// Used on every effect card. Touch + mouse + pen unified.
// Drag handle is the top bar. The rest of the card is not draggable
// (so taps/clicks on the effect canvas work as designed).

/**
 * Make a card draggable by its handle.
 * @param {HTMLElement} card     the effect card root
 * @param {HTMLElement} handle   the drag handle (top bar)
 * @param {Object} [opts]
 * @param {(card, x, y) => void} [opts.onDragStart]
 * @param {(card, x, y) => void} [opts.onDragMove]
 * @param {(card) => void} [opts.onDragEnd]
 * @returns {{ setPosition(x, y): void, destroy(): void }}
 */
export function makeDraggable(card, handle, opts = {}) {
  let dragging = false;
  let startX = 0, startY = 0;
  let originX = 0, originY = 0;
  let pointerId = null;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    pointerId = e.pointerId;
    dragging = true;
    handle.setPointerCapture(pointerId);

    const rect = card.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;
    startX = e.clientX;
    startY = e.clientY;

    card.style.transition = 'none';
    handle.style.cursor = 'grabbing';
    opts.onDragStart && opts.onDragStart(card, e.clientX, e.clientY);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let nx = originX + dx;
    let ny = originY + dy;

    // Keep at least 44px of the card on screen.
    const margin = 44;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    nx = clamp(nx, -(w - margin), vw - margin);
    ny = clamp(ny, 0, vh - margin);

    setPosition(nx, ny);
    opts.onDragMove && opts.onDragMove(card, e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    try { handle.releasePointerCapture(pointerId); } catch {}
    handle.style.cursor = 'grab';
    card.style.transition = '';
    pointerId = null;
    opts.onDragEnd && opts.onDragEnd(card);
  }

  function setPosition(x, y) {
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  }

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerUp);
  handle.addEventListener('pointercancel', onPointerUp);
  handle.style.touchAction = 'none';
  handle.style.cursor = 'grab';

  return {
    setPosition,
    destroy() {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
    },
  };
}
