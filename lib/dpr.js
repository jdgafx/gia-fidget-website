// lib/dpr.js — Pixel ratio helper.
// Cap DPR at 1.5 on mobile to keep the GPU happy.
// Power users can override with `?dpr=2` in the URL.

export function getDpr() {
  const url = new URL(window.location.href);
  const override = parseFloat(url.searchParams.get('dpr'));
  if (Number.isFinite(override) && override > 0 && override <= 2.5) {
    return override;
  }
  return Math.min(window.devicePixelRatio || 1, 1.5);
}
