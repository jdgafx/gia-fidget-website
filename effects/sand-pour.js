export function mountSandPour(container, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let active = true;

  const WIDTH = 400;
  const HEIGHT = 400;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // 200x200 grid for incredibly fine grain detail
  const COLS = 200;
  const ROWS = 200;
  
  // Fast raw typed array for performance (0 = empty, 1..360 = hue value)
  let grid = new Uint16Array(COLS * ROWS);

  // Fast ImageData buffer writing
  const imgData = ctx.createImageData(WIDTH, HEIGHT);
  const buffer32 = new Uint32Array(imgData.data.buffer);

  const variant = opts.variant || 'Desert Sand';
  let mouse = { x: 100, y: 10, active: false };
  let pourHue = 0;

  // Momentum velocity shifts (sloshing physics)
  let shiftX = 0;
  let shiftY = 0;

  function updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * COLS;
    const my = ((e.clientY - rect.top) / rect.height) * ROWS;
    mouse.x = Math.max(0, Math.min(COLS - 1, Math.floor(mx)));
    mouse.y = Math.max(0, Math.min(ROWS - 1, Math.floor(my)));
  }

  function onPointerDown(e) {
    mouse.active = true;
    updateMousePos(e);
  }

  function onPointerMove(e) {
    updateMousePos(e);
  }

  function onPointerUp() {
    mouse.active = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });

  // Slowly drain bottom cells to keep simulation infinite
  function drainBottom() {
    const startY = ROWS - 1;
    for (let x = 0; x < COLS; x++) {
      if (Math.random() < 0.10) {
        grid[startY * COLS + x] = 0;
      }
    }
  }

  // Convert HSL to 32-bit ABGR (little endian format for canvas pixel buffer)
  function hslToABGR(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    
    return 0xFF000000 | (b << 16) | (g << 8) | r;
  }

  // Get sand grain colors per theme with coordinate-based texture noise
  function getSandColorABGR(val, x, y) {
    const grainNoise = ((x * 17 + y * 23) % 13) - 6; // stable per-grain sparkle (-6% to +6% lightness)
    
    if (variant === 'Desert Sand') {
      const h = 15 + (val % 30); // 15 to 45 (peach to gold)
      const s = 65 + (val % 5);
      const l = Math.max(30, Math.min(85, 60 + grainNoise + (val % 10)));
      return hslToABGR(h, s, l);
    } 
    else if (variant === 'Ocean Dunes') {
      const h = 170 + (val % 80); // 170 to 250 (aquamarine to blue)
      const s = 60 + (val % 10);
      const l = Math.max(30, Math.min(85, 62 + grainNoise + (val % 8)));
      return hslToABGR(h, s, l);
    } 
    else if (variant === 'Neon Sand') {
      const h = (val * 2) % 360; // full rainbow spectrum
      const s = 70;
      const l = Math.max(30, Math.min(90, 65 + grainNoise));
      return hslToABGR(h, s, l);
    } 
    else {
      // Volcanic Ash (deep grey charcoal + embers)
      const isEmber = (val % 9) < 2;
      if (isEmber) {
        const h = (val % 2 === 0) ? 12 : 32; // hot lava orange
        const s = 70;
        const l = Math.max(50, Math.min(90, 72 + grainNoise));
        return hslToABGR(h, s, l);
      } else {
        const h = 260 + (val % 25); // dark violet ash
        const s = 25 + (val % 10);
        const l = Math.max(10, Math.min(45, 26 + grainNoise));
        return hslToABGR(h, s, l);
      }
    }
  }

  function updatePhysics() {
    // Determine movement force shifts
    let forceSlideX = 0;
    if (shiftX > 0.15 && Math.random() < Math.min(0.85, shiftX * 0.25)) {
      forceSlideX = 1;
    } else if (shiftX < -0.15 && Math.random() < Math.min(0.85, -shiftX * 0.25)) {
      forceSlideX = -1;
    }

    let forceSlideY = 0;
    if (shiftY < -0.15 && Math.random() < Math.min(0.6, -shiftY * 0.2)) {
      forceSlideY = -1;
    } else if (shiftY > 0.15 && Math.random() < Math.min(0.6, shiftY * 0.2)) {
      forceSlideY = 1;
    }

    // Decelerate velocities
    shiftX *= 0.88;
    shiftY *= 0.88;

    const xIndices = Array.from({ length: COLS }, (_, i) => i);
    
    // Process bottom to top
    for (let y = ROWS - 2; y >= 0; y--) {
      if (Math.random() < 0.5) xIndices.reverse();

      for (let i = 0; i < COLS; i++) {
        const x = xIndices[i];
        const idx = y * COLS + x;
        const color = grid[idx];

        if (color !== 0) {
          // Apply inertial slosh upwards
          if (forceSlideY === -1 && y > 0 && grid[idx - COLS] === 0 && Math.random() < 0.4) {
            grid[idx - COLS] = color;
            grid[idx] = 0;
            continue;
          }

          // Apply inertial slosh sideways
          if (forceSlideX === 1 && x < COLS - 1 && grid[idx + 1] === 0) {
            grid[idx + 1] = color;
            grid[idx] = 0;
            continue;
          } else if (forceSlideX === -1 && x > 0 && grid[idx - 1] === 0) {
            grid[idx - 1] = color;
            grid[idx] = 0;
            continue;
          }

          const below = idx + COLS;
          
          // Straight down
          if (grid[below] === 0) {
            grid[below] = color;
            grid[idx] = 0;
          } else {
            // Slope slide down diagonals
            const belowL = below - 1;
            const belowR = below + 1;
            const leftEmpty = x > 0 && grid[belowL] === 0;
            const rightEmpty = x < COLS - 1 && grid[belowR] === 0;

            if (leftEmpty && rightEmpty) {
              const dir = Math.random() < 0.5 ? -1 : 1;
              grid[below + dir] = color;
              grid[idx] = 0;
            } else if (leftEmpty) {
              grid[belowL] = color;
              grid[idx] = 0;
            } else if (rightEmpty) {
              grid[belowR] = color;
              grid[idx] = 0;
            } else {
              // Cascade expansion (check up to 3 cells away horizontally)
              const below2L = below - 2;
              const below2R = below + 2;
              const below3L = below - 3;
              const below3R = below + 3;
              
              const left2Empty = x > 1 && grid[belowL] !== 0 && grid[below2L] === 0;
              const right2Empty = x < COLS - 2 && grid[belowR] !== 0 && grid[below2R] === 0;
              const left3Empty = x > 2 && grid[below2L] !== 0 && grid[below3L] === 0;
              const right3Empty = x < COLS - 3 && grid[below2R] !== 0 && grid[below3R] === 0;

              if (left3Empty && right3Empty) {
                const dir = Math.random() < 0.5 ? -3 : 3;
                grid[below + dir] = color;
                grid[idx] = 0;
              } else if (left3Empty) {
                grid[below3L] = color;
                grid[idx] = 0;
              } else if (right3Empty) {
                grid[below3R] = color;
                grid[idx] = 0;
              } else if (left2Empty && right2Empty) {
                const dir = Math.random() < 0.5 ? -2 : 2;
                grid[below + dir] = color;
                grid[idx] = 0;
              } else if (left2Empty) {
                grid[below2L] = color;
                grid[idx] = 0;
              } else if (right2Empty) {
                grid[below2R] = color;
                grid[idx] = 0;
              }
            }
          }
        }
      }
    }
  }

  function draw() {
    if (!active) return;

    // Pour sand at cursor
    if (mouse.active) {
      pourHue = (pourHue + 1.2) % 360;
      
      // Spawn a fine stream of grains
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          if (Math.random() < 0.35) {
            const sx = mouse.x + dx;
            const sy = mouse.y + dy;
            if (sx >= 0 && sx < COLS && sy >= 0 && sy < ROWS) {
              grid[sy * COLS + sx] = Math.round(pourHue) || 1;
            }
          }
        }
      }

      if (window.audioEngineInstance && Math.random() < 0.15) {
        window.audioEngineInstance.playInteractionTone();
      }
    }

    updatePhysics();
    drainBottom();

    // Fast rendering directly into the ABGR buffer32 array
    const bgABGR = 0xFF18080C; // background #0c0818 with alpha=FF in ABGR format
    buffer32.fill(bgABGR);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const val = grid[y * COLS + x];
        if (val !== 0) {
          const colorABGR = getSandColorABGR(val, x, y);
          
          // Draw a 2x2 canvas pixel block for each cell
          const px = x * 2;
          const py = y * 2;
          
          const idx00 = py * WIDTH + px;
          const idx01 = idx00 + 1;
          const idx10 = idx00 + WIDTH;
          const idx11 = idx10 + 1;
          
          buffer32[idx00] = colorABGR;
          buffer32[idx01] = colorABGR;
          buffer32[idx10] = colorABGR;
          buffer32[idx11] = colorABGR;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    onPhysicsUpdate(vx, vy, angle) {
      // Rotate screen-coordinate velocity back into local container space
      const rad = -angle * Math.PI / 180;
      const rx = vx * Math.cos(rad) - vy * Math.sin(rad);
      const ry = vx * Math.sin(rad) + vy * Math.cos(rad);
      
      // Accumulate forces (opposite direction of motion for physical feel)
      shiftX = -rx * 0.15;
      shiftY = -ry * 0.15;
    },
    destroy() {
      active = false;
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.remove();
    }
  };
}
