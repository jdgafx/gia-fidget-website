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
import { makeFreeTransform } from './lib/free-transform.js';
import { initTrailEngine }   from './lib/trails.js';

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

// Named variants per effect
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

// Color mappings for particle trails
const EFFECT_TRAIL_COLORS = {
  'fluid-goo': 'rgba(138, 213, 255, 0.85)',
  'soap-bubble': 'rgba(177, 224, 255, 0.85)',
  'petal-drift': 'rgba(251, 194, 235, 0.85)',
  'aurora-ribbon': 'rgba(194, 233, 251, 0.85)',
  'galaxy': 'rgba(161, 196, 253, 0.85)',
  'glow-ripple': 'rgba(242, 226, 254, 0.85)',
  'sand-pour': 'rgba(255, 241, 235, 0.85)',
  'chill-3d': 'rgba(195, 207, 226, 0.85)',
  'love-note': 'rgba(246, 211, 101, 0.85)',
  'never-give-up': 'rgba(253, 160, 133, 0.85)'
};

// State
const activeArtifacts = new Map(); // id -> { artifact, partners, destroyers }
let artifactIdCounter = 0;
const currentVariants = {}; // effectKey -> index

// Initialize variants
Object.keys(EFFECT_MOUNTS).forEach((key) => {
  currentVariants[key] = 0;
});

// Setup Ambient WebGL Background
const bgCanvas = document.getElementById('ambient-canvas');
mountBackground(bgCanvas);

// Setup Trail Engine overlay
const trailsCanvas = document.getElementById('trails-canvas');
const trails = initTrailEngine(trailsCanvas);

// Setup Audio Engine
const audioEngine = new AudioEngine();
window.audioEngineInstance = audioEngine;

