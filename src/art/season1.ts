// LAST LIGHT — art for Features Four & Five: The Snowblind, The Caller,
// Kettle Peak Lodge and the KXRL hilltop. All original designs.
import type { LocationPack } from '../engine/types';

let n = 0;
const id = (p: string) => `${p}-${++n}`;

// ── The Snowblind: frosted patrol parka, rimed goggles, probe & ice axe ─────
export function snowblindPortrait(state: { finale?: boolean }): string {
  const [bg, frost] = [id('sbbg'), id('sbfr')];
  const lens = state.finale ? '#ff3355' : '#eef6ff';
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait killer" role="img" aria-label="The Snowblind">
  <defs>
    <radialGradient id="${bg}" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="${state.finale ? '#3a0a14' : '#2a3a52'}"/><stop offset="1" stop-color="#03060b"/></radialGradient>
    <linearGradient id="${frost}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="${lens}"/><stop offset="1" stop-color="#9fb4cc"/></linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${bg})"/>
  ${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 67) % 200}" cy="${(i * 41) % 200}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity=".55"><animateTransform attributeName="transform" type="translate" values="0 -20;-6 200" dur="${5 + (i % 5)}s" begin="-${i % 7}s" repeatCount="indefinite"/></circle>`).join('')}
  <path d="M24 200 C28 148 60 126 100 126 C140 126 172 148 176 200 Z" fill="#1f2c3e"/>
  <path d="M60 140 L100 200 L140 140" fill="none" stroke="#141d2a" stroke-width="3"/>
  <rect x="118" y="160" width="22" height="12" rx="2" fill="#e07a1f"/><path d="M125 166 h8 M129 162 v8" stroke="#1f2c3e" stroke-width="2"/>
  <path d="M62 132 Q100 150 138 132 L134 152 Q100 166 66 152 Z" fill="#6b7f96"/>
  ${[72, 86, 100, 114, 128].map((x, i) => `<path d="M${x} ${150 + (i % 2) * 3} l2 ${8 + (i % 3) * 3} l2 -${8 + (i % 3) * 3}" fill="#e6f2ff" opacity=".85"/>`).join('')}
  <path d="M44 120 C36 40 164 40 156 120 C150 140 130 150 100 150 C70 150 50 140 44 120 Z" fill="#2a3a52"/>
  <path d="M44 120 C36 40 164 40 156 120" fill="none" stroke="#cfc6b6" stroke-width="14" stroke-linecap="round"/>
  ${Array.from({ length: 18 }, (_, i) => { const a = Math.PI * (1 + i / 17); return `<path d="M${100 + Math.cos(a) * 56} ${106 + Math.sin(a) * 58} l${Math.cos(a) * 8} ${Math.sin(a) * 8}" stroke="#ece4d6" stroke-width="2"/>`; }).join('')}
  <ellipse cx="100" cy="110" rx="38" ry="36" fill="#121418"/>
  <path d="M64 102 H136" stroke="#2b2f36" stroke-width="7"/>
  ${[82, 118].map((x) => `<circle cx="${x}" cy="102" r="15" fill="url(#${frost})" stroke="#3a3f48" stroke-width="4"/><path d="M${x - 8} ${96} l6 5 l-3 7 M${x + 3} ${94} l3 6 l6 2" stroke="#9fb4cc" stroke-width="1.2" fill="none"/>`).join('')}
  <path d="M100 98 v8" stroke="#3a3f48" stroke-width="4"/>
  <path d="M78 126 Q100 134 122 126" stroke="#2a2d33" stroke-width="3" fill="none"/>
  <g transform="rotate(-18 40 160)"><rect x="36" y="80" width="5" height="120" fill="#c8ccd2"/><circle cx="38.5" cy="80" r="4" fill="#c8ccd2"/></g>
  <g transform="rotate(22 162 150)"><rect x="158" y="112" width="7" height="88" rx="2" fill="#2c3a4a"/><path d="M146 114 Q162 100 182 108 L178 116 Q164 112 152 120 Z" fill="#b9c2cc"/></g>
  ${state.finale ? '<path d="M64 100 l24 16 M118 98 l14 20" stroke="#ff3355" stroke-width="2"/>' : ''}
</svg>`;
}

