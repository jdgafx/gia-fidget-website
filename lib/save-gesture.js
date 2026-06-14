// lib/save-gesture.js — Save card content to PNG.
// Detects: (1) two-finger long-press (800ms hold, <40px movement),
// (2) shift+click on desktop. Triggers download via <a download>.

export function makeSaveGesture(card, getCanvas, opts = {}) {
  let pointers = new Map();
  let holdTimer = null;
  let startPos = null;
  let shiftDown = false;

  const HOLD_MS = 800;
  const MAX_MOVE = 40;

  function clearHold() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  }

  function triggerSave() {
    const canvas = getCanvas();
    if (!canvas) return;
    let dataUrl = null;

    try {
      if (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) {
        // WebGL canvas — requires preserveDrawingBuffer: true.
        dataUrl = canvas.toDataURL('image/png');
      } else if (canvas.getContext('2d')) {
        // 2D canvas — direct capture.
        dataUrl = canvas.toDataURL('image/png');
      } else {
        // DOM card — render innerHTML via SVG foreignObject.
        const html = card.innerHTML;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${card.offsetWidth}" height="${card.offsetHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
          </foreignObject>
        </svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const off = document.createElement('canvas');
          off.width = card.offsetWidth;
          off.height = card.offsetHeight;
          const ctx = off.getContext('2d');
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          try {
            const png = off.toDataURL('image/png');
            download(png);
          } catch {} // CORS failure — zero fail state
        };
        img.onerror = () => { URL.revokeObjectURL(url); };
        img.src = url;
        return;
      }
      if (dataUrl) download(dataUrl);
    } catch {} // zero fail state
  }

  function download(dataUrl) {
    const name = opts.filename || `gia-effect-${Date.now()}.png`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (pointers.size === 2) {
      startPos = { x: e.clientX, y: e.clientY };
      holdTimer = setTimeout(() => {
        // Check movement — all pointers must stay within MAX_MOVE.
        let moved = false;
        for (const p of pointers.values()) {
          const dx = p.x - startPos.x;
          const dy = p.y - startPos.y;
          if (Math.hypot(dx, dy) > MAX_MOVE) { moved = true; break; }
        }
        if (!moved) triggerSave();
        holdTimer = null;
      }, HOLD_MS);
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) clearHold();
  }

  function onKeyDown(e) {
    if (e.key === 'Shift') shiftDown = true;
  }
  function onKeyUp(e) {
    if (e.key === 'Shift') shiftDown = false;
  }

  function onClick(e) {
    if (shiftDown && e.shiftKey) triggerSave();
  }

  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerUp);
  card.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    destroy() {
      clearHold();
      card.removeEventListener('pointerdown', onPointerDown);
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerup', onPointerUp);
      card.removeEventListener('pointercancel', onPointerUp);
      card.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
