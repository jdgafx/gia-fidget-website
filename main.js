// main.js — Fidget Playground Bootstrap & Controller

import { mountBackground } from './ambient/background.js';
import { mountFluidGoo }     from './effects/fluid-goo.js';
import { mountSoapBubble }   from './effects/soap-bubble.js';
import { mountPetalDrift }   from './effects/petal-drift.js';
import { mountAuroraRibbon } from './effects/aurora-ribbon.js';
import { mountGalaxy }       from './effects/galaxy.js';
import { mountGlowRipple }   from './effects/glow-ripple.js';
import { mountSandPour }     from './effects/sand-pour.js';
import { mountChill3D }      from './effects/chill-3d.js';
import { mountLoveNote }     from './effects/love-note.js';
import { mountNeverGiveUp }  from './effects/never-give-up.js';

import { AudioEngine }       from './audio/engine.js';
import { createSymmetryController } from './lib/symmetry-controller.js';
import { makeSaveGesture }   from './lib/save-gesture.js';
import { createPassiveMode } from './lib/passive-mode.js';
import { generateName }      from './lib/ai-names.js';
import { makeDraggable }     from './lib/draggable.js';

// Effects map
const EFFECT_MOUNTS = {
  'fluid-goo': mountFluidGoo,
  'soap-bubble': mountSoapBubble,
  'petal-drift': mountPetalDrift,
  'aurora-ribbon': mountAuroraRibbon,
  'galaxy': mountGalaxy,
  'glow-ripple': mountGlowRipple,
  'sand-pour': mountSandPour,
  'chill-3d': mountChill3D,
  'love-note': mountLoveNote,
  'never-give-up': mountNeverGiveUp
};

// Named variants per effect (4 variants each)
const VARIANTS = {
  'fluid-goo': ['Classic Goo', 'Fast Goo', 'Heavy Goo', 'Swirling Goo'],
  'soap-bubble': ['Soap Bubble', 'Giant Bubble', 'Tiny Bubbles', 'Golden Bubble'],
  'petal-drift': ['Cherry Petals', 'Lotus Petals', 'Autumn Leaves', 'Snow Drifts'],
  'aurora-ribbon': ['Borealis', 'Green Wave', 'Neon Glow', 'Dream Wave'],
  'galaxy': ['Spiral Galaxy', 'Nebula Cluster', 'Void Vortex', 'Cosmic Dust'],
  'glow-ripple': ['Rainbow Ripples', 'Golden Ripples', 'Echo Waves', 'Calm Waters'],
  'sand-pour': ['Desert Sand', 'Ocean Dunes', 'Neon Sand', 'Volcanic Ash'],
  'chill-3d': ['Summer Island', 'Floating Rock', 'Autumn Peak', 'Twilight Peak'],
  'love-note': ['Love & Light', 'Pure Heart', 'Warm Vibe', 'Sweet Dream'],
  'never-give-up': ['Never Give Up', 'Stay Strong', 'Brave Heart', 'Bright Future']
};

// State
const activeCards = new Map(); // id -> { card, partners, destroyers }
let cardIdCounter = 0;
const currentVariants = {}; // effectKey -> index

// Initialize variants
Object.keys(EFFECT_MOUNTS).forEach((key) => {
  currentVariants[key] = 0;
});

// Setup Ambient Background
const bgCanvas = document.getElementById('ambient-canvas');
mountBackground(bgCanvas);

// Setup Audio Engine
const audioEngine = new AudioEngine();
window.audioEngineInstance = audioEngine; // Expose globally for effects to play tones

// Autoplay Context unlock
function unlockAudio() {
  audioEngine.init();
  window.removeEventListener('pointerdown', unlockAudio);
}
window.addEventListener('pointerdown', unlockAudio);

// Setup Controllers
const symmetry = createSymmetryController();
const passive = createPassiveMode({
  delay: 5000,
  onPassive: () => {
    document.querySelectorAll('.effect-card').forEach((card) => {
      card.classList.add('passive-mode-active');
    });
    audioEngine.swellAmbient();
  },
  onActive: () => {
    document.querySelectorAll('.effect-card').forEach((card) => {
      card.classList.remove('passive-mode-active');
    });
    audioEngine.normalizeAmbient();
  }
});

// Setup UI Buttons
const muteBtn = document.getElementById('mute-btn');
const soundOnIcon = muteBtn.querySelector('.sound-on');
const soundOffIcon = muteBtn.querySelector('.sound-off');

