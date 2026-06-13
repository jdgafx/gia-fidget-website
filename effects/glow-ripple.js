// effects/glow-ripple.js — Tap to spawn a soft rainbow ripple.
// Multiple ripples coexist and fade independently. Drag the card
// to move the "tap zone" with the cursor. Pointer-move biases
// ripple color toward pointer hue. Never a "burst" — always a
// "ripple".

const RIPPLE_LIFE = 3.0;     // seconds
const MAX_RIPPLES = 12;

export function mountGlowRipple(container) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(255, 229, 217, 0.35), rgba(220, 238, 251, 0.35));
  `;
  container.appendChild(wrap);

  // Inner layer that holds the ripple DOM. Keeps listeners on `wrap`.
  const layer = document.createElement('div');
  layer.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';
  wrap.appendChild(layer);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const maxR = reduced ? 130 : 200;
  const life = reduced ? 4.0 : RIPPLE_LIFE;

  const ripples = []; // { x, y, t, hue }
  let pointerX = 0.5, pointerY = 0.5;
  let pointerInside = false;

  function onPointerMove(e) {
    const r = wrap.getBoundingClientRect();
    pointerX = (e.clientX - r.left) / r.width;
    pointerY = (e.clientY - r.top) / r.height;
    pointerInside = true;
  }
  function onPointerLeave() { pointerInside = false; }
  function onPointerDown(e) {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    // Hue biased by pointer's current position (subtle, no hard rainbow).
    const hue = 0.5 + 0.5 * Math.sin(x * 6.28 + y * 4.0);
    ripples.push({ x, y, t: 0, hue });
  }
  wrap.addEventListener('pointermove', onPointerMove, { passive: true });
  wrap.addEventListener('pointerleave', onPointerLeave, { passive: true });
  wrap.addEventListener('pointerdown', onPointerDown, { passive: true });

  function tick() {
    const dt = 1 / (reduced ? 30 : 60);
    for (const r of ripples) r.t += dt;
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (ripples[i].t > life) ripples.splice(i, 1);
    }
    render();
    requestAnimationFrame(tick);
  }

  function render() {
    let html = '';
    for (const r of ripples) {
      const k = r.t / life;             // 0..1
      const radius = k * maxR;          // px
      const alpha = (1 - k) * 0.6;
      // Rainbow hue: low saturation (cap 70% lightness 75%).
      const hueDeg = (r.hue * 60 + 200) % 360; // bias toward soft rainbow
      html += `<div style="
        position: absolute;
        left: ${(r.x * 100).toFixed(2)}%;
        top: ${(r.y * 100).toFixed(2)}%;
        width: ${(radius * 2).toFixed(1)}px;
        height: ${(radius * 2).toFixed(1)}px;
        margin-left: ${(-radius).toFixed(1)}px;
        margin-top: ${(-radius).toFixed(1)}px;
        border-radius: 50%;
        border: 1.5px solid hsla(${hueDeg.toFixed(0)}, 60%, 70%, ${alpha.toFixed(3)});
        pointer-events: none;
        transform: scale(${0.5 + 0.5 * (1 - k)});
        transition: transform 80ms linear;
      "></div>`;
    }
    // Soft pointer indicator when hovering.
    if (pointerInside) {
      const px = (pointerX * 100).toFixed(2);
      const py = (pointerY * 100).toFixed(2);
      html += `<div style="
        position: absolute;
        left: ${px}%;
        top: ${py}%;
        width: 32px; height: 32px;
        margin-left: -16px; margin-top: -16px;
        border-radius: 50%;
        background: radial-gradient(circle, hsla(280, 60%, 75%, 0.25), transparent 70%);
        pointer-events: none;
      "></div>`;
    }
    // Replace children: we use a single string blob for performance.
    layer.innerHTML = html;
  }

  let raf = requestAnimationFrame(tick);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      wrap.remove();
    },
  };
}
