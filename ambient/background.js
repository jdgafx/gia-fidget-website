// ambient/background.js — MiMo-style big fluid form.
// A few large soft-min metaballs drift across the viewport, with
// FBM displacement creating fabric-like folds. Rainbow gradient flows
// across the surface. Pointer pulls the form toward the cursor.

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

// Fragment: 3 big drifting blobs + FBM surface displacement +
// flowing rainbow color + soft glow + pointer bias.
const FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform vec2  uResolution;
  uniform float uTime;
  uniform vec2  uPointer;
  uniform float uPointerEased;
  uniform float uHueShift;

  // 2D hash + value noise + FBM
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1, 0)), f.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.02;
      a *= 0.5;
    }
    return v;
  }
  // Domain-warped FBM for fluid look.
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

  vec3 hsl2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z + c.y * (p - 1.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    // Aspect-correct UV.
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.10;  // master time

    // Pointer bias — pull the form strongly toward cursor.
    vec2 ptrOff = uPointer * 0.35 * uPointerEased;
    vec2 pp = p - ptrOff;

    // 3 large drifting blobs — slow sweeping motion (MiMo-style).
    // Centers wander in lissajous-like patterns, big amplitudes.
    vec2 c0 = vec2(sin(t * 0.7) * 0.55, cos(t * 0.5) * 0.30) + ptrOff * 0.4;
    vec2 c1 = vec2(cos(t * 0.9 + 1.2) * 0.60, sin(t * 0.7 + 0.8) * 0.40) + ptrOff * 0.5;
    vec2 c2 = vec2(sin(t * 0.55 + 2.1) * 0.50, cos(t * 0.85 + 1.5) * 0.45) + ptrOff * 0.4;
    vec2 c3 = vec2(cos(t * 0.4 + 3.3) * 0.65, sin(t * 0.6 + 2.4) * 0.35) + ptrOff * 0.3;

    // Radii breathe slowly.
    float r0 = 0.55 + 0.10 * sin(t * 0.8);
    float r1 = 0.50 + 0.12 * cos(t * 0.65 + 1.0);
    float r2 = 0.60 + 0.08 * sin(t * 0.95 + 2.0);
    float r3 = 0.45 + 0.14 * cos(t * 0.7 + 0.5);

    // Soft-min field — 4 blobs merge.
    float d0 = length(pp - c0) - r0;
    float d1 = length(pp - c1) - r1;
    float d2 = length(pp - c2) - r2;
    float d3 = length(pp - c3) - r3;
    float field = 0.18 / (d0*d0*6.0 + 0.1)
               + 0.16 / (d1*d1*6.0 + 0.1)
               + 0.20 / (d2*d2*6.0 + 0.1)
               + 0.14 / (d3*d3*6.0 + 0.1);

    // FBM surface displacement for fabric-like folds.
    float disp = (warpedFbm(p * 1.4, t * 1.3) - 0.5) * 0.55;
    float mask = smoothstep(0.55 + disp, 1.20 + disp, field);

    // Hue cycles the rainbow across the form.
    // Strong, vivid, dark-sky jewel tones (magenta/violet/blue/teal).
    float a = 0.5 + 0.5 * sin(uHueShift * 6.28318);
    float b = 0.5 + 0.5 * sin(uHueShift * 6.28318 + 2.094);
    float h1 = mix(310.0/360.0, 265.0/360.0, a);  // magenta ↔ violet
    float h2 = mix(265.0/360.0, 200.0/360.0, b);  // violet  ↔ blue
    float h3 = mix(200.0/360.0, 165.0/360.0, 1.0 - b); // blue ↔ teal

    vec3 cA = hsl2rgb(vec3(h1, 0.80, 0.60));
    vec3 cB = hsl2rgb(vec3(h2, 0.80, 0.58));
    vec3 cC = hsl2rgb(vec3(h3, 0.75, 0.55));

    // Position-driven mix so the form has its own color flow.
    float mixK1 = smoothstep(-0.3, 0.8, p.x + p.y * 0.3 + sin(t * 0.3) * 0.4);
    float mixK2 = smoothstep(-0.3, 0.8, p.y - p.x * 0.3 + cos(t * 0.4) * 0.4);
    vec3 col = mix(cA, cB, mixK1);
    col = mix(col, cC, mixK2 * 0.7);

    // Bright fold highlights.
    float fold = smoothstep(0.4, 0.95, abs(disp) * 2.0);
    col += hsl2rgb(vec3(h2, 0.5, 0.85)) * fold * 0.35;

    // Deep void base — almost-black plum.
    vec3 deep = vec3(0.025, 0.018, 0.055);
    col = mix(deep, col, 0.78 + 0.22 * fbm(p * 2.0 + t * 0.5));

    // Soft outer glow.
    float glow = smoothstep(0.0, 0.6, field) * smoothstep(1.4, 0.4, field);
    col += hsl2rgb(vec3(h2, 0.6, 0.7)) * glow * 0.18;

    // Vignette.
    float vig = smoothstep(1.5, 0.2, length(vUv - 0.5) * 1.4);
    col *= mix(0.4, 1.0, vig);

    // Global breath.
    col *= 0.94 + 0.08 * sin(uTime * 0.5);

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
  const speed = reduced ? 1 / 2 : 1;

  let pointerTargetX = 0, pointerTargetY = 0;
  let pointerEased = 0;
  let pointerActive = 0;

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    pointerTargetX = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerTargetY = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointerActive = 1;
  }
  function onPointerLeave() { pointerActive = 0; }
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
    uniforms.uHueShift.value = (t * speed * 0.035) % 1.0;

    const damp = 1 - Math.exp(-dt / 0.20);
    const cur = uniforms.uPointer.value;
    cur.x += (pointerTargetX - cur.x) * damp;
    cur.y += (pointerTargetY - cur.y) * damp;
    pointerEased += (pointerActive - pointerEased) * damp;
    uniforms.uPointerEased.value = pointerEased * 1.4;

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