muteBtn.addEventListener('click', () => {
  const isMuted = audioEngine.toggleMute();
  soundOnIcon.classList.toggle('hidden', isMuted);
  soundOffIcon.classList.toggle('hidden', !isMuted);
});

const symmetryBtn = document.getElementById('symmetry-btn');
const symmetryBadge = document.getElementById('symmetry-badge');

symmetryBtn.addEventListener('click', () => {
  const mode = symmetry.toggle();
  symmetryBadge.textContent = mode === 0 ? 'Off' : `${mode}`;
  showToast(`Symmetry: ${mode === 0 ? 'Off' : mode + '-way'}`);
  
  if (audioEngine) {
    audioEngine.playInteractionTone();
  }
});

// Toast Manager
const toastContainer = document.getElementById('toast-container');
function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 1800);
}

// Spawns a card
function spawnCard(effectKey, startX, startY, isPartner = false, mirrorClass = '') {
  const cardId = cardIdCounter++;
  const card = document.createElement('div');
  card.className = 'effect-card';
  if (mirrorClass) {
    card.classList.add(mirrorClass);
  }
  
  // Set card size
  const cardW = 200;
  const cardH = 235;
  
  // Set position
  const x = startX !== undefined ? startX : Math.random() * (window.innerWidth - cardW - 40) + 20;
  const y = startY !== undefined ? startY : Math.random() * (window.innerHeight - cardH - 160) + 85;
  
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
  
  // Header / Title bar
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const title = document.createElement('span');
  title.className = 'card-title';
  const variantIndex = currentVariants[effectKey];
  const variantName = VARIANTS[effectKey][variantIndex];
  title.textContent = variantName;
  header.appendChild(title);
  
  // Close Button
  if (!isPartner) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'card-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close Card');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCard(cardId);
    });
    header.appendChild(closeBtn);
  } else {
    // Spacer for symmetrical cards
    const spacer = document.createElement('span');
    spacer.style.width = '16px';
    header.appendChild(spacer);
  }
  
  card.appendChild(header);
  
  // Content stage
  const content = document.createElement('div');
  content.className = 'card-content';
  card.appendChild(content);
  
  // Mount effect
  const mountFunc = EFFECT_MOUNTS[effectKey];
  let effectInstance = null;
  if (mountFunc) {
    effectInstance = mountFunc(content, { variant: variantName });
  }
  
  document.getElementById('playground').appendChild(card);
  
  // Trigger entry animation
  requestAnimationFrame(() => {
    card.classList.add('mounted');
  });

  // Dragging and Gestures (Master card only)
  let dragInstance = null;
  let saveInstance = null;
  
  if (!isPartner) {
    dragInstance = makeDraggable(
      card, 
      header,
      () => {
        audioEngine.playInteractionTone();
      },
      (nx, ny) => {
        // Sync position of symmetrical partner cards
        const cardInfo = activeCards.get(cardId);
        if (cardInfo && cardInfo.partners) {
          syncPartners(nx, ny, cardW, cardH, cardInfo.partners);
        }
      }
    );
    
    // Save PNG gesture
    saveInstance = makeSaveGesture(card, () => content.querySelector('canvas'), {
      filename: `gia-${effectKey}-${Date.now()}.png`
    });
  }

  // Store destroy handlers
  const destroyers = [
    () => {
      if (effectInstance && effectInstance.destroy) effectInstance.destroy();
      if (dragInstance) dragInstance.destroy();
      if (saveInstance) saveInstance.destroy();
      card.remove();
    }
  ];

  return { cardId, card, destroyers, w: cardW, h: cardH };
}

// Sync partners positions based on symmetry
function syncPartners(masterX, masterY, w, h, partners) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  partners.forEach((partner) => {
    let px = masterX;
    let py = masterY;
    
    if (partner.mirrorClass === 'mirrored-2') {
      px = vw - w - masterX;
    } else if (partner.mirrorClass === 'mirrored-4-y') {
      py = vh - h - masterY;
    } else if (partner.mirrorClass === 'mirrored-4-xy') {
      px = vw - w - masterX;
      py = vh - h - masterY;
    }
    
    partner.card.style.left = `${px}px`;
    partner.card.style.top = `${py}px`;
  });
}

