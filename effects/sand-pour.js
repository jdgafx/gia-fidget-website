// effects/sand-pour.js — Cellular automata falling sand simulator in Canvas2D

export function mountSandPour(container, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let active = true;

  const WIDTH = 180;
  const HEIGHT = 180;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Sand grid configuration
  const COLS = 60;
  const ROWS = 60;
  const CELL_W = WIDTH / COLS;
  const CELL_H = HEIGHT / ROWS;

  // Grid containing HSL color strings or null
  let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  const sandColors = [
    'hsl(16, 85%, 80%)',  // peach
    'hsl(265, 70%, 82%)', // lavender
    'hsl(144, 60%, 80%)', // mint
    'hsl(208, 80%, 82%)'  // sky
  ];

  let currentHueIndex = 0;

  let mouse = { x: 30, y: 5, active: false };

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
    currentHueIndex = (currentHueIndex + 1) % sandColors.length;
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

  // Clear bottom row slowly to make the sand flow infinitely
  function drainSand() {
    for (let x = 0; x < COLS; x++) {
      if (Math.random() < 0.08) {
        grid[ROWS - 1][x] = null;
      }
    }
  }

  function updatePhysics() {
    // Traverse from bottom to top to calculate falling sand
    for (let y = ROWS - 2; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        const color = grid[y][x];
        if (color) {
          // Check straight down
          if (!grid[y + 1][x]) {
            grid[y + 1][x] = color;
            grid[y][x] = null;
          } else {
            // Check diagonal left and right
            const leftEmpty = x > 0 && !grid[y + 1][x - 1];
            const rightEmpty = x < COLS - 1 && !grid[y + 1][x + 1];

            if (leftEmpty && rightEmpty) {
              const dir = Math.random() < 0.5 ? -1 : 1;
              grid[y + 1][x + dir] = color;
              grid[y][x] = null;
            } else if (leftEmpty) {
              grid[y + 1][x - 1] = color;
              grid[y][x] = null;
            } else if (rightEmpty) {
              grid[y + 1][x + 1] = color;
              grid[y][x] = null;
            }
          }
        }
      }
    }
  }

  function draw() {
    if (!active) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Background
    ctx.fillStyle = 'rgba(15, 10, 30, 0.95)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Spawn new sand at pointer
    if (mouse.active) {
      const color = sandColors[currentHueIndex];
      // Spawn a tiny cluster
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.random() < 0.6) {
            const sx = mouse.x + dx;
            const sy = mouse.y + dy;
            if (sx >= 0 && sx < COLS && sy >= 0 && sy < ROWS) {
              grid[sy][sx] = color;
            }
          }
        }
      }
      
      if (window.audioEngineInstance && Math.random() < 0.1) {
        window.audioEngineInstance.playInteractionTone();
      }
    }

    updatePhysics();
    drainSand();

    // Render cells
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const color = grid[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL_W, y * CELL_H, CELL_W + 0.5, CELL_H + 0.5); // +0.5 to avoid gaps
        }
      }
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
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
