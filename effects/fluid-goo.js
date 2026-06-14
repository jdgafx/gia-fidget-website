// effects/fluid-goo.js — Hardware-accelerated fluid metaball goo

export function mountFluidGoo(container, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  // Apply CSS metaball filter to container
  container.style.filter = 'blur(10px) contrast(15)';
  container.style.backgroundColor = 'transparent';

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let active = true;

  // Tiny internal canvas size to make drawing fast
  const WIDTH = 150;
  const HEIGHT = 150;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Blob states: x, y, radius, speed, angle, color
  const blobs = [
    { x: 75, y: 75, r: 24, speed: 0.8, angle: 0, color: 'hsl(16, 100%, 75%)' },
    { x: 50, y: 60, r: 18, speed: 0.6, angle: Math.PI / 3, color: 'hsl(265, 75%, 80%)' },
    { x: 90, y: 80, r: 20, speed: 0.7, angle: Math.PI * 1.2, color: 'hsl(208, 90%, 80%)' },
    { x: 65, y: 90, r: 16, speed: 0.5, angle: Math.PI * 0.7, color: 'hsl(144, 70%, 78%)' }
  ];

  // Mouse reaction
  let mouse = { x: 75, y: 75, active: false };

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    mouse.y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    mouse.active = true;
  }

  function onPointerLeave() {
    mouse.active = false;
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

  let time = 0;

  function draw() {
    if (!active) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    time += 0.015;

    // Background color matching void/dark
    ctx.fillStyle = 'rgba(15, 10, 30, 0.9)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    blobs.forEach((b, i) => {
      // Slow circular drift (breath rhythm cycle ~8s)
      const driftX = Math.cos(time + i * 2) * 15;
      const driftY = Math.sin(time + i * 2) * 15;

      let tx = b.x + driftX;
      let ty = b.y + driftY;

      // Soft pull to mouse if hover is active
      if (mouse.active) {
        tx += (mouse.x - tx) * 0.15;
        ty += (mouse.y - ty) * 0.15;
      }

      // Draw soft gradient circle
      const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, b.r);
      grad.addColorStop(0, b.color);
      grad.addColorStop(0.8, b.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(tx, ty, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    destroy() {
      active = false;
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.remove();
      container.style.filter = '';
    }
  };
}
