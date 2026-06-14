// effects/chill-3d.js — Peaceful floating-island dreamscape.
// Three.js scene: floating island (icosphere + vertex displacement),
// slow-drifting petals, gradient sky dome, subtle fog.
// Drag = orbit, scroll = zoom, auto-rotate when idle.
// No enemies, no timer, no fail state.

import * as THREE from 'three';
import { getDpr } from '../lib/dpr.js';
import { prefersReducedMotion } from '../lib/reduced-motion.js';
import { isDocumentVisible } from '../lib/visibility.js';

const VARIANT_THEMES = {
  'Meadow': {
    island: [0.65, 0.85, 0.65],
    sky: [0.45, 0.65, 0.9],
    fog: [0.7, 0.8, 0.95],
    petal: [0.95, 0.82, 0.88],
  },
  'Sunset': {
    island: [0.85, 0.65, 0.55],
    sky: [0.95, 0.55, 0.45],
    fog: [0.95, 0.75, 0.65],
    petal: [0.95, 0.72, 0.58],
  },
  'Twilight': {
    island: [0.45, 0.45, 0.65],
    sky: [0.2, 0.15, 0.35],
    fog: [0.35, 0.3, 0.55],
    petal: [0.75, 0.55, 0.82],
  },
  'Ocean': {
    island: [0.45, 0.65, 0.75],
    sky: [0.3, 0.55, 0.8],
    fog: [0.55, 0.72, 0.88],
    petal: [0.65, 0.82, 0.92],
  },
  'Lavender': {
    island: [0.65, 0.55, 0.75],
    sky: [0.6, 0.55, 0.8],
    fog: [0.75, 0.7, 0.88],
    petal: [0.85, 0.72, 0.92],
  },
};

const VARIANT_NAMES = Object.keys(VARIANT_THEMES);

// Simple orbit controls (no OrbitControls dependency).
function createOrbitControls(camera, domEl) {
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let theta = Math.PI * 0.25; // horizontal angle
  let phi = Math.PI * 0.35;   // vertical angle
  let radius = 5;
  let target = new THREE.Vector3(0, 0.3, 0);
  let autoRotate = true;
  let autoRotateSpeed = 0.1; // rad/s
  let idleTimer = 0;
  const IDLE_DELAY = 2; // seconds before auto-rotate resumes

  function update() {
    camera.position.x = target.x + radius * Math.sin(phi) * Math.cos(theta);
    camera.position.y = target.y + radius * Math.cos(phi);
    camera.position.z = target.z + radius * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(target);
  }

  function onDown(e) {
    isDragging = true;
    autoRotate = false;
    idleTimer = 0;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    theta -= dx * 0.005;
    phi -= dy * 0.005;
    phi = Math.max(0.1, Math.min(Math.PI * 0.45, phi));
    update();
  }
  function onUp() {
    isDragging = false;
  }
  function onWheel(e) {
    e.preventDefault();
    radius += e.deltaY * 0.005;
    radius = Math.max(2, Math.min(12, radius));
    update();
  }

  domEl.addEventListener('pointerdown', onDown);
  domEl.addEventListener('pointermove', onMove);
  domEl.addEventListener('pointerup', onUp);
  domEl.addEventListener('pointercancel', onUp);
  domEl.addEventListener('wheel', onWheel, { passive: false });

  update();

  return {
    update(dt) {
      if (!isDragging) {
        idleTimer += dt;
        if (idleTimer > IDLE_DELAY) {
          autoRotate = true;
        }
      }
      if (autoRotate) {
        theta += autoRotateSpeed * dt;
        update();
      }
    },
    destroy() {
      domEl.removeEventListener('pointerdown', onDown);
      domEl.removeEventListener('pointermove', onMove);
      domEl.removeEventListener('pointerup', onUp);
      domEl.removeEventListener('pointercancel', onUp);
      domEl.removeEventListener('wheel', onWheel);
    },
  };
}