// Spawns with current symmetry mode
function spawnCompanion(effectKey) {
  audioEngine.playInteractionTone();
  
  const mode = symmetry.getMode();
  const masterInfo = spawnCard(effectKey);
  const partners = [];
  
  const w = masterInfo.w;
  const h = masterInfo.h;
  const masterX = parseFloat(masterInfo.card.style.left);
  const masterY = parseFloat(masterInfo.card.style.top);
  
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  if (mode === 2) {
    const px = vw - w - masterX;
    const partner = spawnCard(effectKey, px, masterY, true, 'mirrored-2');
    partners.push({ card: partner.card, mirrorClass: 'mirrored-2', destroyers: partner.destroyers });
  } else if (mode === 4) {
    // Horizontal partner
    const px = vw - w - masterX;
    const p1 = spawnCard(effectKey, px, masterY, true, 'mirrored-2');
    partners.push({ card: p1.card, mirrorClass: 'mirrored-2', destroyers: p1.destroyers });
    
    // Vertical partner
    const py = vh - h - masterY;
    const p2 = spawnCard(effectKey, masterX, py, true, 'mirrored-4-y');
    partners.push({ card: p2.card, mirrorClass: 'mirrored-4-y', destroyers: p2.destroyers });
    
    // Diagonal partner
    const p3 = spawnCard(effectKey, px, py, true, 'mirrored-4-xy');
    partners.push({ card: p3.card, mirrorClass: 'mirrored-4-xy', destroyers: p3.destroyers });
  } else if (mode === 8) {
    // 8-way mirroring
    const px = vw - w - masterX;
    const py = vh - h - masterY;
    
    // Symmetrical partners
    const p1 = spawnCard(effectKey, px, masterY, true, 'mirrored-2');
    const p2 = spawnCard(effectKey, masterX, py, true, 'mirrored-4-y');
    const p3 = spawnCard(effectKey, px, py, true, 'mirrored-4-xy');
    
    partners.push(
      { card: p1.card, mirrorClass: 'mirrored-2', destroyers: p1.destroyers },
      { card: p2.card, mirrorClass: 'mirrored-4-y', destroyers: p2.destroyers },
      { card: p3.card, mirrorClass: 'mirrored-4-xy', destroyers: p3.destroyers }
    );
  }
  
  activeCards.set(masterInfo.cardId, {
    card: masterInfo.card,
    partners,
    destroyers: masterInfo.destroyers
  });
  
  // Show name toast
  const variantIndex = currentVariants[effectKey];
  const name = generateName(effectKey, variantIndex);
  showToast(name);
}

// Closes a card and all its symmetrical partners
function closeCard(cardId) {
  const cardInfo = activeCards.get(cardId);
  if (!cardInfo) return;
  
  audioEngine.playInteractionTone();
  
  // Fade master card
  cardInfo.card.classList.add('closing');
  
  // Fade partners
  cardInfo.partners.forEach((partner) => {
    partner.card.classList.add('closing');
  });
  
  // Destroy after animation finishes
  setTimeout(() => {
    cardInfo.destroyers.forEach(d => d());
    cardInfo.partners.forEach((partner) => {
      partner.destroyers.forEach(d => d());
    });
    activeCards.delete(cardId);
  }, 500);
}

// Chip tray spawning
document.querySelectorAll('.chip').forEach((chip) => {
  const effectKey = chip.getAttribute('data-effect');
  
  // Tap to spawn
  chip.addEventListener('click', () => {
    spawnCompanion(effectKey);
  });
  
  // Long-press variant cycling detection
  let pressTimer = null;
  
  chip.addEventListener('pointerdown', (e) => {
    pressTimer = setTimeout(() => {
      cycleVariant(effectKey, chip);
      pressTimer = null;
    }, 850);
  });
  
  chip.addEventListener('pointerup', () => {
    clearTimeout(pressTimer);
  });
  
  chip.addEventListener('pointercancel', () => {
    clearTimeout(pressTimer);
  });
  
  // Support desktop right-click to cycle variant instantly
  chip.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    cycleVariant(effectKey, chip);
  });
});

function cycleVariant(effectKey, chip) {
  const list = VARIANTS[effectKey];
  const nextIndex = (currentVariants[effectKey] + 1) % list.length;
  currentVariants[effectKey] = nextIndex;
  
  const variantName = list[nextIndex];
  audioEngine.playInteractionTone();
  
  const name = generateName(effectKey, nextIndex);
  showToast(`Active: ${name}`);
}

// Pre-populate playground with 3 initial calming cards
window.addEventListener('DOMContentLoaded', () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  // Center coordinates roughly
  const cardW = 200;
  const cardH = 235;
  
  setTimeout(() => {
    spawnCard('soap-bubble', vw * 0.15, vh * 0.25);
    spawnCard('petal-drift', vw * 0.55, vh * 0.18);
    spawnCard('love-note', vw * 0.35, vh * 0.5);
  }, 500);
});
