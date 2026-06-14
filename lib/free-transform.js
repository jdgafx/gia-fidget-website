// lib/free-transform.js — Inertia-driven spinning & dragging engine for borderless artifacts

export function makeFreeTransform(artifact, opts = {}) {
  let state = {
    x: parseFloat(artifact.style.left) || 100,
    y: parseFloat(artifact.style.top) || 100,
    angle: 0,
    scale: 1
  };

  let vel = { x: 0, y: 0, rot: 0 };
  let dragging = false;
  let startX = 0, startY = 0;
  let pointerId = null;

  // For torque/spin calculations
  let lastPtrX = 0, lastPtrY = 0;
  let lastTime = 0;

  // Double tap detection
  let lastTap = 0;

  let rafId = null;
  let active = true;

  const FRICTION = 0.96;
  const ROT_FRICTION = 0.97;
  const BOUNCE_DAMPING = 0.65;

  function applyTransform() {
    artifact.style.left = `${state.x - artifact.offsetWidth / 2}px`;
    artifact.style.top = `${state.y - artifact.offsetHeight / 2}px`;
    artifact.style.transform = `scale(${state.scale}) rotate(${state.angle}deg)`;
  }

  function tick() {
    if (!active) return;

    if (!dragging) {
      // Gliding inertia physics
      state.x += vel.x;
      state.y += vel.y;
      state.angle += vel.rot;

      // Friction decay
      vel.x *= FRICTION;
      vel.y *= FRICTION;
      vel.rot *= ROT_FRICTION;

      // Viewport bounce
      const w = artifact.offsetWidth || 150;
      const h = artifact.offsetHeight || 150;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let bounced = false;

      // Left edge
      if (state.x - w / 2 < 0) {
        state.x = w / 2;
        vel.x = Math.abs(vel.x) * BOUNCE_DAMPING;
        vel.rot += vel.y * 0.15; // transfer linear momentum to spin
        bounced = true;
      }
      // Right edge
      else if (state.x + w / 2 > vw) {
        state.x = vw - w / 2;
        vel.x = -Math.abs(vel.x) * BOUNCE_DAMPING;
        vel.rot -= vel.y * 0.15;
        bounced = true;
      }

      // Top edge
      if (state.y - h / 2 < 0) {
        state.y = h / 2;
        vel.y = Math.abs(vel.y) * BOUNCE_DAMPING;
        vel.rot -= vel.x * 0.15;
        bounced = true;
      }
      // Bottom edge
      else if (state.y + h / 2 > vh) {
        state.y = vh - h / 2;
        vel.y = -Math.abs(vel.y) * BOUNCE_DAMPING;
        vel.rot += vel.x * 0.15;
        bounced = true;
      }

      if (bounced) {
        if (window.audioEngineInstance) {
          window.audioEngineInstance.playInteractionTone();
        }
        if (opts.onBounce) opts.onBounce();
      }

      applyTransform();

      // Trigger trail particles while moving with inertia
      const speed = Math.hypot(vel.x, vel.y);
      if (speed > 0.4 && opts.onMove) {
        opts.onMove(state.x, state.y, speed);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (dragging) return;

    // Double tap check
    const now = Date.now();
    if (now - lastTap < 300) {
      if (opts.onDoubleTap) {
        opts.onDoubleTap();
        return;
      }
    }
    lastTap = now;

    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastPtrX = e.clientX;
    lastPtrY = e.clientY;
    lastTime = performance.now();

    vel.x = 0;
    vel.y = 0;
    vel.rot = 0;

    try {
      artifact.setPointerCapture(e.pointerId);
    } catch (err) {}

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;

    const time = performance.now();
    const dt = Math.max(1, time - lastTime);
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    state.x += dx;
    state.y += dy;

    // Calculate drag velocity
    const speedX = (e.clientX - lastPtrX) / dt * 16;
    const speedY = (e.clientY - lastPtrY) / dt * 16;
    vel.x = vel.x * 0.4 + speedX * 0.6;
    vel.y = vel.y * 0.4 + speedY * 0.6;

    // Calculate rotational torque based on off-center dragging
    const rect = artifact.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = lastPtrX - cx;
    const ry = lastPtrY - cy;
    const dist = Math.hypot(rx, ry);
    if (dist > 15) {
      // Torque formula: cross product of radius vector and speed vector
      const torque = (rx * speedY - ry * speedX) / (dist * dist);
      vel.rot = vel.rot * 0.5 + (torque * 180 / Math.PI) * 0.5 * 0.25;
    }

    startX = e.clientX;
    startY = e.clientY;
    lastPtrX = e.clientX;
    lastPtrY = e.clientY;
    lastTime = time;

    applyTransform();

    // Spawn trail particles during drag
    const moveSpeed = Math.hypot(speedX, speedY);
    if (opts.onMove) {
      opts.onMove(state.x, state.y, moveSpeed);
    }
  }

  function onPointerUp(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;

    try {
      artifact.releasePointerCapture(e.pointerId);
    } catch (err) {}
  }

  artifact.addEventListener('pointerdown', onPointerDown);
  artifact.addEventListener('pointermove', onPointerMove);
  artifact.addEventListener('pointerup', onPointerUp);
  artifact.addEventListener('pointercancel', onPointerUp);

  rafId = requestAnimationFrame(tick);

  return {
    setTransform(x, y, scale = 1, angle = 0) {
      state.x = x;
      state.y = y;
      state.scale = scale;
      state.angle = angle;
      applyTransform();
    },
    getState() {
      return { ...state };
    },
    destroy() {
      active = false;
      cancelAnimationFrame(rafId);
      artifact.removeEventListener('pointerdown', onPointerDown);
      artifact.removeEventListener('pointermove', onPointerMove);
      artifact.removeEventListener('pointerup', onPointerUp);
      artifact.removeEventListener('pointercancel', onPointerUp);
    }
  };
}
