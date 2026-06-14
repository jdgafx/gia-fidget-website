// effects/sand-pour.js — thisissand-style falling sand simulation.
// Cellular automata on a low-render grid. GPU-based: grid stored in
// DataTexture, updated via fragment shader with ping-pong framebuffers.
// Multiple sand colors. Pointer input sets cells to sand at cursor.
// Quality scaling via document.body.dataset.quality.

import * as THREE from 'three';
import { getDpr } from '../lib/dpr.js';
import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { isDocumentVisible } from '../lib/visibility.js';

// --- Grid config ---
const GRID_W = 160;
const GRID_H = 120;
const REDUCED_W = 120, REDUCED_H = 90;
const MINIMAL_W = 80, MINIMAL_H = 60;

// Cell types: 0 = empty, 1-7 = sand color index
const SAND_COLORS = [
  [0.95, 0.85, 0.65], // warm sand
  [0.85, 0.75, 0.95], // lavender
  [0.75, 0.92, 0.88], // mint
  [0.95, 0.78, 0.72], // peach
  [0.78, 0.85, 0.95], // sky
  [0.92, 0.82, 0.68], // amber
  [0.88, 0.78, 0.92], // lilac
];

const VARIANT_PALETTES = {
  'Warm': SAND_COLORS,
  'Pastel': [
    [0.92, 0.88, 0.78],
    [0.82, 0.88, 0.95],
    [0.88, 0.95, 0.85],
    [0.95, 0.85, 0.82],
    [0.85, 0.82, 0.95],
    [0.92, 0.92, 0.78],
    [0.88, 0.82, 0.92],
  ],
  'Neon': [
    [1.0, 0.4, 0.6],
    [0.4, 0.8, 1.0],
    [0.6, 1.0, 0.5],
    [1.0, 0.8, 0.3],
    [0.8, 0.4, 1.0],
    [0.3, 1.0, 0.9],
    [1.0, 0.6, 0.3],
  ],
  'Earth': [
    [0.72, 0.58, 0.42],
    [0.58, 0.48, 0.38],
    [0.82, 0.72, 0.55],
    [0.48, 0.42, 0.35],
    [0.68, 0.55, 0.42],
    [0.78, 0.65, 0.48],
    [0.55, 0.45, 0.38],
  ],
  'Ocean': [
    [0.3, 0.6, 0.8],
    [0.4, 0.8, 0.9],
    [0.2, 0.5, 0.7],
    [0.5, 0.7, 0.85],
    [0.35, 0.65, 0.8],
    [0.25, 0.55, 0.75],
    [0.45, 0.75, 0.9],
  ],
};

const VARIANT_NAMES = Object.keys(VARIANT_PALETTES);

