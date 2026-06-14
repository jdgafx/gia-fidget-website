// ambient/background.js — Performant, low-res noise-warped fluid background

export function mountBackground(canvas) {
  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let lastTime = 0;
  let phase = 0;
  let active = true;

  // Tiny internal resolution for fluid performance, upscaled by CSS
  const WIDTH = 48;
  const HEIGHT = 36;
  
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: -2;
    pointer-events: none;
    filter: blur(50px);
    opacity: 0.85;
    transform: scale(1.15); /* avoids white edges from blur */
  `;

  // Calm hope palette colors (pastels)
  // Peach: HSL(16, 100%, 92%), Lavender: HSL(265, 56%, 91%), Mint: HSL(144, 50%, 88%), Sky: HSL(208, 86%, 92%)
  const color1 = { h: 16, s: 100, l: 92 };
  const color2 = { h: 265, s: 56, l: 91 };
  const color3 = { h: 144, s: 50, l: 88 };
  const color4 = { h: 208, s: 86, l: 92 };

  function draw(time) {
    if (!active) return;
    
    // Slow breath-rhythm time scaling (8s period)
    const dt = (time - lastTime) / 1000 || 0;
    lastTime = time;
    phase += dt * (2 * Math.PI / 8.0);

    const imgData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imgData.data;

    // Slow drifting offsets
    const cosP = Math.cos(phase);
    const sinP = Math.sin(phase);

    for (let y = 0; y < HEIGHT; y++) {
      const ny = y / HEIGHT - 0.5;
      for (let x = 0; x < WIDTH; x++) {
        const nx = x / WIDTH - 0.5;

        // FBM domain warping using multiple sine fields
        const n1 = Math.sin(nx * 3.5 + cosP * 0.8) * Math.cos(ny * 3.5 + sinP * 0.8);
        const n2 = Math.sin(nx * 6.0 - sinP * 1.2 + n1 * 1.5) * Math.cos(ny * 5.0 + cosP * 1.0 + n1 * 1.5);
        const factor = (n2 + 1.0) / 2.0; // clamp to 0..1

        // Interpolate colors based on noise factor
        let h, s, l;
        if (factor < 0.33) {
          const t = factor / 0.33;
          h = color1.h + (color2.h - color1.h) * t;
          s = color1.s + (color2.s - color1.s) * t;
          l = color1.l + (color2.l - color1.l) * t;
        } else if (factor < 0.66) {
          const t = (factor - 0.33) / 0.33;
          h = color2.h + (color3.h - color2.h) * t;
          s = color2.s + (color3.s - color2.s) * t;
          l = color2.l + (color3.l - color2.l) * t;
        } else {
          const t = (factor - 0.66) / 0.34;
          h = color3.h + (color4.h - color3.h) * t;
          s = color3.s + (color4.s - color3.s) * t;
          l = color3.l + (color4.l - color3.l) * t;
        }

        // Convert HSL to RGB inside canvas data
        const rgb = hslToRgb(h, s, l);
        const idx = (y * WIDTH + x) * 4;
        data[idx] = rgb[0];
        data[idx + 1] = rgb[1];
        data[idx + 2] = rgb[2];
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    animationFrameId = requestAnimationFrame(draw);
  }

  // HSL helper (inline to stay modular and dependency-free)
  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  animationFrameId = requestAnimationFrame(draw);

  return {
    destroy() {
      active = false;
      cancelAnimationFrame(animationFrameId);
    }
  };
}
