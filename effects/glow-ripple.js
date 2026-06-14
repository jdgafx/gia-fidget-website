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
  let lastSpawnT = 0;
  let lastAutoT = 0;
  let autoAngle = 0;
  // Spawn on move with throttling — feels like a continuous trail.
  function spawn(x, y) {
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    const hue = 0.5 + 0.5 * Math.sin(x * 6.28 + y * 4.0);
    ripples.push({ x, y, t: 0, hue });
  }
  function onPointerMove(e) {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    pointerX = x; pointerY = y;
    pointerInside = true;
    // Throttle to ~one ripple every 90ms while moving.
    const now = performance.now();
    if (now - lastSpawnT > 90) {
      lastSpawnT = now;
      spawn(x, y);
    }
  }
  function onPointerLeave() { pointerInside = false; }
  function onPointerDown(e) {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    spawn(x, y);
    // Tap also bursts a few extra ripples for feedback.
    for (let i = 1; i <= 3; i++) {
      spawn(
        Math.max(0, Math.min(1, x + (Math.random() - 0.5) * 0.15)),
        Math.max(0, Math.min(1, y + (Math.random() - 0.5) * 0.15))
      );
    }
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
    // Auto-spinner: when untouched, ripples spawn in a spinning pattern.
    autoAngle += dt * 2.2;  // pinwheel speed
    lastAutoT += dt;
    if (lastAutoT > 0.18) {
      lastAutoT = 0;
      const r = 0.18 + 0.10 * Math.sin(autoAngle * 0.6);
      const x = 0.5 + Math.cos(autoAngle) * r;
      const y = 0.5 + Math.sin(autoAngle) * r * 0.7;
      spawn(x, y);
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
