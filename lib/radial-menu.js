// lib/radial-menu.js — Radial fidget menu.
// Long-press anywhere to bloom a circular menu of effects.
// Quick flick to select, release to dismiss.

const LONG_PRESS_MS = 500;
const MENU_RADIUS = 100;
const ITEM_SIZE = 52;
const STAGGER_MS = 30;

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

function springAnimate(el, delay, finalScale) {
  const start = performance.now();
  const duration = 280;
  function tick(now) {
    const elapsed = now - start - delay;
    if (elapsed < 0) {
      el.style.transform = 'scale(0)';
      el.style.opacity = '0';
      requestAnimationFrame(tick);
      return;
    }
    const t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const overshoot = t < 1 ? 1 + 0.15 * Math.sin(t * Math.PI) : 1;
    const scale = ease * overshoot * finalScale;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = String(Math.min(t * 2, 1));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function springOut(el, delay) {
  const start = performance.now();
  const duration = 180;
  function tick(now) {
    const elapsed = now - start - delay;
    if (elapsed < 0) {
      requestAnimationFrame(tick);
      return;
    }
    const t = Math.min(elapsed / duration, 1);
    const ease = t * t;
    const scale = 1 - ease;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = String(1 - ease);
    if (t < 1) requestAnimationFrame(tick);
    else el.style.transform = 'scale(0)';
  }
  requestAnimationFrame(tick);
}

export function mountRadialMenu(onSelect) {
  let active = false;
  let longPressTimer = null;
  let menuEl = null;
  let originX = 0;
  let originY = 0;

  function openMenu(x, y) {
    if (active) return;
    active = true;
    originX = x;
    originY = y;

    menuEl = document.createElement('div');
    menuEl.style.cssText =
      'position:fixed;z-index:500;top:0;left:0;width:100%;height:100%;pointer-events:none;';

    const n = MENU_ITEMS.length;
    MENU_ITEMS.forEach((item, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const tx = Math.cos(angle) * MENU_RADIUS;
      const ty = Math.sin(angle) * MENU_RADIUS;

      const el = document.createElement('button');
      el.style.cssText =
        `position:absolute;left:${originX - ITEM_SIZE / 2}px;top:${originY - ITEM_SIZE / 2}px;` +
        `width:${ITEM_SIZE}px;height:${ITEM_SIZE}px;border-radius:50%;border:none;` +
        `background:rgba(255,255,255,0.92);backdrop-filter:blur(8px);` +
        `box-shadow:0 2px 12px rgba(0,0,0,0.15);cursor:pointer;` +
        `display:flex;flex-direction:column;align-items:center;justify-content:center;` +
        `pointer-events:auto;transform:scale(0);opacity:0;` +
        `transition:background 0.15s,box-shadow 0.15s;font-size:22px;line-height:1;`;
      el.setAttribute('aria-label', item.label);

      const emoji = document.createElement('span');
      emoji.textContent = item.emoji;
      const label = document.createElement('span');
      label.style.cssText = 'font-size:8px;color:#555;margin-top:2px;font-family:sans-serif;';
      label.textContent = item.label;
      el.appendChild(emoji);
      el.appendChild(label);

      el.addEventListener('mouseenter', () => {
        el.style.background = 'rgba(255,255,255,1)';
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
        el.style.transform = 'scale(1.15)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.background = 'rgba(255,255,255,0.92)';
        el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        el.style.transform = '';
      });

      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        closeMenu();
        if (onSelect) onSelect(item.key);
      });

      menuEl.appendChild(el);
      springAnimate(el, i * STAGGER_MS, 1);

      const animStart = performance.now();
      function driftTick(now) {
        if (!menuEl) return;
        const elapsed = (now - animStart) / 1000;
        const drift = 1 + Math.sin(elapsed * 2) * 0.02;
        const ox = Math.cos(angle) * MENU_RADIUS * drift;
        const oy = Math.sin(angle) * MENU_RADIUS * drift;
        el.style.left = `${originX + ox - ITEM_SIZE / 2}px`;
        el.style.top = `${originY + oy - ITEM_SIZE / 2}px`;
        requestAnimationFrame(driftTick);
      }
      requestAnimationFrame(driftTick);
    });

    document.body.appendChild(menuEl);
  }

  function closeMenu() {
    if (!active || !menuEl) return;
    const items = menuEl.querySelectorAll('button');
    items.forEach((el, i) => {
      springOut(el, i * 15);
    });
    const totalClose = items.length * 15 + 200;
    const el = menuEl;
    setTimeout(() => el.remove(), totalClose);
    menuEl = null;
    active = false;
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
