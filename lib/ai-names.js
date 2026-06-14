// lib/ai-names.js — Deterministic procedural name generator.
// Inline xorshift32 PRNG. Curated word lists. Same seed → same name.

// --- xorshift32 PRNG ---
function xorshift32(state) {
  state |= 0;
  state = (state ^ (state << 13)) | 0;
  state = (state ^ (state >>> 17)) | 0;
  state = (state ^ (state << 5)) | 0;
  return state >>> 0; // unsigned 32-bit
}

// --- Word lists (24 each) ---
const ADJECTIVES = [
  'Lavender', 'Amber', 'Coral', 'Mint', 'Sage', 'Rose',
  'Pearl', 'Ivory', 'Lilac', 'Peach', 'Honey', 'Dusk',
  'Velvet', 'Silken', 'Hazy', 'Dreamy', 'Gentle', 'Soft',
  'Twilight', 'Misty', 'Golden', 'Silver', 'Opal', 'Jade',
];

const NOUNS = [
  'Drift', 'Bloom', 'Wave', 'Glow', 'Whisper', 'Breeze',
  'Shimmer', 'Haze', 'Spiral', 'Wisp', 'Flutter', 'Gleam',
  'Ripple', 'Bloom', 'Dusk', 'Dawn', 'Glimmer', 'Veil',
  'Murmur', 'Sigh', 'Pulse', 'Tide', 'Mist', 'Ray',
];

const VIBE_TAGS = [
  'dreamy', 'warm', 'cool', 'fresh', 'soft', 'bright', 'deep', 'gentle',
];

// --- Hash: effectKey + variantIndex → uint32 seed ---
function hashSeed(effectKey, variantIndex) {
  let h = 2166136261 >>> 0; // FNV offset basis
  for (let i = 0; i < effectKey.length; i++) {
    h ^= effectKey.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime
  }
  h ^= (variantIndex | 0);
  h = Math.imul(h, 16777619);
  return h >>> 0;
}

export function generateName(effectKey, variantIndex = 0) {
  const seed = hashSeed(effectKey, variantIndex);
  let s = xorshift32(seed);
  const adj = ADJECTIVES[s % ADJECTIVES.length];
  s = xorshift32(s);
  const noun = NOUNS[s % NOUNS.length];
  s = xorshift32(s);
  const num = (s % 99) + 1;
  return `${adj} ${noun} #${String(num).padStart(2, '0')}`;
}

export function generateVibeTag(colorPalette) {
  // colorPalette: array of [h, s, l] or hex strings.
  // Map dominant hue to vibe tag.
  if (!colorPalette || colorPalette.length === 0) return VIBE_TAGS[0];
  // Use first color's hue as dominant.
  const c = colorPalette[0];
  let h;
  if (Array.isArray(c)) {
    h = c[0]; // HSL
  } else {
    // hex → crude hue
    const hex = c.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) h = 0;
    else if (max === r) h = 60 * (((g - b) / (max - min)) % 6);
    else if (max === g) h = 60 * ((b - r) / (max - min) + 2);
    else h = 60 * ((r - g) / (max - min) + 4);
  }
  // Map hue 0-360 to 8 vibe tags.
  const idx = Math.floor(((h % 360) + 360) / 360 * VIBE_TAGS.length) % VIBE_TAGS.length;
  return VIBE_TAGS[idx];
}