export function mount(container, opts = {}) {
  const dpr = getDpr();
  const reduced = prefersReducedMotion();
  const quality = document.body.dataset.quality || 'full';

  const themeName = opts.variant || 'Meadow';
  const theme = VARIANT_THEMES[themeName] || VARIANT_THEMES['Meadow'];

  // Renderer.
  const renderer = new THREE.WebGLRenderer({
    antialias: quality !== 'minimal',
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(dpr);
  if (quality === 'minimal') {
    renderer.shadowMap.enabled = false;
  }
  container.appendChild(renderer.domElement);

  // Scene.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(...theme.sky);
  if (quality !== 'minimal') {
    scene.fog = new THREE.FogExp2(new THREE.Color(...theme.fog).getHex(), 0.04);
  }

  // Camera.
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );

  // Orbit controls.
  const controls = createOrbitControls(camera, renderer.domElement);

  // Lights.
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5e0, 0.8);
  dirLight.position.set(3, 5, 2);
  scene.add(dirLight);

  // Sky dome — large sphere with gradient.
  const skyGeo = new THREE.SphereGeometry(50, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uTop: { value: new THREE.Color(...theme.sky) },
      uBottom: { value: new THREE.Color(...theme.fog) },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uTop;
      uniform vec3 uBottom;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        float t = smoothstep(-0.2, 0.8, h);
        gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Floating island — icosphere with vertex displacement.
  const islandSegs = quality === 'minimal' ? 2 : quality === 'reduced' ? 3 : 4;
  const islandGeo = new THREE.IcosahedronGeometry(1.2, islandSegs);
  // Displace vertices for organic look.
  const posAttr = islandGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const noise = Math.sin(x * 3) * Math.cos(z * 3) * 0.15
                + Math.sin(y * 5 + x * 2) * 0.08;
    posAttr.setY(i, y + noise);
    // Flatten bottom.
    if (y < -0.3) {
      posAttr.setY(i, -0.3 + (y + 0.3) * 0.3);
    }
  }
  islandGeo.computeVertexNormals();

  const islandMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...theme.island),
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = 0;
  scene.add(island);

  // Tiny trees on island (cones).
  const treeGeos = [];
  const treeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.3, 0.55, 0.35),
    flatShading: true,
  });
  for (let i = 0; i < 5; i++) {
    const treeGeo = new THREE.ConeGeometry(0.06, 0.2, 5);
    treeGeos.push(treeGeo);
    const tree = new THREE.Mesh(treeGeo, treeMat);
    const angle = (i / 5) * Math.PI * 2;
    const r = 0.3 + Math.random() * 0.4;
    tree.position.set(Math.cos(angle) * r, 0.8, Math.sin(angle) * r);
    tree.rotation.z = (Math.random() - 0.5) * 0.3;
    island.add(tree);
  }

  // Petals — transparent planes drifting in foreground.
  const petals = [];
  if (quality !== 'minimal') {
    const petalMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(...theme.petal),
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 5; i++) {
      const petalGeo = new THREE.PlaneGeometry(0.3, 0.15);
      const petal = new THREE.Mesh(petalGeo, petalMat.clone());
      petal.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 6
      );
      petal.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      petal.userData = {
        speed: 0.05 + Math.random() * 0.1,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        floatPhase: Math.random() * Math.PI * 2,
      };
      scene.add(petal);
      petals.push(petal);
    }
  }

  // Resize.
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // RAF loop.
  let raf = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!isDocumentVisible()) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    controls.update(dt);

    // Slow island bob.
    island.position.y = Math.sin(t * 0.5) * 0.08;
    island.rotation.y += dt * 0.05;

    // Petal drift.
    for (const p of petals) {
      const u = p.userData;
      p.position.y += Math.sin(t * u.speed + u.floatPhase) * 0.002;
      p.position.x += Math.sin(t * 0.1 + u.floatPhase) * 0.001;
      p.rotation.x += u.rotSpeed * dt * 0.3;
      p.rotation.z += u.rotSpeed * dt * 0.2;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  if (!reduced) {
    raf = requestAnimationFrame(frame);
  } else {
    renderer.render(scene, camera);
  }

  // Variant cycling.
  let currentVariant = themeName;
  function setVariant(name) {
    if (!VARIANT_THEMES[name]) return;
    currentVariant = name;
    const t = VARIANT_THEMES[name];
    scene.background = new THREE.Color(...t.sky);
    skyMat.uniforms.uTop.value = new THREE.Color(...t.sky);
    skyMat.uniforms.uBottom.value = new THREE.Color(...t.fog);
    islandMat.color = new THREE.Color(...t.island);
    if (scene.fog) scene.fog.color = new THREE.Color(...t.fog);
    for (const p of petals) {
      p.material.color = new THREE.Color(...t.petal);
    }
  }

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      controls.destroy();
      islandGeo.dispose();
      islandMat.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      for (const p of petals) {
        p.geometry.dispose();
        p.material.dispose();
      }
      treeGeos.forEach(g => g.dispose());
      treeMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
    setVariant,
  };
}
