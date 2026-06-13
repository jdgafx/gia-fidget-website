// effects/fluid-goo.js — MiMo-inspired metaball blob.
// Soft pastel base; rainbow emerges only when pointer is near.
// Breath-rhythm scale, pointer-follow with damping, tap = soft bloom.

import * as THREE from 'three';
import { getDpr } from '../lib/dpr.js';
import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';
import { breathScale, pointerDamp } from '../lib/easing.js';
import { rainbowAccent } from '../lib/palette.js';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Soft-min metaball shader with a fluid noise displacement and a
// rainbow gradient that fades in as the pointer approaches.
const FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uPointerLocal;  // -1..1 inside quad
  uniform float uPointerProx;   // 0..1
  uniform float uBloom;         // 0..1, tap-driven
  uniform float uBreath;        // 0..1, sinusoidal

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1, 0));
    float c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  vec3 hsl2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z + c.y * (p - 1.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;

    // Fluid displacement — soft, organic.
    float n = fbm(uv * 1.4 + vec2(uTime * 0.07, -uTime * 0.05));
    float r = length(uv) + (n - 0.5) * 0.30;

    // Soft-min field — multiple blobs to give the goo look.
    float blobs = 0.0;
    for (int i = 0; i < 5; i++) {
      float a = float(i) * 1.2566;       // 72° steps
      float radius = 0.32 + 0.10 * sin(uTime * 0.5 + a);
      vec2 c = vec2(cos(a + uTime * 0.2), sin(a + uTime * 0.18)) * 0.30;
      float d = length(uv - c) - radius;
      blobs += 0.20 / (d * d * 30.0 + 0.1);
    }

    float mask = smoothstep(0.55, 1.05, blobs + 0.6);

    // Pointer proximity brightens a hue band.
    float px = length(uv - uPointerLocal);
    float prox = smoothstep(0.9, 0.0, px) * uPointerProx;

    // Rainbow swirl phase: tied to angle and time, more visible on prox.
    float ang = atan(uv.y, uv.x);
    float hue = fract(0.5 + ang / 6.28318 + uTime * 0.04);
    vec3 rainbow = hsl2rgb(vec3(hue, 0.70, 0.65));

    // Pastel base.
    vec3 base = mix(
      vec3(1.0, 0.90, 0.85),   // peach
      vec3(0.91, 0.87, 0.96),  // lavender
      0.5 + 0.5 * sin(uTime * 0.3)
    );

    vec3 col = base;
    col = mix(col, rainbow, prox * 0.7);

    // Tap bloom — a soft inner glow that decays.
    col += vec3(1.0, 0.95, 0.92) * uBloom * 0.5;
    col += rainbow * uBloom * 0.25;

    // Subtle breath tint.
    col *= 0.96 + 0.05 * uBreath;

    // Edge softness — fade out around the quad.
    float edge = smoothstep(1.2, 0.6, length(uv));
    col *= edge;

    // Subtle highlight where pointer is closest.
    col += vec3(1.0) * prox * 0.15 * (1.0 - smoothstep(0.0, 0.6, px));

    gl_FragColor = vec4(col, mask);
  }
`;

export function mountFluidGoo(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(getDpr());
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 2.4;

  const uniforms = {
    uTime:         { value: 0 },
    uPointerLocal: { value: new THREE.Vector2(0, 0) },
    uPointerProx:  { value: 0 },
    uBloom:        { value: 0 },
    uBreath:       { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(mesh);

  const reduced = prefersReducedMotion();
  const vis = createVisibilityObserver(canvas);

  // Pointer state inside the canvas.
  const target = { x: 0, y: 0, prox: 0 };
  let bloom = 0;

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    target.x = x; target.y = y; target.prox = 1;
  }
  function onPointerLeave() { target.prox = 0; }
  function onPointerDown() { bloom = 1; }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });

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

    const damp = pointerDamp(dt, 0.45);
    const cur = uniforms.uPointerLocal.value;
    cur.x += (target.x - cur.x) * damp;
    cur.y += (target.y - cur.y) * damp;
    uniforms.uPointerProx.value += (target.prox - uniforms.uPointerProx.value) * damp;

    bloom *= Math.exp(-dt / 0.6);
    uniforms.uBloom.value = bloom;

    uniforms.uTime.value = t;
    uniforms.uBreath.value = 0.5 + 0.5 * Math.sin(t * 0.9);

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
      canvas.removeEventListener('pointerdown', onPointerDown);
      mesh.geometry.dispose();
      mat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
