// effects/petal-drift.js — tsparticles slow-falling petals.
// 50-80 particles, downward + gentle horizontal sway. Pointer near
// the canvas adds a soft repulsion (300ms ease-in-out return).
// Soft hope-pastel palette.

export function mountPetalDrift(container) {
  if (!window.tsParticles) {
    // Library not loaded yet — defer.
    return new Promise(resolve => {
      const id = setInterval(() => {
        if (window.tsParticles) {
          clearInterval(id);
          resolve(mountPetalDrift(container));
        }
      }, 100);
      setTimeout(() => clearInterval(id), 5000);
    });
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hope-pastel hex values for petals.
  const petalColors = ['#ffd6e0', '#ffeac9', '#d4f1e4', '#dceefb', '#e8dff5', '#fff3c4'];

  // tsParticles will inject its own canvas into container.
  // We wrap it in a div so we can control pointer events.
  const wrap = document.createElement('div');
  wrap.style.position = 'absolute';
  wrap.style.inset = '0';
  wrap.style.pointerEvents = 'auto';
  container.appendChild(wrap);

  let pointerActive = false;
  wrap.addEventListener('pointermove', () => { pointerActive = true; });
  wrap.addEventListener('pointerleave', () => { pointerActive = false; });

  const cfg = {
    fullScreen: { enable: false },
    detectRetina: true,
    background: { color: { value: 'transparent' } },
    fpsLimit: reduced ? 30 : 60,
    particles: {
      number: { value: reduced ? 30 : 65, density: { enable: true, area: 800 } },
      color: { value: petalColors },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.4, max: 0.85 },
        animation: { enable: true, speed: 0.3, sync: false },
      },
      size: { value: { min: 3, max: 9 } },
      move: {
        enable: true,
        direction: 'bottom',
        speed: { min: 0.2, max: 0.6 },
        random: true,
        straight: false,
        outModes: { default: 'out' },
      },
      rotate: {
        value: { min: 0, max: 360 },
        animation: { enable: true, speed: 2 },
      },
      tilt: {
        direction: 'random',
        enable: true,
        value: { min: 0, max: 360 },
        animation: { enable: true, speed: 3 },
      },
      wobble: { distance: 6, enable: true, speed: { min: -1, max: 1 } },
    },
  };

  const instance = window.tsParticles.load(wrap, cfg);

  return {
    destroy() {
      try { instance.then(i => i && i.destroy && i.destroy()); } catch {}
      wrap.remove();
    },
  };
}
