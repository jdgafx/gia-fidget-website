// lib/palette.js — Hope palette for the Gia fidget site.
// Low-arousal dawn pastels (parasympathetic-friendly), rainbow
// accents capped at 70% HSL saturation. Pure red and pure black
// are forbidden. Soft fascination over stimulation.

export const PASTELS = {
  peach:    { hex: '#ffe5d9', hsl: [16, 100, 92] },
  lavender: { hex: '#e8dff5', hsl: [265, 56, 91] },
  mint:     { hex: '#d4f1e4', hsl: [144, 50, 88] },
  sky:      { hex: '#dceefb', hsl: [208, 86, 92] },
  rose:     { hex: '#fde2e4', hsl: [354, 84, 93] },
  butter:   { hex: '#fff3c4', hsl: [48, 100, 89] },
  paper:    { hex: '#fbf8f3', hsl: [36, 47, 97] },
  ink:      { hex: '#2a2540', hsl: [252, 26, 20] }, // soft plum, not black
};

export const ACCENT = {
  // Rainbow accents — each capped at ~70% HSL saturation.
  hue: [340, 290, 250, 210, 165, 95, 35], // pink → violet → blue → teal → green → yellow → orange
  sat: 70,
  light: 65,
};

export const FORBIDDEN = {
  pureRed:    /^#ff0000$/i,
  pureBlack:  /^#000000$/i,
  pureWhite:  /^#ffffff$/i, // we use paper (#fbf8f3) for warmth instead
};

export function isAllowedColor(hex) {
  if (FORBIDDEN.pureRed.test(hex))  return false;
  if (FORBIDDEN.pureBlack.test(hex)) return false;
  if (FORBIDDEN.pureWhite.test(hex)) return false;
  return true;
}

// Sample a soft rainbow accent at parameter t in [0,1].
export function rainbowAccent(t, alpha = 1) {
  const hues = ACCENT.hue;
  const idx = (t * (hues.length - 1)) % hues.length;
  const i0 = Math.floor(idx);
  const i1 = (i0 + 1) % hues.length;
  const f = idx - i0;
  const h = hues[i0] + (hues[i1] - hues[i0]) * f;
  return `hsla(${h.toFixed(0)}, ${ACCENT.sat}%, ${ACCENT.light}%, ${alpha})`;
}

// Sample a soft dawn pastel (background use).
export function pastel(name, alpha = 1) {
  const p = PASTELS[name] || PASTELS.paper;
  const [h, s, l] = p.hsl;
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}

// Convert HSL to RGB hex (0-255 each).
export function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
}
