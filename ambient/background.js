// ambient/background.js — Full-viewport MiMo-style ambient background.
// FBM noise + domain warping → soft fluid gradient in dawn pastels.
// Cycles peach → lavender → mint → sky over ~45s with a soft pointer
// bias. This is "the room" — sits at z-index 0 behind everything else.

import * as THREE from 'three';
import { getDpr } from '../lib/dpr.js';
import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { isDocumentVisible } from '../lib/visibility.js';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Fragment shader: FBM + domain warping + 3-stop gradient.
const FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform vec2  uResolution;
  uniform float uTime;
  uniform vec2  uPointer;     // -1..1, derived from mouse
  uniform float uPointerEased; // 0..1, fades in/out
  uniform float uHueShift;    // 0..1, cycles the gradient

  // 2D hash.
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Value noise.
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal Brownian motion: 5 octaves.
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  // Domain-warped FBM — the MiMo fluid look.
  float warpedFbm(vec2 p, float t) {
    vec2 q = vec2(
      fbm(p + vec2(0.0, 0.0) + t * 0.05),
      fbm(p + vec2(5.2, 1.3) - t * 0.04)
    );
    vec2 r = vec2(
      fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.06),
      fbm(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.05)
    );
    return fbm(p + 4.0 * r);
  }

  // Convert HSL (0..1) to RGB.
  vec3 hsl2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z + c.y * (p - 1.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    vec2 uv = vUv;
    // Aspect-correct UV.
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    // Pointer bias: pull the noise field slightly toward the pointer.
    vec2 ptr = uPointer * 0.5 * uPointerEased;
    p += ptr;

    // Slow scroll to make the noise drift.
    float t = uTime * 0.04;

    // The fluid field.
    float f = warpedFbm(p * 1.1, t);

    // Aurora/nebula hue cycle. Saturated jewel tones for a vivid dark
    // sky: deep magenta → violet → blue → teal → emerald.
    float a = 0.5 + 0.5 * sin(uHueShift * 6.28318);
    float b = 0.5 + 0.5 * sin(uHueShift * 6.28318 + 2.094); // 120°
    float h1 = mix(310.0/360.0, 265.0/360.0, a);  // magenta ↔ violet
    float h2 = mix(265.0/360.0, 200.0/360.0, b);  // violet  ↔ blue
    float h3 = mix(200.0/360.0, 165.0/360.0, 1.0 - b); // blue ↔ teal

    // Saturated, high-lightness so the colors POP against the deep bg.
    vec3 c1 = hsl2rgb(vec3(h1, 0.75, 0.55));
    vec3 c2 = hsl2rgb(vec3(h2, 0.75, 0.55));
    vec3 c3 = hsl2rgb(vec3(h3, 0.70, 0.50));

    // Soft mix by the fluid field, with the three colors weighted by
    // its value at three offsets for a layered look.
    float k1 = smoothstep(0.30, 0.80, f + 0.0);
    float k2 = smoothstep(0.20, 0.90, f + 0.3);
    float k3 = smoothstep(0.25, 0.95, f + 0.6);

    vec3 col = mix(c1, c2, k1);
    col = mix(col, c3, k2 * 0.6);
    col = mix(col, c1 * 0.9, k3 * 0.3);

    // Deep dark base — multiply toward black so unlit regions are
    // almost-black plum, not bright pastels. The colors only emerge
    // where the fluid field is high.
    vec3 deep = vec3(0.03, 0.02, 0.06);
    col = mix(deep, col, 0.55 + 0.45 * f);

    // Soft vignette pulling toward black.
    float vig = smoothstep(1.4, 0.2, length(uv - 0.5) * 1.3);
    col *= mix(0.55, 1.0, vig);

    // Gentle global brightness breathing.
    col *= 0.95 + 0.08 * sin(uTime * 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function mountBackground(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(getDpr());

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uResolution:  { value: new THREE.Vector2(1, 1) },
    uTime:        { value: 0 },
    uPointer:     { value: new THREE.Vector2(0, 0) },
    uPointerEased:{ value: 0 },
    uHueShift:    { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(quad);

  const reduced = prefersReducedMotion();
  const speed = reduced ? 1 / 3 : 1;

  let pointerTargetX = 0, pointerTargetY = 0;
  let pointerEased = 0;
  let pointerActive = 0; // 0..1, fades on touch/move

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    pointerTargetX = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerTargetY = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointerActive = 1;
  }
  function onPointerLeave() {
    pointerActive = 0;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let raf = 0;
  function frame() {
    if (!isDocumentVisible()) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    uniforms.uTime.value = t * speed;
    uniforms.uHueShift.value = (t * speed * 0.018) % 1.0;

    // Pointer ease.
    const damp = 1 - Math.exp(-dt / 0.6);
    const cur = uniforms.uPointer.value;
    cur.x += (pointerTargetX - cur.x) * damp;
    cur.y += (pointerTargetY - cur.y) * damp;
    pointerEased += (pointerActive - pointerEased) * damp;
    uniforms.uPointerEased.value = pointerEased;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', resize);
      quad.geometry.dispose();
      mat.dispose();
      renderer.dispose();
    },
  };
}
