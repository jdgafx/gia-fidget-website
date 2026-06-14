// lib/trails.js — Full-screen particle trail engine for borderless artifacts

class TrailParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5 - 0.5; // slight upward float
    this.size = 2 + Math.random() * 4;
    this.maxSize = this.size;
    this.color = color; // e.g. 'rgba(167, 139, 250, 0.8)'
    this.opacity = 1.0;
    this.decay = 0.015 + Math.random() * 0.015;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.05;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.spin;
    this.opacity -= this.decay;
    this.size = this.maxSize * this.opacity;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw a small 4-point sparkle star
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size * 0.3, -this.size * 0.3);
    ctx.lineTo(this.size, 0);
    ctx.lineTo(this.size * 0.3, this.size * 0.3);
    ctx.lineTo(0, this.size);
    ctx.lineTo(-this.size * 0.3, this.size * 0.3);
    ctx.lineTo(-this.size, 0);
    ctx.lineTo(-this.size * 0.3, -this.size * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  get dead() {
    return this.opacity <= 0;
  }
}

export function initTrailEngine(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  let active = true;
  let rafId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn(x, y, color) {
    if (particles.length > 300) return; // Cap maximum count for performance
    particles.push(new TrailParticle(x, y, color));
  }

  function tick() {
    if (!active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      if (p.dead) {
        particles.splice(i, 1);
      } else {
        p.draw(ctx);
      }
    }

    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  return {
    spawn,
    destroy() {
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    }
  };
}
