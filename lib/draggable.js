// lib/draggable.js — Calming, clamp-aware drag controller using Pointer Events

export function makeDraggable(card, handle, onStart, onMove, onEnd) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let cardStartX = 0;
  let cardStartY = 0;

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // Read current position (fall back to style values if not set yet)
    cardStartX = parseFloat(card.style.left) || 0;
    cardStartY = parseFloat(card.style.top) || 0;
    
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (err) {}
    
    if (onStart) onStart();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let nextX = cardStartX + dx;
    let nextY = cardStartY + dy;
    
    // Clamp inside viewport so cards can't be dragged fully offscreen
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    
    nextX = Math.max(10, Math.min(vw - w - 10, nextX));
    nextY = Math.max(10, Math.min(vh - h - 10, nextY));
    
    card.style.left = `${nextX}px`;
    card.style.top = `${nextY}px`;
    
    if (onMove) onMove(nextX, nextY);
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    if (onEnd) onEnd();
  }

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerUp);
  handle.addEventListener('pointercancel', onPointerUp);

  return {
    destroy() {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
    }
  };
}