// ── The Caller: rain slicker, perforated chrome mic-grille mask, coiled cord ─
export function callerPortrait(state: { finale?: boolean }): string {
  const [bg, chrome, rim] = [id('cbg'), id('cchr'), id('crim')];
  const glow = state.finale ? '#ff3355' : '#ff5ab4';
  const holes: string[] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const x = 72 + c * 7 + (r % 2) * 3.5;
      const y = 72 + r * 7;
      if ((x - 100) ** 2 / 30 ** 2 + (y - 100) ** 2 / 32 ** 2 < 1) holes.push(`<circle cx="${x}" cy="${y}" r="1.7" fill="#0a0a0c"/>`);
    }
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait killer" role="img" aria-label="The Caller">
  <defs>
    <radialGradient id="${bg}" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="${state.finale ? '#40060f' : '#2a1030'}"/><stop offset="1" stop-color="#040205"/></radialGradient>
    <linearGradient id="${chrome}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f6"/><stop offset=".45" stop-color="#9da3ad"/><stop offset=".55" stop-color="#d9dde3"/><stop offset="1" stop-color="#5a5f68"/></linearGradient>
    <linearGradient id="${rim}" x1="0" x2="1"><stop offset="0" stop-color="${glow}" stop-opacity=".7"/><stop offset=".3" stop-color="${glow}" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${bg})"/>
  ${Array.from({ length: 22 }, (_, i) => `<path d="M${(i * 53) % 200} ${(i * 29) % 200} l-4 14" stroke="#c9b6d6" stroke-width="1" opacity=".35"><animateTransform attributeName="transform" type="translate" values="0 -30;-10 220" dur="${0.8 + (i % 4) * 0.2}s" begin="-${(i % 5) * 0.2}s" repeatCount="indefinite"/></path>`).join('')}
  <path d="M22 200 C26 146 58 120 100 120 C142 120 174 146 178 200 Z" fill="#c9a227"/>
  <path d="M22 200 C26 146 58 120 100 120 C142 120 174 146 178 200 Z" fill="url(#${rim})"/>
  <path d="M100 124 V200 M88 150 h-4 M88 170 h-4" stroke="#8a6d14" stroke-width="3"/>
  <path d="M48 120 C40 46 160 46 152 120 C148 132 136 140 124 142 L76 142 C64 140 52 132 48 120 Z" fill="#a8861c"/>
  <path d="M48 120 C40 46 160 46 152 120" fill="none" stroke="#6e5810" stroke-width="3"/>
  <ellipse cx="100" cy="100" rx="34" ry="38" fill="url(#${chrome})"/>
  <ellipse cx="100" cy="100" rx="34" ry="38" fill="none" stroke="#3a3d44" stroke-width="3"/>
  ${holes.join('')}
  <rect x="64" y="96" width="72" height="7" fill="#3a3d44"/><rect x="64" y="97" width="72" height="2" fill="#f4f4f6" opacity=".6"/>
  <circle cx="88" cy="86" r="2.4" fill="${glow}"><animate attributeName="opacity" values="1;.2;1" dur="2.6s" repeatCount="indefinite"/></circle>
  <circle cx="112" cy="86" r="2.4" fill="${glow}"><animate attributeName="opacity" values="1;.2;1" dur="2.6s" repeatCount="indefinite"/></circle>
  <path d="M40 182 ${Array.from({ length: 10 }, (_, i) => `q6 ${i % 2 ? 10 : -10} 12 0`).join(' ')}" stroke="#1d1d22" stroke-width="5" fill="none"/>
  <path d="M40 182 ${Array.from({ length: 10 }, (_, i) => `q6 ${i % 2 ? 10 : -10} 12 0`).join(' ')}" stroke="#3b3b44" stroke-width="2" fill="none"/>
  <ellipse cx="34" cy="182" rx="12" ry="10" fill="#d9b48f"/><ellipse cx="166" cy="182" rx="12" ry="10" fill="#d9b48f"/>
  ${state.finale ? '<path d="M70 70 L84 90 M130 72 L118 92" stroke="#ff3355" stroke-width="2"/>' : ''}
