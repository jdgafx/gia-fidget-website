// lib/radial-menu.js — Radial fidget menu.
// Long-press anywhere to bloom a circular menu of effects.
// Slide-to-select (drag and release) or tap-to-select (release quickly, then tap).

const LONG_PRESS_MS = 400; // 400ms for more responsive feel
const MENU_RADIUS = 100;
const ITEM_SIZE = 54;
const STAGGER_MS = 25;
const SPRING_DURATION = 280;
const OUT_DURATION = 180;
const DRIFT_SPEED = 2.2;
const DRIFT_RANGE = 0.025;

const MENU_ITEMS = [
  { key: 'goo',     emoji: '💧', label: 'Goo' },
  { key: 'bubble',  emoji: '🫧', label: 'Bubble' },
  { key: 'petals',  emoji: '🌸', label: 'Petals' },
  { key: 'aurora',  emoji: '🌈', label: 'Aurora' },
  { key: 'galaxy',  emoji: '🌌', label: 'Galaxy' },
  { key: 'ripple',  emoji: '💫', label: 'Ripple' },
  { key: 'sand',    emoji: '⏳', label: 'Sand' },
  { key: '3d',      emoji: '🔮', label: '3D' },
  { key: 'love',    emoji: '❤️', label: 'Love' },
  { key: 'hope',    emoji: '⭐', label: 'Hope' },
];

// Per-element animation tracking for cancellation.
const animFrames = new WeakMap();

function cancelAnim(el) {
  const frames = animFrames.get(el);
  if (frames) {
    for (const id of frames) cancelAnimationFrame(id);
    frames.length = 0;
  }
}

function trackAnim(el, id) {
  let frames = animFrames.get(el);
  if (!frames) {
    frames = [];
    animFrames.set(el, frames);
  }
  frames.push(id);
}

function springAnimate(el, delay, finalScale) {
  cancelAnim(el);
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start - delay;
    if (elapsed < 0) {
      el.style.transform = 'scale(0)';
      el.style.opacity = '0';
      trackAnim(el, requestAnimationFrame(tick));
      return;
    }
    const t = Math.min(elapsed / SPRING_DURATION, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const overshoot = t < 1 ? 1 + 0.12 * Math.sin(t * Math.PI) : 1;
    const scale = ease * overshoot * finalScale;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = String(Math.min(t * 2, 1));
    if (t < 1) trackAnim(el, requestAnimationFrame(tick));
  }
  trackAnim(el, requestAnimationFrame(tick));
}

function springOut(el, delay) {
  cancelAnim(el);
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start - delay;
    if (elapsed < 0) {
      trackAnim(el, requestAnimationFrame(tick));
      return;
    }
    const t = Math.min(elapsed / OUT_DURATION, 1);
    const ease = t * t;
    el.style.transform = `scale(${1 - ease})`;
    el.style.opacity = String(1 - ease);
    if (t < 1) trackAnim(el, requestAnimationFrame(tick));
  }
  trackAnim(el, requestAnimationFrame(tick));
}

