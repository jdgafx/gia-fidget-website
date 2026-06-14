// lib/party-explosion.js — Particle explosion system for fidget interactions.
// Bursts confetti, sparkles, stars, hearts on fast fling or double-tap.

// --- Particle shapes ---

function drawCircle(ctx, size) {
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(ctx, size) {
  const spikes = 5;
  const outerR = size / 2;
  const innerR = outerR * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawRect(ctx, size) {
  const half = size / 2;
  ctx.fillRect(-half, -half, size, size);
}

function drawHeart(ctx, size) {
  const s = size / 20;
  ctx.beginPath();
  ctx.moveTo(0, s * 4);
  ctx.bezierCurveTo(0, s * 2, -s * 5, s * 2, -s * 5, -s * 1);
  ctx.bezierCurveTo(-s * 5, -s * 5, 0, -s * 7, 0, -s * 10);
  ctx.bezierCurveTo(0, -s * 7, s * 5, -s * 5, s * 5, -s * 1);
  ctx.bezierCurveTo(s * 5, s * 2, 0, s * 2, 0, s * 4);
  ctx.closePath();
  ctx.fill();
}

const SHAPES = { circle: drawCircle, star: drawStar, rect: drawRect, heart: drawHeart };

// --- Particle class ---

class Particle {
  constructor(x, y, opts) {
    this.x = x;
    this.y = y;
    const angle = opts.angle ?? Math.random() * Math.PI * 2;
    const speed = opts.speed ?? (2 + Math.random() * 4);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = opts.life ?? 1;
    this.decay = opts.decay ?? (0.01 + Math.random() * 0.02);
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.15;
    this.size = opts.size ?? (4 + Math.random() * 6);
    this.color = opts.color ?? '#ff0000';
    this.shape = opts.shape ?? 'circle';
    this.gravity = opts.gravity ?? 0.12;
    this.friction = opts.friction ?? 0.98;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    const draw = SHAPES[this.shape] ?? drawCircle;
    draw(ctx, this.size);
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}

// --- Presets ---

const CONFETTI_COLORS = ['#ff6b9d', '#c44dff', '#4dc9f6', '#67e9a0', '#ffd93d', '#ff8c42'];
const SPARKLE_COLORS = ['#ffffff', '#f8f0ff', '#fff5f5', '#f0f8ff'];
const HEART_COLORS = ['#ff6b9d', '#ff8fb1', '#ffb3c6', '#ffd6e0'];
const STAR_COLORS = ['#ffd93d', '#ffe066', '#ffec99', '#fff3b0'];
const ALL_COLORS = [...CONFETTI_COLORS, ...SPARKLE_COLORS, ...HEART_COLORS, ...STAR_COLORS];

export const PRESETS = {
  confetti: {
    count: 40,
    colors: CONFETTI_COLORS,
    shapes: ['circle', 'rect', 'star'],
    life: 1.2,
    decay: 0.012,
    speed: 6,
    gravity: 0.15,
    size: [4, 10],
  },
  sparkles: {
    count: 30,
    colors: SPARKLE_COLORS,
    shapes: ['star', 'circle'],
    life: 0.8,
    decay: 0.018,
    speed: 4,
    gravity: 0.06,
    size: [2, 6],
  },
  hearts: {
    count: 20,
    colors: HEART_COLORS,
    shapes: ['heart'],
    life: 1.4,
    decay: 0.01,
    speed: 5,
    gravity: 0.1,
    size: [6, 12],
  },
  stars: {
    count: 25,
    colors: STAR_COLORS,
    shapes: ['star'],
    life: 1.0,
    decay: 0.014,
    speed: 5,
    gravity: 0.08,
    size: [4, 8],
  },
  bigBang: {
    count: 80,
    colors: ALL_COLORS,
    shapes: ['circle', 'star', 'rect', 'heart'],
    life: 1.5,
    decay: 0.01,
    speed: 8,
    gravity: 0.12,
    size: [3, 12],
  },
};

// --- Explosion creation ---

export function createExplosion(container, x, y, preset = 'confetti', force = 1) {
  const cfg = PRESETS[preset] ?? PRESETS.confetti;
  const f = Math.max(0.3, Math.min(force, 3));

  const canvas = document.createElement('canvas');
  const rect = container.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.cssText =
    'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const particles = [];
  const count = Math.round(cfg.count * f);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = cfg.speed * f * (0.5 + Math.random());
    const sizeMin = cfg.size[0] * f;
    const sizeMax = cfg.size[1] * f;
    particles.push(
      new Particle(x, y, {
        angle,
        speed,
        life: cfg.life,
        decay: cfg.decay,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
        shape: cfg.shapes[Math.floor(Math.random() * cfg.shapes.length)],
        gravity: cfg.gravity,
      })
    );
  }

  let raf;
  const w = rect.width;
  const h = rect.height;
  function tick() {
    ctx.clearRect(0, 0, w, h);
    let allDead = true;
    for (const p of particles) {
      if (p.dead) continue;
      p.update();
      p.draw(ctx);
      if (!p.dead) allDead = false;
    }
    if (allDead) {
      particles.length = 0;
      canvas.remove();
    } else {
      raf = requestAnimationFrame(tick);
    }
  }
  raf = requestAnimationFrame(tick);

  return {
    cancel() {
      cancelAnimationFrame(raf);
      canvas.remove();
    },
  };
}
