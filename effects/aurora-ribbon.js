// effects/aurora-ribbon.js — Calming traveling ribbon waves in Canvas2D

export function mountAuroraRibbon(container, opts = {}) {
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

  // Mouse bias
  let mouse = { x: 100, y: 100, active: false };

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
    time += 0.015;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Deep calm void background inside card
    ctx.fillStyle = 'rgba(15, 10, 30, 0.95)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw 3 layers of glowing ribbon waves
    const layers = [
      { amp: 16, freq: 0.03, speed: 1.5, hueOffset: 0, opacity: 0.35, thickness: 12 },
      { amp: 12, freq: 0.045, speed: 2.2, hueOffset: 60, opacity: 0.45, thickness: 8 },
      { amp: 8, freq: 0.06, speed: 0.8, hueOffset: 120, opacity: 0.3, thickness: 16 }
    ];

    layers.forEach((lyr) => {
      ctx.save();
      ctx.beginPath();
      
      const wavePoints = [];
      for (let x = 0; x <= WIDTH; x += 4) {
        // Base sine wave
        let y = HEIGHT / 2 + Math.sin(x * lyr.freq + time * lyr.speed) * lyr.amp;
        
        // Add second harmonic for FBM noise-like complexity
        y += Math.cos(x * 0.08 - time * 1.5) * 4;

        // Pointer warp
        if (mouse.active) {
          const dx = x - mouse.x;
          const dist = Math.abs(dx);
          if (dist < 60) {
            const pull = (60 - dist) / 60;
            y += (mouse.y - y) * pull * 0.6;
          }
        }
        
        wavePoints.push({ x, y });
      }

      // Draw top of ribbon
      ctx.moveTo(wavePoints[0].x, wavePoints[0].y - lyr.thickness);
      for (let i = 1; i < wavePoints.length; i++) {
        ctx.lineTo(wavePoints[i].x, wavePoints[i].y - lyr.thickness);
      }
      
      // Loop around to bottom of ribbon
      for (let i = wavePoints.length - 1; i >= 0; i--) {
        ctx.lineTo(wavePoints[i].x, wavePoints[i].y + lyr.thickness);
      }
      ctx.closePath();

      // Soft HSL colors shifted over time (rainbow capped at 70% sat)
      const baseHue = (time * 12 + lyr.hueOffset) % 360;
      const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
      gradient.addColorStop(0, `hsla(${baseHue}, 70%, 75%, 0)`);
      gradient.addColorStop(0.5, `hsla(${baseHue}, 70%, 75%, ${lyr.opacity})`);
      gradient.addColorStop(1, `hsla(${baseHue}, 70%, 75%, 0)`);

      ctx.fillStyle = gradient;
      // Add soft glow effect
      ctx.shadowColor = `hsla(${baseHue}, 70%, 75%, ${lyr.opacity * 0.8})`;
      ctx.shadowBlur = 10;
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
