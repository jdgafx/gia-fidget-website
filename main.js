// main.js — Bootstrap for Gia's fidget website.
// 1. Mounts the ambient background.
// 2. Wires the chip tray to spawn effect cards.
// 3. Each spawned card is draggable by its handle bar.
// 4. First-card-spawned fades out the "tap a glow below" prompt.
// 5. Orchestrates: audio, symmetry, passive mode, save gesture, variants, AI names, perf monitor.

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
import { isDocumentVisible } from './lib/visibility.js';
import { createSymmetryController } from './lib/symmetry-controller.js';
import { makeSaveGesture }   from './lib/save-gesture.js';
import { createPassiveMode } from './lib/passive-mode.js';
import { generateName, generateVibeTag } from './lib/ai-names.js';
import { createPerfMonitor, capEffects } from './lib/perf-monitor.js';
import { AudioEngine }      from './audio/engine.js';

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

// Variant definitions: each effect → array of variant names.
const EFFECT_VARIANTS = {
  'fluid-goo':     ['Sunset', 'Lagoon', 'Lavender', 'Mint', 'Sand'],
  'soap-bubble':   ['Rainbow', 'Frost', 'Rose', 'Ocean'],
  'petal-drift':   ['Sakura', 'Rose', 'Lavender', 'Autumn'],
  'aurora-ribbon': ['Northern', 'Sunset', 'Ocean', 'Forest'],
  'galaxy':        ['Spiral', 'Cluster', 'Nebula', 'Void'],
  'glow-ripple':   ['Calm', 'Rainbow', 'Soft', 'Pulse'],
  'love-note':     ['Classic', 'Playful', 'Tender'],
  'never-give-up': ['Classic', 'Bold', 'Gentle'],
  'sand-pour':     ['Warm', 'Pastel', 'Neon', 'Earth', 'Ocean'],
  'chill-3d':      ['Meadow', 'Sunset', 'Twilight', 'Ocean', 'Lavender'],
};

const WORD_EFFECTS = new Set(['love-note', 'never-give-up']);
const CANVAS_EFFECTS = new Set(['fluid-goo', 'soap-bubble', 'petal-drift', 'aurora-ribbon', 'galaxy', 'glow-ripple', 'sand-pour', 'chill-3d']);
const MIRRORABLE_EFFECTS = new Set(['sand-pour', 'aurora-ribbon', 'galaxy', 'glow-ripple']);

// ---------- Ambient background ----------

const ambientCanvas = document.getElementById('ambient-canvas');
const ambient = mountBackground(ambientCanvas);

// ---------- Audio engine ----------

const audioEngine = new AudioEngine();

// ---------- Symmetry controller ----------

const symmetry = createSymmetryController();

// ---------- Perf monitor ----------

const perfMonitor = createPerfMonitor();

// ---------- Passive mode ----------

const passiveMode = createPassiveMode({
  onPassive() {
    if (isWelcomeVisible) return;
    document.body.classList.add('passive');
    ambient.setSpeed(0.2);
    audioEngine.swellAmbient();
  },
  onActive() {
    document.body.classList.remove('passive');
    ambient.setSpeed(1.0);
    audioEngine.restoreAmbientVolume();
  },
});

// ---------- Spawn + draggable cards ----------

const stage = document.getElementById('effects-stage');
const tray = document.getElementById('chip-tray-inner');
let cardIndex = 0;

// Track spawned cards for variant cycling and effect capping.
const spawnedCards = []; // { card, ft, effectKey, variant }

// ---------- Welcome card ----------
let isWelcomeVisible = false;
let welcomeCardEl = null;
let welcomeDismissTimer = null;

function initWelcomeCard() {
  if (sessionStorage.getItem('gia-welcome-dismissed')) return;
  welcomeCardEl = document.getElementById('welcome-card');
  if (!welcomeCardEl) return;
  isWelcomeVisible = true;

  const btn = welcomeCardEl.querySelector('.welcome-btn');
  btn.addEventListener('click', dismissWelcomeCard);
}

function dismissWelcomeCard() {
  if (!isWelcomeVisible || !welcomeCardEl) return;
  isWelcomeVisible = false;
  welcomeCardEl.classList.add('dismissing');
  sessionStorage.setItem('gia-welcome-dismissed', '1');
  clearTimeout(welcomeDismissTimer);
  welcomeDismissTimer = setTimeout(() => {
    welcomeCardEl.remove();
    welcomeCardEl = null;
  }, 300);
  // Show empty state prompt after welcome is dismissed and no cards are on screen.
  if (spawnedCards.length === 0) {
    showEmptyState();
  }
}

