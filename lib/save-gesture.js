// lib/save-gesture.js — Captures card canvas as PNG on two-finger long-press or shift+click

export function makeSaveGesture(element, getCanvas, opts = {}) {
  let pointers = new Map();
  let holdTimer = null;
  let startPos = null;

  const HOLD_MS = 800;
  const MAX_MOVE = 40;

  function clearHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function triggerSave() {
    const canvas = getCanvas();
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const filename = opts.filename || `gia-fidget-${Date.now()}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Could not save canvas to PNG:', err);
    }
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      startPos = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      
      clearHold();
      holdTimer = setTimeout(() => {
        // Check if fingers moved too much
        let movedTooMuch = false;
        for (const p of pointers.values()) {
          const dist = Math.hypot(p.x - startPos.x, p.y - startPos.y);
          if (dist > MAX_MOVE) {
            movedTooMuch = true;
            break;
          }
        }
        if (!movedTooMuch) {
          triggerSave();
        }
        holdTimer = null;
      }, HOLD_MS);
    }
  }

  function onPointerMove(e) {
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      clearHold();
    }
  }

  function onClick(e) {
    if (e.shiftKey) {
      e.preventDefault();
      triggerSave();
    }
  }

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  element.addEventListener('click', onClick);

  return {
    destroy() {
      clearHold();
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('click', onClick);
    }
  };
}