</svg>`;
}

// ── Kettle Peak backdrop: snowbound lodge under a storm ─────────────────────
export function snowBackdrop(loc: LocationPack, finale: boolean): string {
  const [sky, snow, glow, fog] = [id('ssky'), id('ssnow'), id('sglow'), id('sfog')];
  const warm = finale ? '#ff3355' : '#ffb35c';
  let seed = 23;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pines = (y: number, h: number, count: number, x0: number, x1: number, col: string) =>
    Array.from({ length: count }, () => {
      const x = x0 + r() * (x1 - x0);
      const hh = h * (0.6 + r() * 0.7);
      return `<path d="M${x} ${y} l${hh * 0.22} ${-hh} l${hh * 0.22} ${hh} z" fill="${col}"/><path d="M${x + hh * 0.1} ${y - hh * 0.55} l${hh * 0.12} ${-hh * 0.42} l${hh * 0.12} ${hh * 0.42} z" fill="#e8f0fa" opacity=".55"/>`;
    }).join('');
  return `<svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="backdrop">
  <defs>
    <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050912"/><stop offset=".6" stop-color="${loc.palette.sky}"/><stop offset="1" stop-color="#1a2436"/></linearGradient>
    <linearGradient id="${snow}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a62"/><stop offset="1" stop-color="#141c2a"/></linearGradient>
    <radialGradient id="${glow}" cx="40%" cy="52%" r="30%"><stop offset="0" stop-color="${warm}" stop-opacity=".35"/><stop offset="1" stop-color="${warm}" stop-opacity="0"/></radialGradient>
    <filter id="${fog}"><feTurbulence type="fractalNoise" baseFrequency=".004 .02" numOctaves="3" seed="12"/><feColorMatrix values="0 0 0 0 .9  0 0 0 0 .95  0 0 0 0 1  0 0 0 .7 -.22"/></filter>
  </defs>
  <rect width="1000" height="640" fill="url(#${sky})"/>
  <path d="M520 260 L700 40 L800 150 L880 70 L1000 220 L1000 300 L520 300 Z" fill="#26334a"/>
  <path d="M700 40 L740 90 L715 85 L700 100 L688 80 Z M880 70 L910 110 L890 104 Z" fill="#dfe8f4" opacity=".8"/>
  <path d="M700 40 L860 300" stroke="#dfe8f4" stroke-width="2" opacity=".25"/>
  <rect y="260" width="1000" height="380" fill="url(#${snow})"/>
  <path d="M0 270 Q250 240 500 268 T1000 262 L1000 290 L0 300 Z" fill="#4a5c78" opacity=".6"/>
  ${pines(300, 110, 26, 0, 1000, '#0b1220')}
  <g transform="translate(300 250)">
    <path d="M0 110 L0 40 L90 -10 L180 40 L180 110 Z" fill="#1c1410"/><path d="M-10 44 L90 -16 L190 44" stroke="#e8f0fa" stroke-width="10" fill="none" stroke-linecap="round"/>
    ${[20, 60, 120, 150].map((x) => `<rect x="${x}" y="60" width="18" height="22" fill="${warm}" opacity=".75"/>`).join('')}
    <rect x="80" y="70" width="22" height="40" fill="#2a1a10"/><rect x="138" y="-6" width="14" height="30" fill="#2a2420"/><path d="M145 -6 q-6 -14 4 -26 q-6 -10 2 -20" stroke="#9aa6b6" stroke-width="5" fill="none" opacity=".4"/>
  </g>
  <rect width="1000" height="640" fill="url(#${glow})"/>
  <path d="M640 300 L960 120" stroke="#2a2f3a" stroke-width="2"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${680 + i * 64} ${278 - i * 36} v18 h12 v-6" stroke="#2a2f3a" stroke-width="2" fill="none"/>`).join('')}
  <g transform="translate(880 130)"><rect x="-2" y="0" width="4" height="40" fill="#555"/><path d="M-12 -6 h24 l-4 10 h-16 z" fill="#888"/><circle cx="0" cy="-10" r="4" fill="${finale ? '#ff3355' : '#ffcc66'}"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></circle></g>
  ${pines(640, 120, 18, -20, 1020, '#060a14')}
  <rect width="1000" height="640" filter="url(#${fog})" class="fog" opacity=".7"/>
