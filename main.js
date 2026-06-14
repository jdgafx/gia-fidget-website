// main.js — Bootstrap for Gia's fidget playground.
// 1. Mounts ambient background + custom cursor.
// 2. Radial menu spawns draggable mirrored effect entities.
// 3. Integrates Audio Engine, Symmetry Controller, Save Gesture, and Passive Mode.

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
import { AudioEngine }       from './audio/engine.js';
import { createSymmetryController } from './lib/symmetry-controller.js';
import { makeSaveGesture }   from './lib/save-gesture.js';
import { createPassiveMode } from './lib/passive-mode.js';
import { generateName }      from './lib/ai-names.js';

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

const EFFECT_VARIANTS = {
  'fluid-goo':     ['Classic', 'Swirl', 'Chaos', 'Slow'],
  'soap-bubble':   ['Classic', 'Iridescent', 'Clear', 'Glass'],
  'petal-drift':   ['Rose', 'Lavender', 'Mint', 'Gold', 'Rainbow'],
  'aurora-ribbon': ['Classic', 'Dreamy', 'Vivid', 'Slow'],
  'galaxy':        ['Spiral', 'Cluster', 'Nebula', 'Void'],
  'glow-ripple':   ['Calm', 'Rainbow', 'Soft', 'Pulse'],
  'love-note':     ['Classic', 'Playful', 'Tender'],
  'never-give-up': ['Classic', 'Bold', 'Gentle'],
  'sand-pour':     ['Warm', 'Pastel', 'Neon', 'Earth', 'Ocean'],
  'chill-3d':      ['Meadow', 'Sunset', 'Twilight', 'Ocean', 'Lavender'],
};

const WORD_EFFECTS = new Set(['love-note', 'never-give-up']);
const MIRRORABLE_EFFECTS = new Set([
  'fluid-goo',
  'soap-bubble',
  'petal-drift',
  'aurora-ribbon',
  'galaxy',
  'glow-ripple',
  'sand-pour'
]);

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

// ---------- Controllers & Audio ----------

const audioEngine = new AudioEngine();
const symmetry = createSymmetryController();
const activeGroups = [];

// Autoplay Web Audio unlock
function initAudioOnFirstGesture() {
  audioEngine.startAmbientBed();
  window.removeEventListener('pointerdown', initAudioOnFirstGesture);
  window.removeEventListener('keydown', initAudioOnFirstGesture);
}
window.addEventListener('pointerdown', initAudioOnFirstGesture, { once: true });
window.addEventListener('keydown', initAudioOnFirstGesture, { once: true });

// ---------- Empty State ----------

let effectCount = 0;
const stage = document.getElementById('effects-stage');
const emptyState = document.getElementById('empty-state');

function updateEmptyState() {
  if (emptyState) {
    emptyState.classList.toggle('hidden', effectCount > 0);
  }
}

// ---------- Toast Notification ----------

function showToast(text) {
  const existing = document.querySelectorAll('.toast');
  existing.forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 1600);
}

// ---------- Symmetry Sync ----------

function syncSymmetryGroup(masterEntity, ftState) {
  const group = activeGroups.find(g => g.master === masterEntity);
  if (!group) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  group.partners.forEach((partner, index) => {
    let px = ftState.x;
    let py = ftState.y;
    let rZ = ftState.rotZ;
    let rY = ftState.rotY;
    let rX = ftState.rotX;

    if (group.mode === 2) {
      // Horizontal mirroring
      px = vw - ftState.x;
      rZ = -ftState.rotZ;
      rY = -ftState.rotY;
    } else if (group.mode === 4) {
      // 4 quadrants mirroring
      if (index === 0) {
        px = vw - ftState.x;
        rZ = -ftState.rotZ;
        rY = -ftState.rotY;
      } else if (index === 1) {
        py = vh - ftState.y;
        rZ = -ftState.rotZ;
        rX = -ftState.rotX;
      } else if (index === 2) {
        px = vw - ftState.x;
        py = vh - ftState.y;
        rZ = ftState.rotZ;
        rX = -ftState.rotX;
        rY = -ftState.rotY;
      }
    } else if (group.mode === 8) {
      // 8 quadrants mirroring
      const centerX = vw / 2;
      const centerY = vh / 2;
      const dx = ftState.x - centerX;
      const dy = ftState.y - centerY;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      const sectorAngle = angle + ((index + 1) * Math.PI / 4);
      px = centerX + Math.cos(sectorAngle) * dist;
      py = centerY + Math.sin(sectorAngle) * dist;
      rZ = ftState.rotZ + (index + 1) * 45;
    }

    if (partner._ft) {
      partner._ft.setTransform(px, py, ftState.scale, rZ, rX, rY);
    }
  });
}

