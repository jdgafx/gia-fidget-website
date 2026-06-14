// effects/never-give-up.js — Soothing, star-burst hope text companion

export function mountNeverGiveUp(container, opts = {}) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, hsla(48, 100%, 89%, 0.15), transparent 75%);
    pointer-events: auto;
  `;
  container.appendChild(wrap);

  const text = document.createElement('div');
  text.style.cssText = `
    font-family: 'Cormorant Garamond', 'Times New Roman', serif;
    font-weight: 500;
    font-style: italic;
    font-size: 26px;
    color: hsl(42, 85%, 68%);
    text-shadow: 0 0 10px hsla(42, 85%, 68%, 0.3);
    user-select: none;
    pointer-events: none;
    text-align: center;
    line-height: 1.2;
  `;
  text.innerHTML = 'never give up<br><span style="font-size: 16px; opacity: 0.85;">dear Gia</span>';
  wrap.appendChild(text);

  // Canvas overlay for tapping/bursting stars
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

  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function spawnStars(tx, ty) {
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: tx,
        y: ty,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.6) * 3 - 1, // slight upward bias
        size: 5 + Math.random() * 5,
        color: `hsla(42, ${75 + Math.random() * 20}%, 70%, 0.85)`,
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
    spawnStars(x, y);
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
      drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.4, p.color);
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
