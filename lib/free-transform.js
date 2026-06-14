// lib/free-transform.js — Inertia-driven spinning, dragging, and scaling engine
export function makeFreeTransform(artifact, opts = {}) {
  let selfRef = null;
  let state = {
    x: parseFloat(artifact.style.left) + (artifact.offsetWidth || 260) / 2 || 150,
    y: parseFloat(artifact.style.top) + (artifact.offsetHeight || 260) / 2 || 150,
    angle: 0,
    scale: 1.0
  };

  let vel = { x: 0, y: 0, rot: 0 };
  let dragging = false;
  let startX = 0, startY = 0;
  let pointers = new Map();

  // For multi-pointer pinch zoom
  let startPinchDist = 0;
  let startPinchScale = 1.0;

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
  
  // Scale limits
  const MIN_SCALE = 0.35;
  const MAX_SCALE = 4.0;

  function applyTransform(speed = 0) {
    artifact.style.left = `${state.x - (artifact.offsetWidth || 260) / 2}px`;
    artifact.style.top = `${state.y - (artifact.offsetHeight || 260) / 2}px`;
    artifact.style.transform = `scale(${state.scale}) rotate(${state.angle}deg)`;
    if (opts.onTransform) {
      opts.onTransform(state.x, state.y, state.scale, state.angle, speed, vel.x, vel.y);
    }
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

      // Viewport bounce based on current scaled size
      const w = (artifact.offsetWidth || 260) * state.scale;
      const h = (artifact.offsetHeight || 260) * state.scale;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let bounced = false;

      // Left edge
      if (state.x - w / 2 < 0) {
        state.x = w / 2;
        vel.x = Math.abs(vel.x) * BOUNCE_DAMPING;
        vel.rot += vel.y * 0.15;
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

      const speed = Math.hypot(vel.x, vel.y);
      applyTransform(speed);
    }

    rafId = requestAnimationFrame(tick);
  }

  function getPinchDist() {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    // Set as active artifact for global keyboard resizing
    window.activeFidgetArtifact = selfRef;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Double tap check (single pointer only)
    if (pointers.size === 1) {
      const now = Date.now();
      if (now - lastTap < 300) {
        if (opts.onDoubleTap) {
          opts.onDoubleTap();
          return;
        }
      }
      lastTap = now;
      
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      lastTime = performance.now();
      
      vel.x = 0;
      vel.y = 0;
      vel.rot = 0;
    } else if (pointers.size === 2) {
      // Start multi-touch pinch to scale
      startPinchDist = getPinchDist() || 1;
      startPinchScale = state.scale;
    }

    try {
      artifact.setPointerCapture(e.pointerId);
    } catch (err) {}

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1 && dragging) {
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
        const torque = (rx * speedY - ry * speedX) / (dist * dist);
        vel.rot = vel.rot * 0.5 + (torque * 180 / Math.PI) * 0.5 * 0.25;
      }

      startX = e.clientX;
      startY = e.clientY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      lastTime = time;

      const moveSpeed = Math.hypot(speedX, speedY);
      applyTransform(moveSpeed);
    } else if (pointers.size === 2) {
      // 2-finger pinch resizing
      const currentDist = getPinchDist();
      if (currentDist > 5) {
        const factor = currentDist / startPinchDist;
        state.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startPinchScale * factor));
        applyTransform();
      }
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    try {
      artifact.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (pointers.size === 0) {
      dragging = false;
    } else if (pointers.size === 1) {
      // Reset drag base coordinates for the remaining finger
      const remaining = Array.from(pointers.values())[0];
      startX = remaining.x;
      startY = remaining.y;
      lastPtrX = remaining.x;
      lastPtrY = remaining.y;
      lastTime = performance.now();
    }
  }

  // Mouse wheel zoom
  function onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    state.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, state.scale * zoomFactor));
    applyTransform();
    
    if (window.audioEngineInstance && Math.random() < 0.2) {
      window.audioEngineInstance.playInteractionTone();
    }
  }

  // Keyboard zoom
  function onKeyDown(e) {
    if (e.key === '=' || e.key === '+') {
      state.scale = Math.min(MAX_SCALE, state.scale * 1.1);
      applyTransform();
    } else if (e.key === '-' || e.key === '_') {
      state.scale = Math.max(MIN_SCALE, state.scale * 0.9);
      applyTransform();
    }
  }

  function onPointerEnter() {
    window.activeFidgetArtifact = selfRef;
  }

  artifact.addEventListener('pointerdown', onPointerDown);
  artifact.addEventListener('pointermove', onPointerMove);
  artifact.addEventListener('pointerup', onPointerUp);
  artifact.addEventListener('pointercancel', onPointerUp);
  artifact.addEventListener('pointerenter', onPointerEnter);
  artifact.addEventListener('wheel', onWheel, { passive: false });
  
  // Only handle keys when user is interacting with the element (tabIndex enables focus)
  artifact.tabIndex = 0;
  artifact.addEventListener('keydown', onKeyDown);
  // Remove default blue outline on focus
  artifact.style.outline = 'none';

  rafId = requestAnimationFrame(tick);

  selfRef = {
    setTransform(x, y, scale = 1, angle = 0) {
      state.x = x;
      state.y = y;
      state.scale = scale;
      state.angle = angle;
      applyTransform();
    },
    zoom(factor) {
      state.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, state.scale * factor));
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
      artifact.removeEventListener('pointerenter', onPointerEnter);
      artifact.removeEventListener('wheel', onWheel);
      artifact.removeEventListener('keydown', onKeyDown);
      if (window.activeFidgetArtifact === selfRef) {
        window.activeFidgetArtifact = null;
      }
    }
  };
  return selfRef;
}
