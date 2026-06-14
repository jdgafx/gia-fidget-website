// effects/aurora-ribbon.js — WebGL ribbon with vertex displacement.
// Slow rainbow color flow (12s period), pointer horizontally
// displaces the wave with a soft 1.5s return.

import * as THREE from 'three';
import { getDpr } from '../lib/dpr.js';
import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';
import { pointerDamp } from '../lib/easing.js';

const VERT = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uPointer;     // -1..1
  uniform float uPhase;       // 0..1
  attribute float aSide;      // -1 (left) or +1 (right)
  varying float vSide;
  varying float vZ;
  varying float vHue;

  vec3 hsl2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z + c.y * (p - 1.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    vSide = aSide;
    vec3 p = position;

    // Active pinwheel-spinning waves.
    float t = uTime * 1.0;
    float wave = sin(p.x * 2.0 + t) * 0.26
               + sin(p.x * 3.6 - t * 0.8 + 1.3) * 0.14
               + sin(p.x * 5.3 + t * 1.3) * 0.08
               + sin(p.x * 8.0 - t * 1.7) * 0.04;

    // Pointer bias — pushes the wave up dramatically where the pointer is.
    float px = uPointer;
    float localX = p.x - px;
    // Tighter falloff + bigger amplitude = a clear wave bump under cursor.
    float push = exp(-localX * localX * 1.0) * 0.7;

    p.z += wave + push;

    vZ = p.z;
    vHue = fract(p.x * 0.15 + uTime * 0.04 + uPhase);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  varying float vSide;
  varying float vZ;
  varying float vHue;
  uniform float uAlpha;

  vec3 hsl2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z + c.y * (p - 1.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    vec3 col = hsl2rgb(vec3(vHue, 0.55, 0.72));
    // Subtle bright ridge at peaks.
    col += vec3(1.0) * smoothstep(0.05, 0.25, vZ) * 0.15;
    // Soft edges (left/right).
    float edge = 1.0 - pow(abs(vSide), 3.0);
    float a = uAlpha * edge;
    gl_FragColor = vec4(col, a);
  }
`;

export function mountAuroraRibbon(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(getDpr());
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 3.0);

  // Build a long ribbon: 200 segments × 2 vertices wide.
  const N = 200;
  const positions = new Float32Array(N * 2 * 3);
  const sides     = new Float32Array(N * 2);
  const indices   = [];

  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 4.0 - 2.0; // x in [-2, 2]
    const y = 0.10;                       // thickness
    // top vertex
    positions[i * 6 + 0] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = 0;
    sides[i * 2 + 0] = -1;
    // bottom vertex
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = -y;
    positions[i * 6 + 5] = 0;
    sides[i * 2 + 1] = +1;
  }
  for (let i = 0; i < N - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSide',    new THREE.BufferAttribute(sides, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const uniforms = {
    uTime:   { value: 0 },
    uPointer:{ value: 0 },
    uPhase:  { value: Math.random() * 6.28 },
    uAlpha:  { value: 0.85 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const reduced = prefersReducedMotion();
  const vis = createVisibilityObserver(canvas);

  let targetPointer = 0;
  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    targetPointer = ((e.clientX - r.left) / r.width) * 2 - 1;
  }
  function onPointerLeave() { targetPointer = 0; }
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

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

    const damp = pointerDamp(dt, 0.3);
    uniforms.uPointer.value += (targetPointer - uniforms.uPointer.value) * damp;
    uniforms.uTime.value = t;
    uniforms.uAlpha.value = 0.85;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      vis.destroy();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
