// effects/love-note.js — Soothing, heart-burst text companion

export function mountLoveNote(container, opts = {}) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, hsla(354, 84%, 93%, 0.15), transparent 75%);
    pointer-events: auto;
  `;
  container.appendChild(wrap);

  const text = document.createElement('div');
  text.style.cssText = `
    font-family: 'Cormorant Garamond', 'Times New Roman', serif;
    font-weight: 500;
    font-style: italic;
    font-size: 26px;
    color: hsl(354, 84%, 75%);
    text-shadow: 0 0 10px hsla(354, 84%, 75%, 0.3);
    user-select: none;
    pointer-events: none;
    text-align: center;
    line-height: 1.2;
  `;
  text.innerHTML = 'love & light<br><span style="font-size: 16px; opacity: 0.85;">for Gia</span>';
  wrap.appendChild(text);

  // Canvas overlay for tapping/bursting hearts
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';
  wrap.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let active = true;

  const WIDTH = 200;
  const HEIGHT = 200;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const particles = [];

  function drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    ctx.bezierCurveTo(x, y - size / 2, x - size, y - size / 2, x - size, y + size / 10);
    ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size);
    ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size / 10);
    ctx.bezierCurveTo(x + size, y - size / 2, x, y - size / 2, x, y + size / 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function spawnHearts(tx, ty) {
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: tx,
        y: ty,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.6) * 3 - 1, // slight upward bias
        size: 4 + Math.random() * 6,
        color: `hsla(354, ${75 + Math.random() * 20}%, 75%, 0.85)`,
        opacity: 1.0,
        decay: 0.015 + Math.random() * 0.01
      });
    }

    if (window.audioEngineInstance) {
      window.audioEngineInstance.playInteractionTone();
    }
  }

  wrap.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    spawnHearts(x, y);
  });

  function draw() {
    if (!active) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // soft gravity
      p.opacity -= p.decay;

      if (p.opacity <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;
      drawHeart(ctx, p.x, p.y, p.size, p.color);
      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    destroy() {
      active = false;
      cancelAnimationFrame(animationFrameId);
      wrap.remove();
    }
  };
}