// ---------- Variant Cycling ----------

function cycleCardVariant(entity) {
  const effectKey = entity.dataset.effect;
  const variants = EFFECT_VARIANTS[effectKey];
  if (!variants) return;

  let idx = parseInt(entity.dataset.variantIndex || '0', 10);
  idx = (idx + 1) % variants.length;
  entity.dataset.variantIndex = String(idx);

  const variantName = variants[idx];

  // Re-mount effect
  recreateEffect(entity, effectKey, variantName);

  // Play sound chime
  audioEngine.playNote(523.25, 0.25); // C5

  // AI name toast
  const aiName = generateName(effectKey, idx);
  showToast(aiName);

  // Sync to symmetry partners
  const group = activeGroups.find(g => g.master === entity);
  if (group) {
    group.partners.forEach(partner => {
      partner.dataset.variantIndex = String(idx);
      recreateEffect(partner, effectKey, variantName);
    });
  }
}

function recreateEffect(card, effectKey, variantName) {
  if (card._instance && card._instance.destroy) {
    try { card._instance.destroy(); } catch {}
  }
  card._instance = null;
  card.innerHTML = '';

  const mount = EFFECT_MOUNT[effectKey];
  if (mount) {
    const instanceOrPromise = mount(card, { variant: variantName });
    Promise.resolve(instanceOrPromise).then(instance => {
      if (instance) card._instance = instance;
    });
  }
}

// ---------- Card Creation helper ----------

function createCardElement(effectKey, size, cx, cy, initRot, variantIdx, isPartner = false) {
  const entity = document.createElement('div');
  entity.className = 'effect-entity' + (WORD_EFFECTS.has(effectKey) ? ' is-word' : '');
  if (isPartner) {
    entity.classList.add('is-partner');
    entity.style.pointerEvents = 'none';
  }
  entity.style.width = `${size}px`;
  entity.style.height = `${size}px`;
  entity.style.left = '0px';
  entity.style.top = '0px';

  entity.dataset.effect = effectKey;
  entity.dataset.variantIndex = String(variantIdx);

  const variants = EFFECT_VARIANTS[effectKey];
  const variantName = variants ? variants[variantIdx] : undefined;

  // Mount effect
  const mount = EFFECT_MOUNT[effectKey];
  if (mount) {
    const instanceOrPromise = mount(entity, { variant: variantName });
    Promise.resolve(instanceOrPromise).then(instance => {
      if (instance) entity._instance = instance;
    });
  }

  if (isPartner) {
    const ft = makeFreeTransform(entity);
    ft.setTransform(cx, cy, 1, initRot, 0, 0);
    entity._ft = ft;
    stage.appendChild(entity);

    entity.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        entity.style.transition = 'opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
        entity.style.opacity = '1';
      });
    });

    effectCount++;
    updateEmptyState();
    return entity;
  }

  // Master card pointer events
  let isDragging = false;
  entity.addEventListener('pointerdown', () => {
    isDragging = true;
    entity.classList.add('dragging');
    audioEngine.playDragTone();
    audioEngine.startAmbientBed();
  });
  entity.addEventListener('pointerup', () => {
    isDragging = false;
    entity.classList.remove('dragging');
    audioEngine.playReleaseTone();
  });
  entity.addEventListener('pointercancel', () => {
    isDragging = false;
    entity.classList.remove('dragging');
    audioEngine.playReleaseTone();
  });

  // Word effects: tap for explosion
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
        createExplosion(entity, size / 2, size / 2, preset, 1.25);
        audioEngine.playNote(783.99, 0.35); // G5 sparkles
      }
    });
  }

  // Free transform
  const ft = makeFreeTransform(entity, {
    onTransform: (state) => {
      syncSymmetryGroup(entity, state);
    },
    onDoubleTap: () => explodeAndRemove(entity, ft),
    onExplosion: (speed) => {
      createExplosion(entity, size / 2, size / 2, 'confetti', Math.min(speed / 8, 3));
      audioEngine.playNote(880, 0.45); // A5 sparkle
      
      const group = activeGroups.find(g => g.master === entity);
      if (group) {
        group.partners.forEach(partner => {
          createExplosion(partner, size / 2, size / 2, 'confetti', Math.min(speed / 8, 3));
        });
      }
    },
    onBounce: () => {
      applyBounceFeedback(entity);
      audioEngine.playNote(220, 0.18, 'triangle'); // G3 low bounce
      
      const group = activeGroups.find(g => g.master === entity);
      if (group) {
        group.partners.forEach(partner => {
          applyBounceFeedback(partner);
        });
      }
    },
  });

  ft.setTransform(cx, cy, 1, initRot, 0, 0);
  entity._ft = ft;

  // Variant long press detection
  let longPressTimer = null;
  let lpStartX = 0, lpStartY = 0;
  entity.addEventListener('pointerdown', (e) => {
    lpStartX = e.clientX;
    lpStartY = e.clientY;
    longPressTimer = setTimeout(() => {
      cycleCardVariant(entity);
      longPressTimer = null;
    }, 800);
  });
  entity.addEventListener('pointermove', (e) => {
    if (longPressTimer && Math.hypot(e.clientX - lpStartX, e.clientY - lpStartY) > 15) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });
  entity.addEventListener('pointerup', () => {
    clearTimeout(longPressTimer);
  });
  entity.addEventListener('pointercancel', () => {
    clearTimeout(longPressTimer);
  });

  // Save gesture
  const saveGesture = makeSaveGesture(entity, () => {
    const c = entity.querySelector('canvas');
    return c || null;
  }, {
    filename: `gia-effect-${effectKey}-${Date.now()}.png`,
  });
  entity._saveGesture = saveGesture;

  stage.appendChild(entity);

  entity.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      entity.style.transition = 'opacity 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      entity.style.opacity = '1';
    });
  });

  effectCount++;
  updateEmptyState();

  const aiName = generateName(effectKey, variantIdx);
  showToast(aiName);

  return entity;
}