// --- Shaders ---
const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Simulation step shader: reads grid, writes next state.
const SIM_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uGrid;
  uniform vec2 uResolution;
  uniform vec2 uPointer;     // -1..1, sand source
  uniform float uPointerActive;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 texel = 1.0 / uResolution;
    vec4 cell = texture2D(uGrid, vUv);
    int type = int(cell.r * 255.0 + 0.5);

    // Below = higher y in texture (flip Y so gravity pulls down in screen space).
    vec2 below = vUv + vec2(0.0, texel.y);
    vec2 belowL = vUv + vec2(-texel.x, texel.y);
    vec2 belowR = vUv + vec2(texel.x, texel.y);
    vec2 left = vUv + vec2(-texel.x, 0.0);
    vec2 right = vUv + vec2(texel.x, 0.0);

    int typeBelow = int(texture2D(uGrid, below).r * 255.0 + 0.5);
    int typeBelowL = int(texture2D(uGrid, belowL).r * 255.0 + 0.5);
    int typeBelowR = int(texture2D(uGrid, belowR).r * 255.0 + 0.5);
    int typeLeft = int(texture2D(uGrid, left).r * 255.0 + 0.5);
    int typeRight = int(texture2D(uGrid, right).r * 255.0 + 0.5);

    int newType = type;

    if (type == 0) {
      // Empty cell: check if sand falls into me from above.
      // Above = lower y in texture.
      vec2 above = vUv - vec2(0.0, texel.y);
      vec2 aboveL = vUv + vec2(-texel.x, -texel.y);
      vec2 aboveR = vUv + vec2(texel.x, -texel.y);
      int typeAbove = int(texture2D(uGrid, above).r * 255.0 + 0.5);
      int typeAboveL = int(texture2D(uGrid, aboveL).r * 255.0 + 0.5);
      int typeAboveR = int(texture2D(uGrid, aboveR).r * 255.0 + 0.5);

      if (typeAbove >= 1 && typeAbove <= 7) {
        newType = typeAbove;
      } else if (typeAboveL >= 1 && typeAboveL <= 7) {
        if (hash(vUv + uTime) > 0.5) newType = typeAboveL;
      } else if (typeAboveR >= 1 && typeAboveR <= 7) {
        if (hash(vUv + uTime) > 0.5) newType = typeAboveR;
      }
    } else if (type >= 1 && type <= 7) {
      // Sand: try to fall down.
      if (typeBelow == 0) {
        newType = 0; // fall
      } else if (typeBelowL == 0 && typeBelowR == 0) {
        newType = hash(vUv + uTime) > 0.5 ? 0 : type; // slide left or right
      } else if (typeBelowL == 0) {
        newType = 0; // slide left
      } else if (typeBelowR == 0) {
        newType = 0; // slide right
      }
    }

    // Pointer input: set cells near cursor to sand.
    if (uPointerActive > 0.5) {
      float dist = length(vUv - uPointer * 0.5 - 0.5);
      if (dist < 0.03) {
        newType = int(mod(hash(vUv + uTime * 10.0) * 7.0, 7.0)) + 1;
      }
    }

    gl_FragColor = vec4(float(newType) / 255.0, 0.0, 0.0, 1.0);
  }
`;

// Render shader: reads grid, outputs colored pixels.
const RENDER_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uGrid;
  uniform vec2 uResolution;
  uniform vec3 uColors[7];
  varying vec2 vUv;

  void main() {
    vec4 cell = texture2D(uGrid, vUv);
    int type = int(cell.r * 255.0 + 0.5);

    // Dark plum background.
    vec3 bg = vec3(0.028, 0.018, 0.055);

    if (type >= 1 && type <= 7) {
      vec3 sand = uColors[type - 1];
      // Subtle shading based on position for depth.
      float shade = 0.9 + 0.1 * sin(vUv.x * 30.0 + vUv.y * 20.0);
      gl_FragColor = vec4(sand * shade, 1.0);
    } else {
      gl_FragColor = vec4(bg, 1.0);
    }
  }
`;

// --- Quality → grid size helper ---
function getGridSize(quality) {
  switch (quality) {
    case 'minimal':  return { w: MINIMAL_W, h: MINIMAL_H };
    case 'reduced':  return { w: REDUCED_W, h: REDUCED_H };
    default:         return { w: GRID_W, h: GRID_H };
  }
}

