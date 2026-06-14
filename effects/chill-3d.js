// effects/chill-3d.js — Calming pseudo-3D floating-island dreamscape in Canvas2D

export function mountChill3D(container, opts = {}) {
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

  let dragOffset = 0;
  let targetDragOffset = 0;
  let dragging = false;
  let startX = 0;

  function onPointerDown(e) {
    dragging = true;
    startX = e.clientX;
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    targetDragOffset += dx * 0.4;
    startX = e.clientX;
  }

  function onPointerUp() {
    dragging = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });

  let time = 0;

  function draw() {
    if (!active) return;
    time += 0.015;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // 1. Sky Gradient (twilight sky)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    skyGrad.addColorStop(0, 'hsl(208, 86%, 85%)');   // sky blue
    skyGrad.addColorStop(0.5, 'hsl(265, 56%, 88%)'); // lavender
    skyGrad.addColorStop(1, 'hsl(16, 100%, 90%)');    // peach
    
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Filter drag offset back to center slowly over time (auto-rotate/return)
    dragOffset += (targetDragOffset - dragOffset) * 0.1;
    if (!dragging) {
      targetDragOffset += (0 - targetDragOffset) * 0.02; // slow return to center
    }

    // Gentle vertical bob (6s period)
    const bob = Math.sin(time * (2 * Math.PI / 6.0)) * 6;

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2 + bob;

    // Draw background elements (parallax back clouds)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(cx - 30 + dragOffset * 0.2, cy - 40, 20, 0, Math.PI * 2);
    ctx.arc(cx - 15 + dragOffset * 0.2, cy - 45, 25, 0, Math.PI * 2);
    ctx.arc(cx + dragOffset * 0.2, cy - 40, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Island Base (bottom dirt/rock block)
    ctx.save();
    ctx.fillStyle = 'hsl(16, 40%, 65%)'; // brown dirt
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy);
    // Displaced rocky lines
    ctx.lineTo(cx - 40 + dragOffset * 0.4, cy + 30);
    ctx.lineTo(cx + dragOffset * 0.5, cy + 45);
    ctx.lineTo(cx + 40 + dragOffset * 0.4, cy + 30);
    ctx.lineTo(cx + 60, cy);
    ctx.closePath();
    ctx.fill();

    // Rocky layers
    ctx.fillStyle = 'hsl(16, 30%, 55%)';
    ctx.beginPath();
    ctx.moveTo(cx - 30 + dragOffset * 0.45, cy);
    ctx.lineTo(cx + dragOffset * 0.5, cy + 30);
    ctx.lineTo(cx + 30 + dragOffset * 0.45, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Island Top (green grass)
    ctx.save();
    ctx.fillStyle = 'hsl(144, 45%, 72%)'; // green grass
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shiny highlight on grass edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 58, 13, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Draw trees with 3D parallax offset
    const trees = [
      { rx: -30, ry: -5, size: 16, color: 'hsl(144, 40%, 55%)' },
      { rx: 0, ry: 2, size: 22, color: 'hsl(144, 35%, 48%)' },
      { rx: 25, ry: -3, size: 14, color: 'hsl(144, 45%, 60%)' }
    ];

    trees.forEach((t) => {
      // Parallax horizontal position based on dragOffset
      const tx = cx + t.rx + dragOffset * 0.7;
      const ty = cy + t.ry;

      // Draw trunk
      ctx.fillStyle = 'hsl(16, 50%, 35%)';
      ctx.fillRect(tx - 2, ty - 12, 4, 12);

      // Draw canopy (cone/triangle)
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 12 - t.size);
      ctx.lineTo(tx - t.size / 2, ty - 10);
      ctx.lineTo(tx + t.size / 2, ty - 10);
      ctx.closePath();
      ctx.fill();

      // Highlight on tree canopy
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 12 - t.size);
      ctx.lineTo(tx - t.size / 2, ty - 10);
      ctx.lineTo(tx, ty - 10);
      ctx.closePath();
      ctx.fill();
    });

    // 5. Floating particle petals
    ctx.save();
    ctx.fillStyle = 'rgba(255, 107, 157, 0.7)'; // pink drifting petals
    const petalX1 = cx - 40 + Math.sin(time * 2) * 10 + dragOffset * 0.9;
    const petalY1 = cy - 20 + Math.cos(time) * 5;
    ctx.beginPath();
    ctx.arc(petalX1, petalY1, 2, 0, Math.PI * 2);
    ctx.fill();

    const petalX2 = cx + 30 + Math.cos(time * 1.5) * 8 + dragOffset * 0.9;
    const petalY2 = cy - 35 + Math.sin(time * 2) * 5;
    ctx.beginPath();
    ctx.arc(petalX2, petalY2, 2.5, 0, Math.PI * 2);
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