function applyBounceFeedback(el) {
  el.style.filter = 'drop-shadow(0 0 35px rgba(167, 139, 250, 0.8))';
  setTimeout(() => { el.style.filter = ''; }, 320);
}

// ---------- Spawn effect handler ----------

function spawnEffect(effectKey, variantIdx = 0, customX = null, customY = null) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = Math.min(280, Math.min(vw, vh) * 0.5);

  const cx = customX !== null ? customX : (size / 2 + Math.random() * (vw - size));
  const cy = customY !== null ? customY : (size / 2 + Math.random() * (vh - size));
  const initRot = (Math.random() - 0.5) * 40;

  const mode = symmetry.getMode();
  const isMirrorable = mode > 0 && MIRRORABLE_EFFECTS.has(effectKey);

  const master = createCardElement(effectKey, size, cx, cy, initRot, variantIdx);
  const group = { master, partners: [], mode };

  if (isMirrorable) {
    const S = mode;
    for (let i = 0; i < S - 1; i++) {
      let px = cx;
      let py = cy;
      let pr = initRot;

      if (mode === 2) {
        px = vw - cx;
        pr = -initRot;
      } else if (mode === 4) {
        if (i === 0) {
          px = vw - cx;
          pr = -initRot;
        } else if (i === 1) {
          py = vh - cy;
          pr = -initRot;
        } else if (i === 2) {
          px = vw - cx;
          py = vh - cy;
          pr = initRot;
        }
      } else if (mode === 8) {
        const centerX = vw / 2;
        const centerY = vh / 2;
        const dx = cx - centerX;
        const dy = cy - centerY;
        const angle = Math.atan2(dy, dx);
        const dist = Math.hypot(dx, dy);

        const sectorAngle = angle + ((i + 1) * Math.PI / 4);
        px = centerX + Math.cos(sectorAngle) * dist;
        py = centerY + Math.sin(sectorAngle) * dist;
        pr = initRot + (i + 1) * 45;
      }

      const partner = createCardElement(effectKey, size, px, py, pr, variantIdx, true);
      group.partners.push(partner);
    }
    activeGroups.push(group);
  }

  audioEngine.playNote(349.23, 0.35); // F4 note

  return master;
}

