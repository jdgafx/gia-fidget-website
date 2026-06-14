export function applyViewportBounce(state, vel, elW = 200, elH = 200) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const BOUNCE_DAMPING = 0.6;

  let bounced = false;

  // Left edge.
  if (state.x - elW / 2 < 0) {
    state.x = elW / 2;
    vel.x = Math.abs(vel.x) * BOUNCE_DAMPING;
    bounced = true;
  }
  // Right edge.
  if (state.x + elW / 2 > vw) {
    state.x = vw - elW / 2;
    vel.x = -Math.abs(vel.x) * BOUNCE_DAMPING;
    bounced = true;
  }
  // Top edge.
  if (state.y - elH / 2 < 0) {
    state.y = elH / 2;
    vel.y = Math.abs(vel.y) * BOUNCE_DAMPING;
    bounced = true;
  }
  // Bottom edge.
  if (state.y + elH / 2 > vh) {
    state.y = vh - elH / 2;
    vel.y = -Math.abs(vel.y) * BOUNCE_DAMPING;
    bounced = true;
  }

  return bounced;
}