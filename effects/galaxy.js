// effects/galaxy.js — 1500-particle interactive spiral galaxy

export function mountGalaxy(container, opts = {}) {
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

  const PARTICLE_COUNT = 1500;
  const particles = [];
  const arms = 3;

  const colors = [
    'rgba(255, 107, 157, 0.6)', // pink
    'rgba(167, 139, 250, 0.6)', // violet
    'rgba(96, 165, 250, 0.6)',  // blue
    'rgba(52, 211, 197, 0.6)'   // teal
  ];

  // Initialize particles in a spiral pattern
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = Math.pow(Math.random(), 2.0) * 80 + 3; // concentrate near center
    const armIdx = i % arms;
    const armAngle = (armIdx / arms) * Math.PI * 2;
    // Spiral twist based on distance
    const twist = r * 0.05;
    const angle = armAngle + twist + (Math.random() - 0.5) * 0.35;
    
    particles.push({
      r,
      angle,
      size: 0.6 + Math.random() * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulsePhase: Math.random() * 10,
      pulseSpeed: 0.02 + Math.random() * 0.03
    });
  }

  let galaxyRotation = 0;
  let rotSpeed = 0.005; // Base slow speed
  let targetRotSpeed = 0.005;

  let dragging = false;
  let lastAngle = 0;

  function getAngleFromCenter(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx);
  }

  function onPointerDown(e) {
    dragging = true;
    lastAngle = getAngleFromCenter(e.clientX, e.clientY);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
    let diff = currentAngle - lastAngle;
    
    // Handle wrap-around
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    
    // Add torque to galaxy rotation
    rotSpeed = Math.max(-0.15, Math.min(0.15, rotSpeed + diff * 0.1));
    lastAngle = currentAngle;
  }

  function onPointerUp() {
    dragging = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });

  function draw() {
    if (!active) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // Void black-plum background
    ctx.fillStyle = 'rgba(15, 10, 30, 0.95)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Apply rotation
    galaxyRotation += rotSpeed;
    
    // Decay extra velocity back to baseline speed
    rotSpeed += (targetRotSpeed - rotSpeed) * 0.04;

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(galaxyRotation);

    // Render 1500 particles using small rectangles or arc points
    particles.forEach((p) => {
      // Slow orbital angle update
      const orbitAngle = p.angle;
      
      // Calculate coordinates relative to center
      const x = Math.cos(orbitAngle) * p.r;
      const y = Math.sin(orbitAngle) * p.r;

      // Soft breathing pulse for each particle
      const pulse = 0.7 + Math.sin(Date.now() * p.pulseSpeed + p.pulsePhase) * 0.3;
      
      ctx.fillStyle = p.color;
      ctx.globalAlpha = pulse;

      // Render point
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    });

    // Draw bright central core glow
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGrad.addColorStop(0.3, 'rgba(255, 229, 217, 0.6)'); // peach
    coreGrad.addColorStop(0.6, 'rgba(167, 139, 250, 0.3)'); // lavender
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = coreGrad;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    destroy() {
      active = false;
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.remove();
    }
  };
}