// ---------- Empty state prompt ----------
const emptyStatePrompt = document.getElementById('empty-state-prompt');

function showEmptyState() {
  if (emptyStatePrompt) emptyStatePrompt.classList.remove('hidden');
}

function hideEmptyState() {
  if (emptyStatePrompt) emptyStatePrompt.classList.add('hidden');
}

// Viewport-aware grid spawn: 2x4 on mobile, 4x2 on desktop (8 slots).
function nextSpawnPosition() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 768;
  const margin = 12;
  const headerH = 90;
  const trayH = 110;

  const cols = isMobile ? 2 : 4;
  const rows = isMobile ? 4 : 2;

  const cardW = Math.floor((vw - margin * (cols + 1)) / cols);
  const cardH = Math.floor((vh - headerH - trayH - margin * (rows + 1)) / rows);

  const idx = cardIndex++ % (cols * rows);
  const col = idx % cols;
  const row = Math.floor(idx / cols);

  const x = margin + col * (cardW + margin);
  const y = headerH + margin + row * (cardH + margin);

  return { x, y, cardW, cardH };
}

// Show a floating toast.
function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 1600);
}

// Get current variant index for an effect chip.
function getVariantIndex(effectKey) {
  const chip = tray.querySelector(`.chip[data-effect="${effectKey}"]`);
  if (!chip) return 0;
  return parseInt(chip.dataset.variantIndex || '0', 10);
}

function setVariantIndex(effectKey, idx) {
  const chip = tray.querySelector(`.chip[data-effect="${effectKey}"]`);
  if (!chip) return;
  chip.dataset.variantIndex = String(idx);
  const variants = EFFECT_VARIANTS[effectKey];
  if (variants && variants[idx]) {
    const label = chip.querySelector('.chip-label');
    if (label) label.textContent = variants[idx];
  }
}

// Cycle variant on a chip (long-press).
function cycleChipVariant(effectKey) {
  const variants = EFFECT_VARIANTS[effectKey];
  if (!variants || variants.length === 0) return;
  const chip = tray.querySelector(`.chip[data-effect="${effectKey}"]`);
  if (!chip) return;
  const current = parseInt(chip.dataset.variantIndex || '0', 10);
  const next = (current + 1) % variants.length;
  setVariantIndex(effectKey, next);
  showToast(`${EFFECT_LABELS[effectKey]}: ${variants[next]}`);
}

// Cycle variant on a spawned card.
function cycleCardVariant(card) {
  const effectKey = card.dataset.effect;
  const variants = EFFECT_VARIANTS[effectKey];
  if (!variants || variants.length === 0) return;

  const instance = card._instance;
  const currentIdx = parseInt(card.dataset.variantIndex || '0', 10);
  const nextIdx = (currentIdx + 1) % variants.length;
  const nextName = variants[nextIdx];

  card.dataset.variantIndex = String(nextIdx);

  if (instance && typeof instance.setVariant === 'function') {
    instance.setVariant(nextName);
  } else {
    // Destroy + remount with new variant.
    const ft = card._ft;
    const rect = card.getBoundingClientRect();
    closeCard(card, ft);
    // Spawn same effect with new variant after short delay.
    setTimeout(() => {
      const newCard = makeCard(effectKey, { variant: nextName, variantIndex: nextIdx });
      if (newCard && ft) {
        // Approximate position.
        ft.setTransform(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          1, 0, 0, 0
        );
      }
    }, 200);
    return;
  }

  showToast(`${EFFECT_LABELS[effectKey]}: ${nextName}`);
}

