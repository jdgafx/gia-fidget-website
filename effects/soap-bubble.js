// effects/soap-bubble.js — Iridescent soap bubble.
// Three.js sphere with a thin-film interference shader.
// Floats slowly (vertical sine drift). Tap = soft dissolve (1.2s),
// respawn 2s later at a new position. Never violent.

import * as THREE from 'three';
import { getDpr } from '../lib/dpr.js';
import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { shouldRender, createVisibilityObserver } from '../lib/visibility.js';

const VERT = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// Iridescent thin-film: faked with a hue modulated by fresnel + time.
const FRAG = /* glsl */`
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform float uFade;       // 1.0 visible, 0.0 dissolved
  uniform float uSpawn;      // 0..1, brief glow on respawn

  vec3 hsl2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z + c.y * (p - 1.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.0);

    // Thin-film hue shift based on fresnel + a slow time.
    float hue = fract(fres * 1.4 + uTime * 0.04 + vWorldPos.y * 0.05);
    vec3 iridescent = hsl2rgb(vec3(hue, 0.55, 0.78));

    // Soft inner color.
    vec3 base = hsl2rgb(vec3(0.58, 0.30, 0.92));

    vec3 col = mix(base, iridescent, fres);
    col += vec3(1.0) * pow(fres, 6.0) * 0.6; // specular hint

    // Spawn glow.
    col += vec3(1.0, 0.95, 0.97) * uSpawn * 0.4;

    // Fade.
    col *= uFade;
    float alpha = (0.55 + 0.45 * fres) * uFade;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function mountSoapBubble(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(getDpr());
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 3.0;

  const uniforms = {
    uTime:  { value: 0 },
    uFade:  { value: 0 },
    uSpawn: { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 64, 64), mat);
  scene.add(mesh);

  const reduced = prefersReducedMotion();
  const vis = createVisibilityObserver(canvas);

  // Phase: 'appearing' (spawn glow), 'idle' (drift), 'dissolving', 'gone'.
  let phase = 'appearing';
  let phaseT = 0;
  let fade = 0;
  let spawn = 0;
  let drift = 0;
  const driftAmp = 0.18;
  const driftPeriod = 6.0;
  // Mouse follow (bubble drifts toward pointer when hovered).
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    target.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  function onPointerLeave() { target.x = 0; target.y = 0; }
  function onPointerDown() {
    if (phase === 'idle' || phase === 'appearing') {
      phase = 'dissolving';
      phaseT = 0;
      const rect = canvas.getBoundingClientRect();
      const x = rect.width / 2;
      const y = rect.height / 2;
      import('../lib/party-explosion.js').then(m => {
        m.createExplosion(container, x, y, 'sparkles');
      });
    }
  }
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
    phaseT += dt;

    // Phase machine.
    if (phase === 'appearing') {
      spawn = Math.max(0, 1 - phaseT / 0.6);
      fade = Math.min(1, phaseT / 0.5);
      if (phaseT > 0.6) { phase = 'idle'; phaseT = 0; }
    } else if (phase === 'idle') {
      spawn *= Math.exp(-dt / 0.3);
      fade = 1;
      drift = Math.sin(t * (2 * Math.PI / driftPeriod)) * driftAmp;
      // Mouse follow with strong damping.
      const damp = 1 - Math.exp(-dt / 0.2);
      cur.x += (target.x - cur.x) * damp;
      cur.y += (target.y - cur.y) * damp;
    } else if (phase === 'dissolving') {
      fade = Math.max(0, 1 - phaseT / 1.2);
      spawn = 0;
      if (phaseT > 1.2) { phase = 'gone'; phaseT = 0; }
    } else if (phase === 'gone') {
      // 2s respawn delay.
      if (phaseT > 2.0) {
        phase = 'appearing';
        phaseT = 0;
        spawn = 1;
        fade = 0;
      }
    }

    mesh.position.x = cur.x * 0.6;
    mesh.position.y = drift + cur.y * 0.6;
    // Active spin like a pinwheel — multiple axes, fast.
    mesh.rotation.y = t * 0.6;
    mesh.rotation.x = Math.sin(t * 0.5) * 0.4;
    mesh.rotation.z = t * 0.25;
    mesh.scale.setScalar(0.92 + 0.10 * Math.sin(t * 1.2));

    uniforms.uTime.value = t;
    uniforms.uFade.value = fade;
    uniforms.uSpawn.value = spawn;

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
      mesh.geometry.dispose();
      mat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
