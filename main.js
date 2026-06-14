// main.js — Bootstrap for Gia's fidget website.
// 1. Mounts the ambient background + orb cursor.
// 2. Radial menu spawns draggable effect entities.
// 3. Effects explode on fast fling or double-tap.

import { mountBackground } from './ambient/background.js';
import { mountFluidGoo }     from './effects/fluid-goo.js';
import { mountSoapBubble }   from './effects/soap-bubble.js';
import { mountPetalDrift }   from './effects/petal-drift.js';
import { mountAuroraRibbon } from './effects/aurora-ribbon.js';
import { mountGalaxy }       from './effects/galaxy.js';
import { mountGlowRipple }   from './effects/glow-ripple.js';
import { mountLoveNote }     from './effects/love-note.js';
import { mountNeverGiveUp }  from './effects/never-give-up.js';
import { mountSandPour }     from './effects/sand-pour.js';
import { mountChill3D }      from './effects/chill-3d.js';
import { makeFreeTransform } from './lib/free-transform.js';
import { mountOrbCursor }    from './lib/orb-cursor.js';
import { mountRadialMenu }   from './lib/radial-menu.js';
import { createExplosion }   from './lib/party-explosion.js';

const EFFECT_MOUNT = {
  'fluid-goo':     mountFluidGoo,
  'soap-bubble':   mountSoapBubble,
  'petal-drift':   mountPetalDrift,
  'aurora-ribbon': mountAuroraRibbon,
  'galaxy':        mountGalaxy,
  'glow-ripple':   mountGlowRipple,
  'love-note':     mountLoveNote,
  'never-give-up': mountNeverGiveUp,
  'sand-pour':     mountSandPour,
  'chill-3d':      mountChill3D,
};

const EFFECT_LABELS = {
  'fluid-goo':     'Goo',
  'soap-bubble':   'Bubble',
  'petal-drift':   'Petals',
  'aurora-ribbon': 'Aurora',
  'galaxy':        'Galaxy',
  'glow-ripple':   'Ripple',
  'love-note':     'Love',
  'never-give-up': 'Hope',
  'sand-pour':     'Sand',
  'chill-3d':      'Dreamscape',
};

const WORD_EFFECTS = new Set(['love-note', 'never-give-up']);

const RADIAL_KEY_MAP = {
  'goo':     'fluid-goo',
  'bubble':  'soap-bubble',
  'petals':  'petal-drift',
  'aurora':  'aurora-ribbon',
  'galaxy':  'galaxy',
  'ripple':  'glow-ripple',
  'sand':    'sand-pour',
  '3d':      'chill-3d',
  'love':    'love-note',
  'hope':    'never-give-up',
};

// ---------- Ambient background ----------

const ambientCanvas = document.getElementById('ambient-canvas');
mountBackground(ambientCanvas);

// ---------- Orb cursor ----------

mountOrbCursor();

// ---------- Effect count ----------

let effectCount = 0;
const stage = document.getElementById('effects-stage');
const emptyState = document.getElementById('empty-state');

function updateEmptyState() {
  if (emptyState) {
    emptyState.classList.toggle('hidden', effectCount > 0);
  }
}

// ---------- Toast ----------

function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 1600);
}

// ---------- Spawn effect ----------

function spawnEffect(effectKey) {
  const mount = EFFECT_MOUNT[effectKey];
  if (!mount) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = Math.min(280, Math.min(vw, vh) * 0.5);

  const entity = document.createElement('div');
  entity.className = 'effect-entity' + (WORD_EFFECTS.has(effectKey) ? ' is-word' : '');
  entity.style.width = `${size}px`;
  entity.style.height = `${size}px`;

  // Random position in viewport.
  const x = Math.random() * (vw - size);
  const y = Math.random() * (vh - size);
  entity.style.left = `${x}px`;
  entity.style.top = `${y}px`;

  // Mount effect inside.
  const instanceOrPromise = mount(entity);
  Promise.resolve(instanceOrPromise).then(instance => {
    if (instance) entity._instance = instance;
  });

  // Dragging state.
  let isDragging = false;
  entity.addEventListener('pointerdown', () => {
    isDragging = true;
    entity.classList.add('dragging');
  });
  entity.addEventListener('pointerup', () => {
    isDragging = false;
    entity.classList.remove('dragging');
  });
  entity.addEventListener('pointercancel', () => {
    isDragging = false;
    entity.classList.remove('dragging');
  });

  // Word effects: tap for hearts/stars explosion.
  if (WORD_EFFECTS.has(effectKey)) {
    let tapStartX = 0, tapStartY = 0, tapTime = 0;
    entity.addEventListener('pointerdown', (e) => {
      tapStartX = e.clientX;
      tapStartY = e.clientY;
      tapTime = performance.now();
    });
    entity.addEventListener('pointerup', (e) => {
      const elapsed = performance.now() - tapTime;
      const dist = Math.hypot(e.clientX - tapStartX, e.clientY - tapStartY);
      if (elapsed < 280 && dist < 10) {
        const preset = effectKey === 'love-note' ? 'hearts' : 'stars';
        createExplosion(entity, size / 2, size / 2, preset, 1);
      }
    });
  }

  // Free transform with explosion + bounce feedback.
  const ft = makeFreeTransform(entity, {
    onDoubleTap: () => explodeAndRemove(entity, ft),
    onExplosion: (speed) => {
      createExplosion(entity, size / 2, size / 2, 'confetti', Math.min(speed / 8, 3));
    },
    onBounce: () => {
      entity.style.filter = 'drop-shadow(0 0 30px rgba(167, 139, 250, 0.6))';
      setTimeout(() => { entity.style.filter = ''; }, 300);
    },
  });

  // Random initial rotation.
  const initRot = (Math.random() - 0.5) * 40;
  const cx = x + size / 2;
  const cy = y + size / 2;
  ft.setTransform(cx, cy, 1, initRot, 0, 0);

  stage.appendChild(entity);

  // Spring-in animation.
  entity.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      entity.style.transition = 'opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      entity.style.opacity = '1';
    });
  });

  effectCount++;
  updateEmptyState();
  showToast(EFFECT_LABELS[effectKey] || effectKey);

  return entity;
}

// ---------- Explode and remove ----------

function explodeAndRemove(entity, ft) {
  const rect = entity.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  createExplosion(entity, cx, cy, 'bigBang', 2);

  entity.style.transition = 'opacity 0.3s ease-out';
  entity.style.opacity = '0';

  setTimeout(() => {
    try { entity._instance && entity._instance.destroy && entity._instance.destroy(); } catch {}
    ft && ft.destroy();
    entity.remove();
    effectCount--;
    updateEmptyState();
  }, 350);
}

// ---------- Radial menu ----------

mountRadialMenu((key) => {
  const effectKey = RADIAL_KEY_MAP[key];
  if (effectKey) spawnEffect(effectKey);
});

// ---------- Init ----------

updateEmptyState();