function makeCard(effectKey, opts = {}) {
  const mount = EFFECT_MOUNT[effectKey];
  if (!mount) return;

  // Cap at 4 visible effects.
  capEffects(4);

  const card = document.createElement('div');
  card.className = 'effect-card' + (WORD_EFFECTS.has(effectKey) ? ' is-word' : '');
  card.dataset.effect = effectKey;

  const canvas = document.createElement('div');
  canvas.className = 'effect-canvas';

  card.appendChild(canvas);

  const { x, y, cardW, cardH } = nextSpawnPosition();
  const initScale = 0.5 + Math.random() * 0.6;
  const initRotZ = (Math.random() - 0.5) * 60;
  const initRotX = (Math.random() - 0.5) * 30;
  const initRotY = (Math.random() - 0.5) * 30;
  card.style.left = '0px';
  card.style.top = '0px';
  card.style.width = `${cardW}px`;
  card.style.height = `${cardH}px`;
  stage.appendChild(card);

  // Determine variant.
  const variantIdx = opts.variantIndex !== undefined ? opts.variantIndex : getVariantIndex(effectKey);
  const variants = EFFECT_VARIANTS[effectKey];
  const variantName = variants ? (variants[variantIdx] || variants[0]) : undefined;
  card.dataset.variantIndex = String(variantIdx);

  // Mount effect with options.
  const mountOpts = {};
  if (variantName) mountOpts.variant = variantName;
  if (symmetry.getMode() > 0 && MIRRORABLE_EFFECTS.has(effectKey)) {
    mountOpts.symmetryMode = symmetry.getMode();
  }
  const instanceOrPromise = mount(canvas, mountOpts);
  Promise.resolve(instanceOrPromise).then(instance => {
    if (!instance) return;
    card._instance = instance;
  });

  // Free transform.
  const ft = makeFreeTransform(card, {
    onDoubleTap: () => closeCard(card, ft),
  });
  ft.setTransform(
    x + cardW / 2, y + cardH / 2,
    initScale, initRotZ, initRotX, initRotY
  );
  card._ft = ft;

  // Long-press on card for variant cycling (800ms).
  let cardLongPressTimer = null;
  let cardDownX = 0, cardDownY = 0;
  function onCardDown(e) {
    cardDownX = e.clientX;
    cardDownY = e.clientY;
    cardLongPressTimer = setTimeout(() => {
      cycleCardVariant(card);
    }, 800);
  }
  function onCardMove(e) {
    if (Math.hypot(e.clientX - cardDownX, e.clientY - cardDownY) > 20) {
      clearTimeout(cardLongPressTimer);
      cardLongPressTimer = null;
      // Cancel gesture tooltip on drag.
      if (card._gestureTooltipTimer) {
        clearTimeout(card._gestureTooltipTimer);
        card._gestureTooltipTimer = null;
      }
    }
  }
  function onCardUp() {
    clearTimeout(cardLongPressTimer);
    cardLongPressTimer = null;
  }
  card._cardLongPress = { onCardDown, onCardMove, onCardUp, onCardCancel: onCardUp };
  card.addEventListener('pointerdown', onCardDown);
  card.addEventListener('pointermove', onCardMove);
  card.addEventListener('pointerup', onCardUp);
  card.addEventListener('pointercancel', onCardUp);

  // Audio: interaction sounds (named handlers so closeCard can remove them).
  function onCardPointerDown() {
    audioEngine.playDragTone();
    audioEngine.startAmbientBed();
  }
  function onCardPointerUp() {
    audioEngine.playReleaseTone();
  }
  card._audioHandlers = { onCardPointerDown, onCardPointerUp };
  card.addEventListener('pointerdown', onCardPointerDown, { passive: true });
  card.addEventListener('pointerup', onCardPointerUp, { passive: true });

  // Save gesture.
  const saveGesture = makeSaveGesture(card, () => {
    // Return the canvas element inside the card.
    const c = card.querySelector('canvas');
    return c || null;
  }, {
    filename: `gia-effect-${effectKey}-${Date.now()}.png`,
  });
  card._saveGesture = saveGesture;

  // Track for capping.
  spawnedCards.push({ card, ft, effectKey });

  // Hide empty state prompt when first card spawns.
  if (spawnedCards.length === 1 && !isWelcomeVisible) {
    hideEmptyState();
  }

  // Mount animation.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.add('mounted');
    });
  });

  // Gesture tooltip (a5) — after mount animation rAF.
  if (!WORD_EFFECTS.has(effectKey) && !sessionStorage.getItem('gia-gesture-hint-shown')) {
    card._gestureTooltipTimer = setTimeout(() => {
      if (card._gestureTooltipTimer === null) return; // cancelled
      const tooltip = document.createElement('div');
      tooltip.className = 'gesture-tooltip';
      tooltip.textContent = 'Hold to change · Double-tap to close';
      card.appendChild(tooltip);
      sessionStorage.setItem('gia-gesture-hint-shown', '1');
      // Auto-fade after 4s.
      card._gestureFadeTimer = setTimeout(() => {
        tooltip.classList.add('fading-out');
        setTimeout(() => { tooltip.remove(); }, 400);
      }, 4000);
    }, 3000);
  }

  // AI name toast.
  const aiName = generateName(effectKey, variantIdx);
  showToast(aiName);

  // If 3D scene, fade ambient.
  if (effectKey === 'chill-3d') {
    ambient.setOpacity(0.5);
  }

  return card;
}