</svg>`;
}

// ── KXRL hilltop backdrop: studio, red-lit tower, prairie storm ─────────────
export function radioBackdrop(loc: LocationPack, finale: boolean): string {
  const [sky, ground, beacon, fog] = [id('rsky'), id('rgr'), id('rbe'), id('rfog')];
  const red = finale ? '#ff1133' : '#ff3355';
  return `<svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="backdrop">
  <defs>
    <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05030a"/><stop offset=".55" stop-color="${loc.palette.sky}"/><stop offset="1" stop-color="#2a1424"/></linearGradient>
    <linearGradient id="${ground}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1418"/><stop offset="1" stop-color="#08060a"/></linearGradient>
    <radialGradient id="${beacon}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${red}" stop-opacity=".9"/><stop offset="1" stop-color="${red}" stop-opacity="0"/></radialGradient>
    <filter id="${fog}"><feTurbulence type="fractalNoise" baseFrequency=".006 .03" numOctaves="2" seed="31"/><feColorMatrix values="0 0 0 0 .8  0 0 0 0 .6  0 0 0 0 .8  0 0 0 .4 -.12"/></filter>
  </defs>
  <rect width="1000" height="640" fill="url(#${sky})"/>
  <circle cx="160" cy="90" r="34" fill="#ffb066" opacity=".75"/>
  <path d="M120 0 L136 60 L118 64 L140 140" stroke="#efe4ff" stroke-width="2.5" fill="none" opacity="0"><animate attributeName="opacity" values="0;0;0;.9;0;0;0;0;0;0" dur="7s" repeatCount="indefinite"/></path>
  <path d="M0 330 Q200 300 420 310 Q620 260 1000 250 L1000 640 L0 640 Z" fill="url(#${ground})"/>
  ${Array.from({ length: 70 }, (_, i) => `<path d="M${(i * 137) % 1000} ${330 + ((i * 53) % 280)} q2 -10 0 -18" stroke="#3a2a30" stroke-width="1.4" fill="none"/>`).join('')}
  <g transform="translate(250 268)">
    <rect width="320" height="90" fill="#2a2228"/><rect y="-8" width="320" height="10" fill="#3a3038"/>
    ${[20, 70, 120].map((x) => `<rect x="${x}" y="22" width="34" height="22" fill="#ffd27a" opacity=".55"/>`).join('')}
    <rect x="200" y="20" width="90" height="26" fill="#140c10"/><text x="245" y="39" font-family="Oswald, sans-serif" font-size="16" text-anchor="middle" fill="${red}" letter-spacing="3">ON AIR<animate attributeName="opacity" values="1;1;.2;1" dur="3s" repeatCount="indefinite"/></text>
    <text x="10" y="-14" font-family="Creepster, fantasy" font-size="26" fill="#ffb3d9" opacity=".85">KXRL 1340</text>
  </g>
  <g transform="translate(880 30)" stroke="#5a4a52" stroke-width="2.5" fill="none">
    <path d="M-40 300 L0 0 L40 300"/>${Array.from({ length: 10 }, (_, i) => { const y = 30 + i * 27; const w = (y / 300) * 40; return `<path d="M${-w} ${y} L${w} ${y + 27} M${w} ${y} L${-w} ${y + 27}"/>`; }).join('')}
  </g>
  <circle cx="880" cy="30" r="22" fill="url(#${beacon})"><animate attributeName="opacity" values="1;.1;1" dur="2s" repeatCount="indefinite"/></circle>
  <circle cx="880" cy="30" r="5" fill="${red}"/>
  ${[1, 2, 3].map((i) => `<circle cx="880" cy="30" r="${i * 40}" fill="none" stroke="${red}" stroke-width="1" opacity="0"><animate attributeName="r" values="10;160" dur="3s" begin="${i}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0" dur="3s" begin="${i}s" repeatCount="indefinite"/></circle>`).join('')}
  <path d="M90 560 L200 440" stroke="#2a2228" stroke-width="3"/><rect x="190" y="420" width="22" height="36" fill="#2a3a5a"/><circle cx="201" cy="414" r="10" fill="#ffefaa" opacity=".25"/>
  <rect width="1000" height="640" filter="url(#${fog})" class="fog" opacity=".55"/>
