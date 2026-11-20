// Animated film grain + occasional scratch lines, drawn at low res and upscaled.
let intensity = 0.6;
export function setGrainIntensity(v: number) {
  intensity = Math.max(0, Math.min(1.4, v));
  const c = document.getElementById('grain') as HTMLCanvasElement | null;
  if (c) c.style.opacity = String(0.04 + intensity * 0.11);
}

export function startGrain(canvas: HTMLCanvasElement) {
  const W = 200;
  const H = 120;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = 0;
  const frame = (t: number) => {
    if (t - last > 1000 / 24) {
      last = t;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (Math.random() < 0.08 * intensity) {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.fillRect((Math.random() * W) | 0, 0, 1, H);
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
