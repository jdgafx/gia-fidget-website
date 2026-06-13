// main.js — Bootstrap for Gia's fidget website.
// 1. Mounts the ambient background.
// 2. Wires the chip tray to spawn effect cards.
// 3. Each spawned card is draggable by its handle bar.
// 4. First-card-spawned fades out the "tap a glow below" prompt.

import { mountBackground } from './ambient/background.js';
import { mountFluidGoo }     from './effects/fluid-goo.js';
import { mountSoapBubble }   from './effects/soap-bubble.js';
import { mountPetalDrift }   from './effects/petal-drift.js';
import { mountAuroraRibbon } from './effects/aurora-ribbon.js';
import { mountGalaxy }       from './effects/galaxy.js';
import { mountGlowRipple }   from './effects/glow-ripple.js';
import { mountLoveNote }     from './effects/love-note.js';
import { mountNeverGiveUp }  from './effects/never-give-up.js';
import { makeDraggable }     from './lib/draggable.js';
import { isDocumentVisible } from './lib/visibility.js';

const EFFECT_LABELS = {
  'fluid-goo':     'Goo',
  'soap-bubble':   'Bubble',
  'petal-drift':   'Petals',
  'aurora-ribbon': 'Aurora',
  'galaxy':        'Galaxy',
  'glow-ripple':   'Ripple',
  'love-note':     'Love',
  'never-give-up': 'Hope',
};

const EFFECT_MOUNT = {
  'fluid-goo':     mountFluidGoo,
  'soap-bubble':   mountSoapBubble,
  'petal-drift':   mountPetalDrift,
  'aurora-ribbon': mountAuroraRibbon,
  'galaxy':        mountGalaxy,
  'glow-ripple':   mountGlowRipple,
  'love-note':     mountLoveNote,
  'never-give-up': mountNeverGiveUp,
};

// ---------- Ambient background ----------

const ambientCanvas = document.getElementById('ambient-canvas');
const ambient = mountBackground(ambientCanvas);

// ---------- Prompt fade ----------

const prompt = document.getElementById('prompt');
let promptHidden = false;
function hidePrompt() {
  if (promptHidden) return;
  promptHidden = true;
  prompt.classList.remove('show');
  prompt.classList.add('hide');
}
window.setTimeout(() => prompt.classList.add('show'), 800);
window.setTimeout(hidePrompt, 8000);

// ---------- Spawn + draggable cards ----------

const stage = document.getElementById('effects-stage');
const tray = document.getElementById('chip-tray-inner');
let cardIndex = 0;

// Viewport-aware grid spawn: 2x4 on mobile, 4x2 on desktop (8 slots).
// Cards never overlap because each spawn picks the next free cell.
function nextSpawnPosition() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 768;
  const margin = 12;
  const headerH = 90;
  const trayH = 110; // taller tray now that 2 word chips share it

  const cols = isMobile ? 2 : 4;
  const rows = isMobile ? 4 : 2;

  // Card size fits the grid minus margins.
  const cardW = Math.floor((vw - margin * (cols + 1)) / cols);
  const cardH = Math.floor((vh - headerH - trayH - margin * (rows + 1)) / rows);

  const idx = cardIndex++ % (cols * rows);
  const col = idx % cols;
  const row = Math.floor(idx / cols);

  const x = margin + col * (cardW + margin);
  const y = headerH + margin + row * (cardH + margin);

  return { x, y, cardW, cardH };
}

function makeCard(effectKey) {
  const mount = EFFECT_MOUNT[effectKey];
  if (!mount) return;

  const card = document.createElement('div');
  card.className = 'effect-card';
  const label = EFFECT_LABELS[effectKey] || 'Effect';

  const handle = document.createElement('div');
  handle.className = 'effect-handle';
  const title = document.createElement('span');
  title.className = 'effect-handle-title';
  title.textContent = label;
  const close = document.createElement('button');
  close.className = 'effect-close';
  close.setAttribute('aria-label', `Close ${label}`);
  close.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  handle.appendChild(title);
  handle.appendChild(close);

  const canvas = document.createElement('div');
  canvas.className = 'effect-canvas';

  card.appendChild(handle);
  card.appendChild(canvas);

  const { x, y, cardW, cardH } = nextSpawnPosition();
  card.style.left = `${x}px`;
  card.style.top  = `${y}px`;
  card.style.width  = `${cardW}px`;
  card.style.height = `${cardH}px`;
  stage.appendChild(card);

  // Mount effect (some return Promises — petal-drift waits for tsparticles).
  const instanceOrPromise = mount(canvas);
  Promise.resolve(instanceOrPromise).then(instance => {
    if (!instance) return;
    card._instance = instance;
  });

  // Make draggable.
  const drag = makeDraggable(card, handle);

  // Close.
  close.addEventListener('click', () => {
    card.classList.add('closing');
    setTimeout(() => {
      try { card._instance && card._instance.destroy && card._instance.destroy(); } catch {}
      drag.destroy();
      card.remove();
    }, 380);
  });

  // Mount animation: opacity + scale.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.add('mounted');
    });
  });

  hidePrompt();
  return card;
}

tray.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const key = chip.dataset.effect;
  makeCard(key);
});

// ---------- Hide tray scroll shadow on overflow ----------

function checkTrayOverflow() {
  if (!tray) return;
  tray.style.overflowX = tray.scrollWidth > tray.clientWidth ? 'auto' : 'hidden';
}
window.addEventListener('resize', checkTrayOverflow);
window.setTimeout(checkTrayOverflow, 200);

// ---------- Tab visibility (CSS ambient only — RAF handled internally) ----------

document.addEventListener('visibilitychange', () => {
  // Each effect's RAF pauses itself; nothing to do here globally.
  // This is a no-op hook for future instrumentation.
});

// ---------- Done. The room is alive. ----------

if (isDocumentVisible()) {
  // No-op — everything is already running.
}