export function mountSandPour(container, opts = {}) {
  const dpr = getDpr();
  const reduced = prefersReducedMotion();

  // Renderer.
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(dpr);
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // --- Reusable ping-pong render targets ---
  let rtW = GRID_W, rtH = GRID_H;
  function makeRenderTarget(w, h) {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
  }
  let rtA = makeRenderTarget(rtW, rtH);
  let rtB = makeRenderTarget(rtW, rtH);

  function resizeTargets(newW, newH) {
    if (newW === rtW && newH === rtH) return;
    rtA.dispose();
    rtB.dispose();
    rtA = makeRenderTarget(newW, newH);
    rtB = makeRenderTarget(newW, newH);
    rtW = newW;
    rtH = newH;
  }

  // Simulation material.
  const simUniforms = {
    uGrid: { value: rtA.texture },
    uResolution: { value: new THREE.Vector2(rtW, rtH) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerActive: { value: 0 },
    uTime: { value: 0 },
  };
  const simMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: SIM_FRAG,
    uniforms: simUniforms,
    depthTest: false,
    depthWrite: false,
  });

  // Render material.
  const palette = VARIANT_PALETTES[opts.variant || 'Warm'] || SAND_COLORS;
  const colorUniforms = {
    uGrid: { value: rtB.texture },
    uResolution: { value: new THREE.Vector2(rtW, rtH) },
    uColors: { value: palette.map(c => new THREE.Vector3(...c)) },
  };
  const renderMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: RENDER_FRAG,
    uniforms: colorUniforms,
    depthTest: false,
    depthWrite: false,
  });

  const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat);
  const renderQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), renderMat);

  // Offscreen scene for simulation.
  const simScene = new THREE.Scene();
  simScene.add(simQuad);

  // Render scene (fullscreen quad).
  const renderScene = new THREE.Scene();
  renderScene.add(renderQuad);

  // Pointer tracking.
  let pointerX = 0.5, pointerY = 0.5;
  let pointerActive = 0;

  function onPointerDown(e) {
    const r = container.getBoundingClientRect();
    pointerX = (e.clientX - r.left) / r.width;
    pointerY = 1.0 - (e.clientY - r.top) / r.height;
    pointerActive = 1;
    e.preventDefault();
  }
  function onPointerMove(e) {
    const r = container.getBoundingClientRect();
    pointerX = (e.clientX - r.left) / r.width;
    pointerY = 1.0 - (e.clientY - r.top) / r.height;
    pointerActive = 1;
  }
  function onPointerUp() { pointerActive = 0; }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);

  // Resize.
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // RAF loop.
  let raf = 0;
  let stepCounter = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!isDocumentVisible()) {
      raf = requestAnimationFrame(frame);
      return;
    }

    // Quality scaling.
    const quality = document.body.dataset.quality || 'full';
    const size = getGridSize(quality);
    resizeTargets(size.w, size.h);

    if (quality === 'minimal') {
      stepCounter++;
      if (stepCounter % 2 !== 0) {
        raf = requestAnimationFrame(frame);
        return; // skip every other frame
      }
    }

    const dt = Math.max(0, clock.getDelta());
    simUniforms.uTime.value += dt;
    simUniforms.uResolution.value.set(rtW, rtH);
    simUniforms.uPointer.value.set(pointerX, pointerY);
    simUniforms.uPointerActive.value = pointerActive;

    // 1. Sim step: read rtA.texture → write to rtB.
    simUniforms.uGrid.value = rtA.texture;
    renderer.setRenderTarget(rtB);
    renderer.render(simScene, camera);

    // 2. Render to screen: read rtB.texture.
    renderer.setRenderTarget(null);
    colorUniforms.uGrid.value = rtB.texture;
    colorUniforms.uResolution.value.set(rtW, rtH);
    renderer.render(renderScene, camera);

    // 3. Swap ping-pong.
    [rtA, rtB] = [rtB, rtA];

    raf = requestAnimationFrame(frame);
  }

  if (!reduced) {
    raf = requestAnimationFrame(frame);
  } else {
    // Static frame: render current state once.
    colorUniforms.uGrid.value = rtA.texture;
    renderer.render(renderScene, camera);
  }

  // Variant cycling.
  let currentVariant = opts.variant || 'Warm';
  function setVariant(name) {
    if (!VARIANT_PALETTES[name]) return;
    currentVariant = name;
    const p = VARIANT_PALETTES[name];
    colorUniforms.uColors.value = p.map(c => new THREE.Vector3(...c));
  }

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      rtA.dispose();
      rtB.dispose();
      simMat.dispose();
      renderMat.dispose();
      simQuad.geometry.dispose();
      renderQuad.geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
    setVariant,
  };
}
