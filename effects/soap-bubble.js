// effects/soap-bubble.js — Iridescent soap bubble

export function mountSoapBubble(container, opts = {}) {
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

  let bubble = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    baseY: HEIGHT / 2,
    r: 50,
    opacity: 1.0,
    dissolving: false,
    respawnTimer: null,
    phase: Math.random() * 10
  };

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

  function onPointerDown(e) {
    if (bubble.dissolving) return;

    // Check if tap hit the bubble
    const dist = Math.hypot(mouse.x - bubble.x, mouse.y - bubble.y);
    if (dist <= bubble.r + 15) {
      popBubble();
    }
  }

  function popBubble() {
    bubble.dissolving = true;
    
    // Play sound callback if attached
    if (window.audioEngineInstance) {
      window.audioEngineInstance.playInteractionTone();
    }

    // Trigger respawn in 2 seconds
    bubble.respawnTimer = setTimeout(() => {
      bubble.dissolving = false;
      bubble.opacity = 0;
      bubble.baseY = HEIGHT / 2;
      bubble.x = WIDTH / 2;
    }, 2000);
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });

  let time = 0;

  function draw() {
    if (!active) return;
    time += 0.015;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Fade animation logic
    if (bubble.dissolving) {
      bubble.opacity = Math.max(0, bubble.opacity - 0.08); // soft dissolve
      bubble.r = Math.max(0, bubble.r - 2.0);
    } else if (bubble.opacity < 1.0) {
      bubble.opacity = Math.min(1.0, bubble.opacity + 0.05); // soft spawn
      bubble.r = Math.min(50, bubble.r + 1.5);
    }

    if (bubble.opacity > 0) {
      // Slow vertical drift (sine wave 6s cycle)
      bubble.y = bubble.baseY + Math.sin(time * (2 * Math.PI / 6.0) + bubble.phase) * 12;

      // Gentle drift toward pointer
      if (mouse.hover && !bubble.dissolving) {
        bubble.x += (mouse.x - bubble.x) * 0.06;
        bubble.baseY += (mouse.y - bubble.baseY) * 0.06;
      }

      ctx.save();
      ctx.globalAlpha = bubble.opacity;

      // 1. Draw outer iridescent ring
      const borderGrad = ctx.createRadialGradient(
        bubble.x - 5, bubble.y - 5, bubble.r - 8,
        bubble.x, bubble.y, bubble.r
      );
      // Soft hope colors: pink, violet, blue, teal
      borderGrad.addColorStop(0, 'rgba(167, 139, 250, 0.1)'); // violet
      borderGrad.addColorStop(0.3, 'rgba(96, 165, 250, 0.4)'); // blue
      borderGrad.addColorStop(0.6, 'rgba(52, 211, 197, 0.5)'); // teal
      borderGrad.addColorStop(0.9, 'rgba(255, 107, 157, 0.6)'); // pink
      borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Draw soft inner body glow
      const innerGrad = ctx.createRadialGradient(
        bubble.x - 10, bubble.y - 10, 0,
        bubble.x, bubble.y, bubble.r
      );
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      innerGrad.addColorStop(0.5, 'rgba(167, 139, 250, 0.05)');
      innerGrad.addColorStop(0.9, 'rgba(96, 165, 250, 0.08)');
      innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      ctx.fill();

      // 3. Highlight/Glare (white reflection arc)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Curved arc at top-left
      ctx.arc(bubble.x, bubble.y, bubble.r - 6, Math.PI * 1.05, Math.PI * 1.55);
      ctx.stroke();

      // Soft reflection spot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(bubble.x + bubble.r * 0.4, bubble.y + bubble.r * 0.4, bubble.r * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    destroy() {
      active = false;
      cancelAnimationFrame(animationFrameId);
      clearTimeout(bubble.respawnTimer);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.remove();
    }
  };
}
