// effects/galaxy.js — Particle galaxy that auto-rotates slowly.
// Pointer-drag gives it a gentle spin that decays back to
// auto-rotation over 4s. Calming, like stirring honey.

import * as THREE from 'three';
import { getDpr } from '../lib/dpr.js';
import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';

const ARMS = 4;
const PARTICLES = 1500;

function galaxyGeometry() {
  const positions = new Float32Array(PARTICLES * 3);
  const colors    = new Float32Array(PARTICLES * 3);
  const sizes     = new Float32Array(PARTICLES);

  const inner = new THREE.Color('#e8dff5'); // lavender core
  const mid   = new THREE.Color('#ffd6e0'); // rose arm
  const outer = new THREE.Color('#dceefb'); // sky halo

  for (let i = 0; i < PARTICLES; i++) {
    const arm = i % ARMS;
    const t = Math.random();
    const r = Math.pow(t, 0.6) * 1.0;     // 0..1, biased outward
    const armAngle = (arm / ARMS) * Math.PI * 2;
    const spin = r * 3.2;                  // arms wind outward
    const jitter = (Math.random() - 0.5) * 0.35;
    const angle = armAngle + spin + jitter;
    const y = (Math.random() - 0.5) * 0.06 * (1.0 - r * 0.6);

    positions[i * 3 + 0] = Math.cos(angle) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * r;

    // Color by radius — core lavender, mid rose, outer sky.
    const c = new THREE.Color();
    if (r < 0.3)        c.copy(inner).lerp(mid, r / 0.3);
    else if (r < 0.7)   c.copy(mid).lerp(outer, (r - 0.3) / 0.4);
    else                c.copy(outer);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = 0.018 + Math.random() * 0.025;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
  return geo;
}

const VERT = /* glsl */`
  attribute float size;
  varying vec3 vColor;
  uniform float uTime;
  uniform float uTwinkle;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 1.0 + 0.25 * sin(uTime * 2.0 + position.x * 8.0 + position.y * 6.0) * uTwinkle;
    gl_PointSize = size * 600.0 * tw / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(d));
    gl_FragColor = vec4(vColor, a);
  }
`;

export function mountGalaxy(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(getDpr());
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.4, 2.4);
  camera.lookAt(0, 0, 0);

  const uniforms = {
    uTime:    { value: 0 },
    uTwinkle: { value: 1.0 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexColors: true,
  });

  const geo = galaxyGeometry();
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const reduced = prefersReducedMotion();
  const vis = createVisibilityObserver(canvas);

  // Drag state.
  let dragging = false;
  let dragStartX = 0, dragStartY = 0;
  let rotX = 0, rotY = 0;
  let dragDeltaX = 0, dragDeltaY = 0;
  let pointerId = null;
  let lastX = 0, lastY = 0;

  function onPointerDown(e) {
    dragging = true;
    pointerId = e.pointerId;
    canvas.setPointerCapture(pointerId);
    lastX = e.clientX; lastY = e.clientY;
    dragDeltaX = 0; dragDeltaY = 0;
  }
  function onPointerMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    // Pixel-to-rad: gentle.
    dragDeltaX += dx * 0.005;
    dragDeltaY += dy * 0.005;
  }
  function onPointerUp(e) {
    if (e.pointerId !== pointerId) return;
    dragging = false;
    try { canvas.releasePointerCapture(pointerId); } catch {}
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerup', onPointerUp, { passive: true });
  canvas.addEventListener('pointercancel', onPointerUp, { passive: true });

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const clock = new THREE.Clock();
  let raf = 0;
  function frame() {
    if (!shouldRender(canvas, vis)) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime * (reduced ? 0.5 : 1.0);

    // Auto-rotation: very slow, like a clock minute hand.
    const autoY = 0.05 * dt;
    // Drag-driven spin decays over 4s.
    const decay = Math.exp(-dt / 0.8);
    rotY += dragDeltaX + autoY;
    rotX += dragDeltaY;
    dragDeltaX *= decay;
    dragDeltaY *= decay;

    // Clamp X tilt.
    rotX = Math.max(-1.0, Math.min(1.0, rotX));

    points.rotation.y = rotY;
    points.rotation.x = rotX;

    uniforms.uTime.value = t;
    uniforms.uTwinkle.value = dragging ? 0.4 : 1.0;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      vis.destroy();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
