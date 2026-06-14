// effects/glow-ripple.js — Tap-to-spawn soft rainbow ripples

export function mountGlowRipple(container, opts = {}) {
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

  const ripples = []; // Array of {x, y, r, opacity, hue}

  function spawnRipple(x, y) {
    if (ripples.length > 8) ripples.shift(); // Cap count
    ripples.push({
      x,
      y,
      r: 2,
      opacity: 1.0,
      hue: Math.random() * 360
    });

    if (window.audioEngineInstance) {
      window.audioEngineInstance.playInteractionTone();
    }
  }

  function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    spawnRipple(x, y);
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });

  // Passive auto-ripple spawn (every 1.5s if no user action)
  let lastAutoSpawn = 0;

  function draw() {
    if (!active) return;
    const now = Date.now();

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Deep void plum background
    ctx.fillStyle = 'rgba(15, 10, 30, 0.95)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Auto spawn ripples for ambient motion
    if (now - lastAutoSpawn > 1800) {
      spawnRipple(WIDTH / 2 + (Math.random() - 0.5) * 50, HEIGHT / 2 + (Math.random() - 0.5) * 50);
      lastAutoSpawn = now;
    }

    // Update and draw ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 1.2;
      r.opacity -= 0.012;

      if (r.opacity <= 0) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = r.opacity;
      
      // Draw concentric ripple rings
      ctx.strokeStyle = `hsla(${r.hue}, 60%, 75%, 0.8)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();

      // Outer fainter secondary ring
      if (r.r > 20) {
        ctx.strokeStyle = `hsla(${(r.hue + 40) % 360}, 60%, 75%, 0.35)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r - 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    destroy() {
      active = false;
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.remove();
    }
  };
}