// Autoplay context unlock
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
    document.querySelectorAll('.effect-artifact').forEach((art) => {
      art.classList.add('passive-mode-active');
    });
    audioEngine.swellAmbient();
  },
  onActive: () => {
    document.querySelectorAll('.effect-artifact').forEach((art) => {
      art.classList.remove('passive-mode-active');
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
  audioEngine.playInteractionTone();
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

// Word effects key set
const WORD_EFFECTS = new Set(['love-note', 'never-give-up']);

// Spawns a borderless companion artifact
function spawnArtifact(effectKey, startX, startY, isPartner = false, mirrorClass = '') {
  const artifactId = artifactIdCounter++;
  const artifact = document.createElement('div');
  artifact.className = 'effect-artifact';
  if (mirrorClass) {
    artifact.classList.add(mirrorClass);
  }
  if (WORD_EFFECTS.has(effectKey)) {
    artifact.classList.add('is-word');
  }

  // Dimension sizing
  const size = WORD_EFFECTS.has(effectKey) ? 170 : 150;
  artifact.style.width = `${size}px`;
  artifact.style.height = WORD_EFFECTS.has(effectKey) ? '100px' : `${size}px`;

  // Random position on playground
  const x = startX !== undefined ? startX : Math.random() * (window.innerWidth - size - 40) + size / 2 + 20;
  const y = startY !== undefined ? startY : Math.random() * (window.innerHeight - size - 160) + size / 2 + 85;

  artifact.style.left = `${x - size / 2}px`;
  artifact.style.top = `${y - (WORD_EFFECTS.has(effectKey) ? 50 : size / 2)}px`;

  // Mount effect inside artifact container
  const mountFunc = EFFECT_MOUNTS[effectKey];
  const variantIndex = currentVariants[effectKey];
  const variantName = VARIANTS[effectKey][variantIndex];
  
  let effectInstance = null;
  if (mountFunc) {
    effectInstance = mountFunc(artifact, { variant: variantName });
  }

  document.getElementById('playground').appendChild(artifact);

  // Trigger entry fade-in
  requestAnimationFrame(() => {
    artifact.classList.add('mounted');
  });

  // Physics, Dragging, Gestures & Trails
  let transformInstance = null;
  let saveInstance = null;

  const trailColor = EFFECT_TRAIL_COLORS[effectKey] || 'rgba(255, 255, 255, 0.8)';

  if (!isPartner) {
    transformInstance = makeFreeTransform(artifact, {
      onMove: (cx, cy, speed) => {
        // Spawn trail sparkles
        const count = Math.min(6, Math.max(1, Math.floor(speed * 0.4)));
        for (let i = 0; i < count; i++) {
          trails.spawn(cx + (Math.random() - 0.5) * 15, cy + (Math.random() - 0.5) * 15, trailColor);
        }

        // Sync positions of symmetrical partners
        const artifactInfo = activeArtifacts.get(artifactId);
        if (artifactInfo && artifactInfo.partners) {
          syncPartners(cx, cy, size, WORD_EFFECTS.has(effectKey) ? 100 : size, artifactInfo.partners);
        }
      },
      onDoubleTap: () => {
        closeArtifact(artifactId);
      },
      onBounce: () => {
        // Surge of sparkles on bounce
        for (let i = 0; i < 20; i++) {
          const state = transformInstance.getState();
          trails.spawn(state.x + (Math.random() - 0.5) * 40, state.y + (Math.random() - 0.5) * 40, trailColor);
        }
      }
    });

    // Variant cycling on long-press
    let pressTimer = null;
    let lpStartX = 0, lpStartY = 0;
    
    artifact.addEventListener('pointerdown', (e) => {
      lpStartX = e.clientX;
      lpStartY = e.clientY;
      pressTimer = setTimeout(() => {
        cycleArtifactVariant(artifactId, effectKey, artifact);
        pressTimer = null;
      }, 850);
    });

    artifact.addEventListener('pointermove', (e) => {
      if (pressTimer && Math.hypot(e.clientX - lpStartX, e.clientY - lpStartY) > 15) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    artifact.addEventListener('pointerup', () => clearTimeout(pressTimer));
    artifact.addEventListener('pointercancel', () => clearTimeout(pressTimer));

    // Save PNG gesture
    saveInstance = makeSaveGesture(artifact, () => artifact.querySelector('canvas'), {
      filename: `gia-${effectKey}-${Date.now()}.png`
    });
  }

  const destroyers = [
    () => {
      if (effectInstance && effectInstance.destroy) effectInstance.destroy();
      if (transformInstance) transformInstance.destroy();
      if (saveInstance) saveInstance.destroy();
      artifact.remove();
    }
  ];

  return { artifactId, artifact, destroyers, w: size, h: WORD_EFFECTS.has(effectKey) ? 100 : size, transform: transformInstance };
}

// Sync partners positions based on symmetry
function syncPartners(masterX, masterY, w, h, partners) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  partners.forEach((partner) => {
    let px = masterX;
    let py = masterY;

    if (partner.mirrorClass === 'mirrored-2') {
      px = vw - masterX;
    } else if (partner.mirrorClass === 'mirrored-4-y') {
      py = vh - masterY;
    } else if (partner.mirrorClass === 'mirrored-4-xy') {
      px = vw - masterX;
      py = vh - masterY;
    }

    // Apply partner transforms
    partner.card.style.left = `${px - w / 2}px`;
    partner.card.style.top = `${py - h / 2}px`;
    
    // Spawn trails at partner positions too!
    const trailColor = EFFECT_TRAIL_COLORS[partner.card.dataset.effect] || 'rgba(255, 255, 255, 0.8)';
    trails.spawn(px + (Math.random() - 0.5) * 15, py + (Math.random() - 0.5) * 15, trailColor);
  });
}

// Spawn companions with mirroring symmetry
function spawnCompanion(effectKey) {
  audioEngine.playInteractionTone();

  const mode = symmetry.getMode();
  const masterInfo = spawnArtifact(effectKey);
  const partners = [];

  const w = masterInfo.w;
  const h = masterInfo.h;
  const masterX = masterInfo.transform.getState().x;
  const masterY = masterInfo.transform.getState().y;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (mode === 2) {
    const px = vw - masterX;
    const partner = spawnArtifact(effectKey, px, masterY, true, 'mirrored-2');
    partner.artifact.dataset.effect = effectKey;
    partners.push({ card: partner.artifact, mirrorClass: 'mirrored-2', destroyers: partner.destroyers });
  } else if (mode === 4) {
    const px = vw - masterX;
    const py = vh - masterY;

    const p1 = spawnArtifact(effectKey, px, masterY, true, 'mirrored-2');
    p1.artifact.dataset.effect = effectKey;
    const p2 = spawnArtifact(effectKey, masterX, py, true, 'mirrored-4-y');
    p2.artifact.dataset.effect = effectKey;
    const p3 = spawnArtifact(effectKey, px, py, true, 'mirrored-4-xy');
    p3.artifact.dataset.effect = effectKey;

    partners.push(
      { card: p1.artifact, mirrorClass: 'mirrored-2', destroyers: p1.destroyers },
      { card: p2.artifact, mirrorClass: 'mirrored-4-y', destroyers: p2.destroyers },
      { card: p3.artifact, mirrorClass: 'mirrored-4-xy', destroyers: p3.destroyers }
    );
  }

  activeArtifacts.set(masterInfo.artifactId, {
    artifact: masterInfo.artifact,
    partners,
    destroyers: masterInfo.destroyers
  });

  // Toast procedural name
  const variantIndex = currentVariants[effectKey];
  const name = generateName(effectKey, variantIndex);
  showToast(name);
}

// Cycles variant for a spawned artifact on long press
function cycleArtifactVariant(artifactId, effectKey, artifact) {
  const list = VARIANTS[effectKey];
  const nextIndex = (currentVariants[effectKey] + 1) % list.length;
  currentVariants[effectKey] = nextIndex;

  const variantName = list[nextIndex];
  audioEngine.playInteractionTone();

  // Recreate effect with new variant
  recreateEffect(artifact, effectKey, variantName);

  // Sync to partners
  const info = activeArtifacts.get(artifactId);
  if (info && info.partners) {
    info.partners.forEach((partner) => {
      recreateEffect(partner.card, effectKey, variantName);
    });
  }

  const name = generateName(effectKey, nextIndex);
  showToast(name);
}

function recreateEffect(element, effectKey, variantName) {
  element.innerHTML = '';
  const mountFunc = EFFECT_MOUNTS[effectKey];
  if (mountFunc) {
    mountFunc(element, { variant: variantName });
  }
}

// Closes an artifact and its partners
function closeArtifact(artifactId) {
  const info = activeArtifacts.get(artifactId);
  if (!info) return;

  audioEngine.playInteractionTone();

  // Fade out closing elements
  info.artifact.classList.add('closing');
  info.partners.forEach(p => p.card.classList.add('closing'));

  setTimeout(() => {
    info.destroyers.forEach(d => d());
    info.partners.forEach(p => p.destroyers.forEach(d => d()));
    activeArtifacts.delete(artifactId);
  }, 500);
}

// Setup chip spawning
document.querySelectorAll('.chip').forEach((chip) => {
  const effectKey = chip.getAttribute('data-effect');

  chip.addEventListener('click', () => {
    spawnCompanion(effectKey);
  });

  // Cycle variants on right-click
  chip.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const list = VARIANTS[effectKey];
    const nextIndex = (currentVariants[effectKey] + 1) % list.length;
    currentVariants[effectKey] = nextIndex;
    
    audioEngine.playInteractionTone();
    const name = generateName(effectKey, nextIndex);
    showToast(`Active: ${name}`);
  });
});

// Pre-populate viewport with 3 borderless items on load
window.addEventListener('DOMContentLoaded', () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  setTimeout(() => {
    spawnCompanion('soap-bubble');
    spawnCompanion('petal-drift');
    spawnCompanion('love-note');
  }, 600);
});
