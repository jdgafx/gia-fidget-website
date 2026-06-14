// lib/dpr.js — Pixel ratio capping utility

export function getDpr() {
  const urlParams = new URLSearchParams(window.location.search);
  const override = urlParams.get('dpr');
  if (override) {
    const val = parseFloat(override);
    if (!isNaN(val)) return val;
  }
  return Math.min(window.devicePixelRatio || 1, 1.5);
}
