// lib/palette.js — Calm hope palette
export const PASTELS = {
  peach: 'hsl(16, 100%, 92%)',
  lavender: 'hsl(265, 56%, 91%)',
  mint: 'hsl(144, 50%, 88%)',
  sky: 'hsl(208, 86%, 92%)',
  rose: 'hsl(354, 84%, 93%)',
  butter: 'hsl(48, 100%, 89%)'
};

export const ACCENTS = {
  pink: 'hsl(340, 70%, 65%)',
  violet: 'hsl(290, 70%, 65%)',
  blue: 'hsl(210, 70%, 65%)',
  teal: 'hsl(165, 70%, 65%)',
  green: 'hsl(95, 70%, 65%)',
  yellow: 'hsl(35, 70%, 65%)'
};

// Generates a soft rainbow accent color based on a key/seed
export function getRainbowAccent(index, alpha = 1) {
  const keys = Object.keys(ACCENTS);
  const color = ACCENTS[keys[index % keys.length]];
  if (alpha === 1) return color;
  // Convert hsl(...) to hsla(...)
  return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
}

export function getPastel(name, alpha = 1) {
  const color = PASTELS[name] || PASTELS.peach;
  if (alpha === 1) return color;
  return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
}
