// Ambient particle layer over the board. One canvas, ~60 particles, per-location style.
type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number };

let stopPrev: (() => void) | null = null;

export function startParticles(canvas: HTMLCanvasElement, style: string, finale: () => boolean) {
  stopPrev?.();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  let W = 0;
  let H = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(1, Math.round(r.width));
    H = canvas.height = Math.max(1, Math.round(r.height));
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const spawn = (fresh = false): P => {
    const f = finale();
    if (f) return { x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 0.4, vy: -0.4 - Math.random() * 0.8, r: 1 + Math.random() * 1.8, a: 0, life: 1 };
    switch (style) {
      case 'coast': // salt drizzle, slanted
        return { x: Math.random() * (W + 200), y: fresh ? Math.random() * H : -10, vx: -1.2, vy: 3 + Math.random() * 2, r: 0.8, a: 0, life: 1 };
      case 'snow': // heavy wind-blown snow
        return { x: Math.random() * (W + 300) - 100, y: fresh ? Math.random() * H : -10, vx: -0.8 - Math.random() * 1.2, vy: 1 + Math.random() * 1.6, r: 0.8 + Math.random() * 2, a: 0, life: 1 };
      case 'radio': // prairie rain, near-vertical
        return { x: Math.random() * (W + 100), y: fresh ? Math.random() * H : -10, vx: -0.4, vy: 6 + Math.random() * 3, r: 0.8, a: 0, life: 1 };
      case 'hospital': // slow dust motes in the light
        return { x: Math.random() * W, y: fresh ? Math.random() * H : Math.random() * H, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, r: 0.6 + Math.random() * 1.2, a: 0, life: 1 };
      case 'camp': // fireflies blinking low over the grass
        return { x: Math.random() * W, y: fresh ? Math.random() * H : H * (0.45 + Math.random() * 0.5), vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2, r: 1 + Math.random() * 1.2, a: 0, life: 1 };
      case 'mall': // snow drifting down past the skylight
        return { x: Math.random() * W, y: fresh ? Math.random() * H : -10, vx: (Math.random() - 0.5) * 0.2, vy: 0.4 + Math.random() * 0.5, r: 0.8 + Math.random() * 1.4, a: 0, life: 1 };
      case 'motel': // desert dust on the wind
        return { x: fresh ? Math.random() * W : -10, y: Math.random() * H, vx: 1.2 + Math.random() * 1.4, vy: (Math.random() - 0.5) * 0.4, r: 0.5 + Math.random() * 1, a: 0, life: 1 };
      case 'rink': // glitter from the mirror ball
        return { x: Math.random() * W, y: fresh ? Math.random() * H : -10, vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.6, r: 0.6 + Math.random() * 1.6, a: 0, life: 1 };
      case 'farm': // chaff and seed fluff drifting across the corn
        return { x: fresh ? Math.random() * W : W + 10, y: Math.random() * H, vx: -0.4 - Math.random() * 0.6, vy: -0.05 + Math.random() * 0.15, r: 0.7 + Math.random() * 1.3, a: 0, life: 1 };
      default: // drive-in: moths & dust drifting toward the screen beam
        return { x: Math.random() * W, y: fresh ? Math.random() * H : H * (0.3 + Math.random() * 0.6), vx: 0.1 + Math.random() * 0.3, vy: -0.1 - Math.random() * 0.2, r: 0.6 + Math.random() * 1.4, a: 0, life: 1 };
    }
  };
  const ps: P[] = Array.from({ length: 70 }, () => spawn(true));
  let raf = 0;
  let t = 0;
  const tick = () => {
    t++;
    ctx.clearRect(0, 0, W, H);
    const f = finale();
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.x += p.vx + (style === 'drivein' && !f ? Math.sin((t + i * 40) / 30) * 0.3 : 0);
      p.y += p.vy;
      p.a = Math.min(1, p.a + 0.02);
      if (style === 'hospital' && !f) p.life -= 0.002;
      if (p.y < -20 || p.y > H + 20 || p.x < -220 || p.x > W + 220 || p.life <= 0) ps[i] = spawn();
      if (f) {
        ctx.fillStyle = `rgba(255,${80 + ((i * 37) % 80)},60,${0.7 * p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === 'snow') {
        p.vx += Math.sin((t + i * 31) / 40) * 0.02;
        ctx.fillStyle = `rgba(240,248,255,${0.75 * p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === 'coast' || style === 'radio') {
        ctx.strokeStyle = `rgba(190,230,230,${0.25 * p.a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
        ctx.stroke();
      } else if (style === 'camp' || style === 'rink') {
        // Fireflies blink slowly; glitter flashes in the colours of the rig.
        const tw = Math.max(0, Math.sin((t + i * 47) / (style === 'camp' ? 22 : 6)));
        ctx.fillStyle = style === 'camp' ? `rgba(210,255,120,${0.8 * p.a * tw})` : `hsla(${(i * 47 + t) % 360},90%,80%,${0.7 * p.a * tw})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === 'motel' || style === 'farm' || style === 'mall') {
        ctx.fillStyle = style === 'motel' ? `rgba(230,190,140,${0.35 * p.a})` : style === 'farm' ? `rgba(255,230,160,${0.4 * p.a})` : `rgba(230,245,255,${0.6 * p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const tw = style === 'hospital' ? 0.35 : 0.5 + 0.5 * Math.sin((t + i * 13) / 9);
        ctx.fillStyle = style === 'hospital' ? `rgba(200,255,225,${0.35 * p.a * p.life * tw})` : `rgba(255,240,200,${0.45 * p.a * tw})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (canvas.isConnected) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  stopPrev = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