</svg>`;
}

// ── Node icons for Kettle Peak & KXRL ───────────────────────────────────────
export const SEASON1_ICONS: Record<string, (s: string, f: string) => string> = {
  snowcat: (s) => `<path ${s} d="M4 24 V16 L10 10 H24 L30 16 V24 Z"/><rect ${s} x="2" y="24" width="34" height="8" rx="4"/><path ${s} d="M12 10 V16 H22"/>`,
  pot: (s) => `<path ${s} d="M6 16 H32 V28 Q32 32 28 32 H10 Q6 32 6 28 Z"/><path ${s} d="M4 16 H34 M14 10 q2 -4 0 -6 M22 10 q2 -4 0 -6"/>`,
  glass: (s) => `<path ${s} d="M10 6 H28 L22 20 V30 M16 30 H22 M22 20 L16 20 L10 6"/>`,
  hearth: (s, f) => `<path ${s} d="M4 34 V12 H34 V34"/><path ${s} d="M10 34 V20 H28 V34"/><path ${f} d="M19 22 Q24 28 19 32 Q14 28 19 22 Z"/>`,
  ski: (s) => `<path ${s} d="M8 34 L14 4 M14 34 L20 4"/><path ${s} d="M6 34 Q10 36 12 32 M12 34 Q16 36 18 32"/><path ${s} d="M26 6 V34 M24 30 H28"/>`,
  steam: (s) => `<path ${s} d="M6 34 H32"/><path ${s} d="M12 28 q-4 -6 0 -12 q4 -6 0 -12 M20 28 q-4 -6 0 -12 q4 -6 0 -12 M28 28 q-4 -6 0 -12 q4 -6 0 -12"/>`,
  ice: (s) => `<ellipse ${s} cx="19" cy="22" rx="15" ry="8"/><path ${s} d="M12 20 L18 24 L16 28 M24 18 L22 22 L28 24"/>`,
  chair: (s) => `<path ${s} d="M2 6 L36 14"/><path ${s} d="M18 10 V20"/><path ${s} d="M10 20 H26 V28 H10 Z M10 28 V32 M26 28 V32"/>`,
  peak: (s) => `<path ${s} d="M2 32 L14 12 L20 20 L26 8 L36 32 Z"/><path ${s} d="M26 8 L22 14 L30 14"/>`,
  payphone: (s) => `<rect ${s} x="10" y="4" width="18" height="30" rx="2"/><path ${s} d="M14 10 H24 M14 16 h2 M18 16 h2 M22 16 h2 M14 20 h2 M18 20 h2 M22 20 h2"/><path ${s} d="M8 12 q-4 8 2 16"/>`,
  mug: (s) => `<path ${s} d="M8 12 H26 V30 Q26 32 24 32 H10 Q8 32 8 30 Z"/><path ${s} d="M26 16 H30 Q34 16 34 21 Q34 26 30 26 H26"/>`,
  record: (s, f) => `<circle ${s} cx="19" cy="19" r="15"/><circle ${s} cx="19" cy="19" r="9" opacity=".5"/><circle ${f} cx="19" cy="19" r="3"/>`,
  mic: (s) => `<rect ${s} x="13" y="4" width="12" height="18" rx="6"/><path ${s} d="M8 18 Q8 28 19 28 Q30 28 30 18 M19 28 V34 M13 34 H25"/>`,
  dial: (s) => `<rect ${s} x="4" y="8" width="30" height="22" rx="2"/><path ${s} d="M10 24 Q19 12 28 24"/><path ${s} d="M19 24 L24 15"/>`,
  bolt: (_s, f) => `<path ${f} d="M22 2 L8 20 H18 L14 36 L30 14 H20 Z"/>`,
  tower: (s) => `<path ${s} d="M12 36 L19 4 L26 36"/><path ${s} d="M14 26 H24 M16 16 H22 M13 31 L24 22 M25 31 L15 22"/><circle ${s} cx="19" cy="4" r="2"/>`,
};
