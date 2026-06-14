// lib/ai-names.js — Procedural name generator with xorshift32

function xorshift32(state) {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
}

const ADJECTIVES = [
  'Peach', 'Lavender', 'Mint', 'Sky', 'Coral', 'Dusk', 
  'Dawn', 'Dreamy', 'Misty', 'Gentle', 'Golden', 'Opal',
  'Soft', 'Velvet', 'Warm', 'Amber', 'Sage', 'Honey',
  'Cosmic', 'Nebula', 'Ethereal', 'Plum', 'Serene', 'Luminous'
];

const NOUNS = [
  'Bloom', 'Drift', 'Wave', 'Glow', 'Ripple', 'Pulse',
  'Whisper', 'Breeze', 'Haze', 'Shimmer', 'Wisp', 'Spiral',
  'Vortex', 'Sigh', 'Petal', 'Orb', 'Tide', 'Gleam',
  'Ribbon', 'Stardust', 'Bubble', 'Sands', 'Cloud', 'Echo'
];

export function generateName(effectKey, variantIdx = 0) {
  // Simple FNV-1a hash to generate initial seed from effect name
  let hash = 2166136261;
  const str = effectKey + '-' + variantIdx;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  let seed = hash >>> 0;
  seed = xorshift32(seed);
  const adj = ADJECTIVES[seed % ADJECTIVES.length];
  
  seed = xorshift32(seed);
  const noun = NOUNS[seed % NOUNS.length];
  
  seed = xorshift32(seed);
  const num = (seed % 99) + 1;
  const numStr = String(num).padStart(2, '0');
  
  return `${adj} ${noun} #${numStr}`;
}
