// lib/radial-menu.js — Radial fidget menu.
// Long-press anywhere to bloom a circular menu of effects.
// Quick flick to select, release to dismiss.

const LONG_PRESS_MS = 500;
const MENU_RADIUS = 100;
const ITEM_SIZE = 52;
const STAGGER_MS = 30;
const SPRING_DURATION = 280;
const OUT_DURATION = 180;
const DRIFT_SPEED = 2;
const DRIFT_RANGE = 0.02;

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
    const overshoot = t < 1 ? 1 + 0.15 * Math.sin(t * Math.PI) : 1;
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

export function mountRadialMenu(onSelect) {
  let menuEl = null;
  let active = false;
  let longPressTimer = null;
  let originX = 0;
  let originY = 0;

  function openMenu(x, y) {
    if (active) return;
    active = true;
    originX = x;
    originY = y;

    menuEl = document.createElement('div');
    menuEl.style.cssText = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;
      z-index:500;pointer-events:none;
    `;

    // Center dot.
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;width:16px;height:16px;background:white;border-radius:50%;
      left:${x}px;top:${y}px;transform:translate(-50%,-50%);
      box-shadow:0 0 20px rgba(255,255,255,0.8);pointer-events:none;
    `;
    menuEl.appendChild(dot);

    // Effect items.
    const n = MENU_ITEMS.length;
    MENU_ITEMS.forEach((item, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const finalX = x + Math.cos(angle) * MENU_RADIUS;
      const finalY = y + Math.sin(angle) * MENU_RADIUS;

      const el = document.createElement('button');
      el.setAttribute('aria-label', item.label);
      el.style.cssText = `
        position:absolute;width:${ITEM_SIZE}px;height:${ITEM_SIZE}px;
        background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
        border-radius:50%;display:flex;flex-direction:column;align-items:center;
        justify-content:center;cursor:pointer;pointer-events:auto;
        left:${x - ITEM_SIZE / 2}px;top:${y - ITEM_SIZE / 2}px;
        transform:scale(0);opacity:0;
        transition:background 0.15s;
      `;
      el.innerHTML = `
        <span style="font-size:18px;line-height:1;">${item.emoji}</span>
        <span style="font-size:8px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.04em;">${item.label}</span>
      `;

      el.addEventListener('pointerenter', () => {
        el.style.background = 'rgba(255,255,255,0.18)';
      });
      el.addEventListener('pointerleave', () => {
        el.style.background = 'rgba(255,255,255,0.08)';
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
        el.style.transition = 'left 0.28s cubic-bezier(0.34,1.56,0.64,1), top 0.28s cubic-bezier(0.34,1.56,0.64,1)';
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
      const dy = Math.cos(elapsed * DRIFT_SPEED * 0.7) * DRIFT_RANGE * MENU_RADIUS;
      const items = menuEl.querySelectorAll('button');
      items.forEach((el, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const fx = x + Math.cos(angle) * MENU_RADIUS + dx;
        const fy = y + Math.sin(angle) * MENU_RADIUS + dy;
        el.style.left = `${fx - ITEM_SIZE / 2}px`;
        el.style.top = `${fy - ITEM_SIZE / 2}px`;
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

    // Cancel all animations.
    const items = menuEl.querySelectorAll('button');
    items.forEach((el) => {
      cancelAnim(el);
      springOut(el, 0);
    });

    // Cancel drift.
    if (menuEl._driftRaf) cancelAnimationFrame(menuEl._driftRaf);

    const totalClose = items.length * 15 + OUT_DURATION;
    const el = menuEl;
    setTimeout(() => el.remove(), totalClose);
    menuEl = null;
  }

  function onPointerDown(e) {
    if (active) return;
    longPressTimer = setTimeout(() => {
      openMenu(e.clientX, e.clientY);
    }, LONG_PRESS_MS);
  }

  function onPointerUp() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    // Release to dismiss — close menu if open and no item was selected.
    if (active) closeMenu();
  }

  function onPointerMove(e) {
    if (!active && longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
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
