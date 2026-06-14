// effects/petal-drift.js — Soft slow-falling pastel petals

export function mountPetalDrift(container, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let active = true;

  const WIDTH = 200;
  const HEIGHT = 200;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const PETAL_COUNT = 15;
  const colors = [
    'rgba(255, 107, 157, 0.75)', // pink
    'rgba(167, 139, 250, 0.75)', // violet
    'rgba(255, 229, 217, 0.75)', // peach
    'rgba(220, 238, 251, 0.75)'  // sky
  ];

  const petals = Array.from({ length: PETAL_COUNT }, () => createPetal(true));

  function createPetal(randomY = false) {
    return {
      x: Math.random() * WIDTH,
      y: randomY ? Math.random() * HEIGHT : -10,
      r: 3 + Math.random() * 4,
      speedY: 0.2 + Math.random() * 0.4,
      swaySpeed: 0.02 + Math.random() * 0.03,
      swayAmp: 1.5 + Math.random() * 3,
      phase: Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.02
    };
  }

  let mouse = { x: 0, y: 0, hover: false };

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    mouse.y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    mouse.hover = true;
  }

  function onPointerLeave() {
    mouse.hover = false;
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

  let time = 0;

  function draw() {
    if (!active) return;
    time += 1;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    petals.forEach((p) => {
      // Falling speed
      p.y += p.speedY;

      // Horizontal sway (breath rhythm)
      const sway = Math.sin(time * p.swaySpeed + p.phase) * (p.swayAmp * 0.1);
      p.x += sway;
      p.rot += p.rotSpeed;

      // Soft pointer repulsion
      if (mouse.hover) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 40) {
          const force = (40 - dist) / 40;
          p.x += (dx / dist) * force * 1.5;
          p.y += (dy / dist) * force * 1.5;
        }
      }

      // Wrap-around / recycle petals
      if (p.y > HEIGHT + 10 || p.x < -10 || p.x > WIDTH + 10) {
        Object.assign(p, createPetal(false));
      }

      // Draw petal (leaf/ellipse shape)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      ctx.beginPath();
      // Draw smooth almond shape petal
      ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft white reflection spot on petal for glossiness
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-p.r * 0.3, -p.r * 0.1, p.r * 0.25, p.r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
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
    }
  };
}