function closeCard(card, ft) {
  if (card.classList.contains('closing')) return;
  card.classList.add('closing');

  // Clean up save gesture.
  if (card._saveGesture) {
    card._saveGesture.destroy();
    card._saveGesture = null;
  }

  // Remove long-press listeners.
  if (card._cardLongPress) {
    card.removeEventListener('pointerdown', card._cardLongPress.onCardDown);
    card.removeEventListener('pointermove', card._cardLongPress.onCardMove);
    card.removeEventListener('pointerup', card._cardLongPress.onCardUp);
    card.removeEventListener('pointercancel', card._cardLongPress.onCardCancel);
    card._cardLongPress = null;
  }

  // Remove audio listeners.
  if (card._audioHandlers) {
    card.removeEventListener('pointerdown', card._audioHandlers.onCardPointerDown);
    card.removeEventListener('pointerup', card._audioHandlers.onCardPointerUp);
    card._audioHandlers = null;
  }

  // If 3D scene, restore ambient.
  if (card.dataset.effect === 'chill-3d') {
    ambient.setOpacity(1.0);
  }

  // Remove from tracking.
  const idx = spawnedCards.findIndex(c => c.card === card);
  if (idx >= 0) spawnedCards.splice(idx, 1);

  // Show empty state prompt when last card is closed.
  if (spawnedCards.length === 0) {
    showEmptyState();
  }

  // Clean up gesture tooltip timers.
  if (card._gestureTooltipTimer) {
    clearTimeout(card._gestureTooltipTimer);
    card._gestureTooltipTimer = null;
  }
  if (card._gestureFadeTimer) {
    clearTimeout(card._gestureFadeTimer);
    card._gestureFadeTimer = null;
  }

  setTimeout(() => {
    try { card._instance && card._instance.destroy && card._instance.destroy(); } catch {}
    ft && ft.destroy();
    card.remove();
  }, 420);
}

// ---------- Chip tray: click + long-press for variant cycling ----------

// Long-press detection on chips (600ms).
const chipLongPressTimers = new Map();

tray.addEventListener('pointerdown', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const key = chip.dataset.effect;
  if (!key) return;

  chip.classList.add('chip-tap-feedback');

  const timer = setTimeout(() => {
    if (EFFECT_VARIANTS[key]) {
      cycleChipVariant(key);
    }
    chipLongPressTimers.delete(key);
  }, 600);
  chipLongPressTimers.set(key, timer);
});

tray.addEventListener('pointerup', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const key = chip.dataset.effect;
  if (!key) return;
  clearTimeout(chipLongPressTimers.get(key));
  chipLongPressTimers.delete(key);
  chip.classList.remove('chip-tap-feedback');
});

tray.addEventListener('pointerleave', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const key = chip.dataset.effect;
  if (!key) return;
  clearTimeout(chipLongPressTimers.get(key));
  chipLongPressTimers.delete(key);
  chip.classList.remove('chip-tap-feedback');
});

tray.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const key = chip.dataset.effect;
  if (!key) return;

  // Dismiss welcome card on any chip tap before normal action.
  if (isWelcomeVisible) {
    dismissWelcomeCard();
  }

  // Handle special chips.
  if (key === 'symmetry-toggle') {
    const mode = symmetry.toggle();
    const label = chip.querySelector('.chip-label');
    if (label) label.textContent = mode === 0 ? 'Mirror' : `Mirror ${mode}`;
    chip.classList.toggle('active', mode > 0);
    return;
  }

  if (key === 'audio-mute') {
    const muted = audioEngine.toggleMute();
    const label = chip.querySelector('.chip-label');
    if (label) label.textContent = muted ? 'Muted' : 'Audio';
    chip.classList.toggle('active', muted);
    return;
  }

  // Spawn effect card.
  makeCard(key);
});

// ---------- Hide tray scroll shadow on overflow ----------

function checkTrayOverflow() {
  if (!tray) return;
  tray.style.overflowX = tray.scrollWidth > tray.clientWidth ? 'auto' : 'hidden';
}
window.addEventListener('resize', checkTrayOverflow);
window.setTimeout(checkTrayOverflow, 200);

// ---------- Tab visibility ----------

document.addEventListener('visibilitychange', () => {
  // Each effect's RAF pauses itself; nothing to do here globally.
});

// ---------- Done. The room is alive. ----------

if (isDocumentVisible()) {
  // No-op — everything is already running.
}

// ---------- Usability overhaul: init ----------

// Initialize welcome card.
initWelcomeCard();

// Show empty state prompt if welcome is dismissed and no cards.
if (!isWelcomeVisible) {
  showEmptyState();
}

// First chip pulse: add pulsing glow to Goo chip.
const firstChip = document.querySelector('.chip[data-effect="fluid-goo"]');
if (firstChip) firstChip.classList.add('chip-first-pulse');

// Remove first-chip pulse on any chip click.
tray.addEventListener('click', () => {
  if (firstChip) firstChip.classList.remove('chip-first-pulse');
});