export function mountRadialMenu(onSelect, opts = {}) {
  let menuEl = null;
  let active = false;
  let keepOpen = false;
  let longPressTimer = null;
  let originX = 0;
  let originY = 0;
  let maxDragDist = 0;
  let pointerDownPos = null;
  let hoveredIndex = -1;

  function openMenu(x, y) {
    if (active) return;
    active = true;
    keepOpen = false;
    hoveredIndex = -1;
    originX = x;
    originY = y;

    if (opts.onOpen) opts.onOpen();

    menuEl = document.createElement('div');
    menuEl.className = 'radial-menu-container';
    menuEl.style.cssText = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;
      z-index:500;pointer-events:none;
    `;

    // Center dot with pulsing rings
    const dot = document.createElement('div');
    dot.className = 'radial-menu-center';
    dot.style.cssText = `
      position:absolute;width:18px;height:18px;background:white;border-radius:50%;
      left:${x}px;top:${y}px;transform:translate(-50%,-50%);
      box-shadow:0 0 25px rgba(255,255,255,0.9), 0 0 10px rgba(167, 139, 250, 0.5);
      pointer-events:none;
    `;
    menuEl.appendChild(dot);

    // Effect items
    const n = MENU_ITEMS.length;
    MENU_ITEMS.forEach((item, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const finalX = x + Math.cos(angle) * MENU_RADIUS;
      const finalY = y + Math.sin(angle) * MENU_RADIUS;

      const el = document.createElement('button');
      el.setAttribute('aria-label', item.label);
      el.className = 'radial-menu-item';
      el.style.cssText = `
        position:absolute;width:${ITEM_SIZE}px;height:${ITEM_SIZE}px;
        background:rgba(15, 10, 30, 0.65);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:50%;display:flex;flex-direction:column;align-items:center;
        justify-content:center;cursor:pointer;pointer-events:auto;
        left:${x - ITEM_SIZE / 2}px;top:${y - ITEM_SIZE / 2}px;
        transform:scale(0);opacity:0;
        backdrop-filter:blur(8px);
        -webkit-backdrop-filter:blur(8px);
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
        transition:background 0.2s, border-color 0.2s, box-shadow 0.2s;
        will-change:transform, opacity, left, top;
      `;
      el.innerHTML = `
        <span style="font-size:18px;line-height:1;margin-bottom:1px;">${item.emoji}</span>
        <span style="font-size:8px;font-weight:500;color:rgba(255,255,255,0.65);letter-spacing:0.04em;">${item.label}</span>
      `;

      el.addEventListener('pointerenter', () => {
        if (keepOpen) {
          el.style.background = 'rgba(255,255,255,0.18)';
          el.style.borderColor = 'rgba(167, 139, 250, 0.4)';
        }
      });
      el.addEventListener('pointerleave', () => {
        if (keepOpen) {
          el.style.background = 'rgba(15, 10, 30, 0.65)';
          el.style.borderColor = 'rgba(255,255,255,0.12)';
        }
      });

      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onSelect(item.key);
        closeMenu();
      });

      menuEl.appendChild(el);

      // Staggered spring-in to final position.
      setTimeout(() => {
        if (!active) return;
        springAnimate(el, 0, 1);
        el.style.transition = 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, border-color 0.2s, box-shadow 0.2s';
        el.style.left = `${finalX - ITEM_SIZE / 2}px`;
        el.style.top = `${finalY - ITEM_SIZE / 2}px`;
      }, i * STAGGER_MS);
    });

    // Gentle breathing drift.
    const startTime = performance.now();
    let driftRaf = 0;
    function driftTick(now) {
      if (!active || !menuEl) return;
      const elapsed = (now - startTime) / 1000;
      const dx = Math.sin(elapsed * DRIFT_SPEED) * DRIFT_RANGE * MENU_RADIUS;
      const dy = Math.cos(elapsed * DRIFT_SPEED * 0.75) * DRIFT_RANGE * MENU_RADIUS;
      const items = menuEl.querySelectorAll('button');
      items.forEach((el, i) => {
        if (i !== hoveredIndex) {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const fx = x + Math.cos(angle) * MENU_RADIUS + dx;
          const fy = y + Math.sin(angle) * MENU_RADIUS + dy;
          el.style.left = `${fx - ITEM_SIZE / 2}px`;
          el.style.top = `${fy - ITEM_SIZE / 2}px`;
        }
      });
      driftRaf = requestAnimationFrame(driftTick);
    }
    driftRaf = requestAnimationFrame(driftTick);

    // Store drift raf for cleanup.
    menuEl._driftRaf = driftRaf;

    document.body.appendChild(menuEl);
  }

  function closeMenu() {
    if (!active || !menuEl) return;
    active = false;
    keepOpen = false;
    hoveredIndex = -1;

    if (opts.onClose) opts.onClose();

    // Cancel all animations.
    const items = menuEl.querySelectorAll('button');
    items.forEach((el) => {
      cancelAnim(el);
      springOut(el, 0);
    });

    // Cancel drift.
    if (menuEl._driftRaf) cancelAnimationFrame(menuEl._driftRaf);

    const totalClose = items.length * 10 + OUT_DURATION;
    const el = menuEl;
    setTimeout(() => el.remove(), totalClose);
    menuEl = null;
  }

  function onPointerDown(e) {
    if (active) {
      if (keepOpen) {
        const btn = e.target.closest('.radial-menu-item');
        if (!btn) {
          closeMenu();
        }
      }
      return;
    }
    
    if (e.button !== undefined && e.button !== 0) return;

    maxDragDist = 0;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    longPressTimer = setTimeout(() => {
      openMenu(e.clientX, e.clientY);
    }, LONG_PRESS_MS);
  }

  function onPointerUp(e) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    
    if (active) {
      if (maxDragDist > 20) {
        if (hoveredIndex !== -1) {
          onSelect(MENU_ITEMS[hoveredIndex].key);
        }
        closeMenu();
      } else {
        keepOpen = true;
      }
    }
    pointerDownPos = null;
  }

  function onPointerMove(e) {
    if (pointerDownPos) {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      maxDragDist = Math.max(maxDragDist, dist);
    }

    if (!active) {
      if (longPressTimer && pointerDownPos) {
        const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (dist > 15) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
      return;
    }

    const dx = e.clientX - originX;
    const dy = e.clientY - originY;
    const distToCenter = Math.hypot(dx, dy);

    let bestIdx = -1;
    if (distToCenter > 45 && distToCenter < 170) {
      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) angle += Math.PI * 2;

      let minDiff = Infinity;
      const n = MENU_ITEMS.length;
      MENU_ITEMS.forEach((item, i) => {
        const itemAngle = (i / n) * Math.PI * 2 - Math.PI / 2;
        let diff = Math.abs(angle - itemAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i;
        }
      });
    }

    if (bestIdx !== hoveredIndex) {
      hoveredIndex = bestIdx;
      const buttons = menuEl.querySelectorAll('button');
      buttons.forEach((btn, i) => {
        if (i === hoveredIndex) {
          btn.style.background = 'rgba(255, 255, 255, 0.22)';
          btn.style.borderColor = 'rgba(167, 139, 250, 0.6)';
          btn.style.transform = 'scale(1.22)';
          btn.style.boxShadow = '0 0 25px rgba(167, 139, 250, 0.45)';
          
          if (opts.onHoverItem) opts.onHoverItem(MENU_ITEMS[i].key);
        } else {
          btn.style.background = 'rgba(15, 10, 30, 0.65)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          btn.style.transform = 'scale(1)';
          btn.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
        }
      });
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') closeMenu();
  }

  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      closeMenu();
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