// ---------- Explode and remove ----------

function explodeAndRemove(entity, ft) {
  const rect = entity.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  createExplosion(entity, cx, cy, 'bigBang', 2);
  entity.style.transition = 'opacity 0.3s ease-out';
  entity.style.opacity = '0';

  audioEngine.playNote(392, 0.45); // G4 chime

  const groupIdx = activeGroups.findIndex(g => g.master === entity);
  let partnersToCleanup = [];
  if (groupIdx >= 0) {
    const group = activeGroups[groupIdx];
    partnersToCleanup = group.partners;
    activeGroups.splice(groupIdx, 1);
  }

  partnersToCleanup.forEach(partner => {
    createExplosion(partner, cx, cy, 'bigBang', 2);
    partner.style.transition = 'opacity 0.3s ease-out';
    partner.style.opacity = '0';
  });

  setTimeout(() => {
    cleanupCard(entity, ft);
    partnersToCleanup.forEach(partner => {
      cleanupCard(partner, partner._ft);
    });
  }, 350);
}

function cleanupCard(card, ft) {
  try { card._instance && card._instance.destroy && card._instance.destroy(); } catch {}
  if (card._saveGesture) {
    try { card._saveGesture.destroy(); } catch {}
  }
  ft && ft.destroy();
  card.remove();
  effectCount--;
  updateEmptyState();
}

// ---------- Radial menu ----------

mountRadialMenu((key) => {
  const effectKey = RADIAL_KEY_MAP[key];
  if (effectKey) spawnEffect(effectKey);
}, {
  onOpen: () => {
    audioEngine.playNote(329.63, 0.25); // E4 radial open chime
  },
  onHoverItem: () => {
    audioEngine.playNote(587.33, 0.05); // tick sound on items
  }
});

// ---------- UI Controls ----------

const audioBtn = document.getElementById('audio-toggle');
const audioOnIcon = audioBtn.querySelector('.icon-audio-on');
const audioOffIcon = audioBtn.querySelector('.icon-audio-off');

function updateAudioUI() {
  const isMuted = audioEngine.muted;
  audioBtn.classList.toggle('active', !isMuted);
  if (isMuted) {
    audioOnIcon.classList.add('hidden');
    audioOffIcon.classList.remove('hidden');
  } else {
    audioOnIcon.classList.remove('hidden');
    audioOffIcon.classList.add('hidden');
  }
}

audioBtn.addEventListener('click', () => {
  audioEngine.toggleMute();
  updateAudioUI();
  if (!audioEngine.muted) {
    audioEngine.playNote(587.33, 0.2); // D5 chime
    audioEngine.startAmbientBed();
  }
});

const symBtn = document.getElementById('symmetry-toggle');
const symBadge = document.getElementById('symmetry-badge');

function updateSymmetryUI() {
  const mode = symmetry.getMode();
  symBtn.classList.toggle('active', mode > 0);
  symBadge.textContent = mode === 0 ? 'Off' : `${mode}`;
}

symBtn.addEventListener('click', () => {
  const mode = symmetry.toggle();
  updateSymmetryUI();
  audioEngine.playNote(659.25, 0.2); // E5 chime
  showToast(mode === 0 ? 'Mirror Off' : `Mirror Mode: ${mode}`);
});

// ---------- Passive mode ----------

const passiveMode = createPassiveMode({
  onPassive: () => {
    document.body.classList.add('passive');
    audioEngine.swellAmbient();
  },
  onActive: () => {
    document.body.classList.remove('passive');
    audioEngine.restoreAmbientVolume();
  },
  delay: 5000
});

// ---------- Init ----------

updateAudioUI();
updateSymmetryUI();

// Pre-populate playground with 3 gorgeous interactive cards
const vw = window.innerWidth;
const vh = window.innerHeight;

spawnEffect('soap-bubble', 0, vw * 0.28, vh * 0.45);
spawnEffect('petal-drift', 0, vw * 0.72, vh * 0.35);
spawnEffect('love-note', 0, vw * 0.5, vh * 0.72);

updateEmptyState();
