// Original procedural SVG art for LAST LIGHT. Everything is drawn in code:
// silhouettes, rim light, film grain filters. No external image assets.
import type { HeroineDef, LocationPack, PortraitLook } from '../engine/types';

let gid = 0;
const uid = (p: string) => `${p}${++gid}`;

// ── Heroine portrait ────────────────────────────────────────────────────────
function hairBack(style: PortraitLook['hairStyle'], c: string) {
  switch (style) {
    case 'long':
      return `<path d="M58 78 C52 40 148 40 142 78 L152 190 L48 190 Z" fill="${c}"/>`;
    case 'ponytail':
      return `<path d="M128 70 C160 74 168 120 150 168 C146 128 138 104 124 92 Z" fill="${c}"/>`;
    case 'curls':
      return `<g fill="${c}">${[
        [64, 70], [80, 50], [100, 44], [120, 50], [136, 70], [142, 94], [58, 94], [62, 118], [138, 118],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20"/>`)
        .join('')}</g>`;
    case 'bob':
      return `<path d="M60 84 C56 42 144 42 140 84 L144 128 C130 132 70 132 56 128 Z" fill="${c}"/>`;
    case 'pixie':
      return '';
  }
}
function hairFront(style: PortraitLook['hairStyle'], c: string) {
  switch (style) {
    case 'pixie':
      return `<path d="M66 82 C62 46 138 40 136 80 C124 66 100 60 84 70 C78 74 72 78 66 82 Z" fill="${c}"/>`;
    case 'bob':
      return `<path d="M66 80 C70 52 130 50 134 80 C116 70 92 66 66 80 Z" fill="${c}"/>`;
    case 'curls':
      return `<path d="M70 76 C76 56 124 56 130 76 C112 66 88 66 70 76 Z" fill="${c}"/>`;
    default:
      return `<path d="M68 82 C70 50 130 48 132 80 C120 64 96 62 68 82 Z" fill="${c}"/>`;
  }
}
function prop(p: PortraitLook['prop'], accent: string) {
  switch (p) {
    case 'apron':
      return `<path d="M78 170 L122 170 L126 200 L74 200 Z" fill="#f5efe6" opacity=".85"/><rect x="92" y="176" width="16" height="8" rx="2" fill="${accent}"/>`;
    case 'ticket':
      return `<g transform="rotate(-12 130 175)"><rect x="112" y="162" width="40" height="20" rx="2" fill="${accent}"/><circle cx="112" cy="172" r="4" fill="#111"/><circle cx="152" cy="172" r="4" fill="#111"/></g>`;
    case 'wrench':
      return `<g transform="rotate(30 140 170)"><rect x="136" y="140" width="8" height="50" rx="3" fill="#9aa"/><circle cx="140" cy="140" r="10" fill="#9aa"/><rect x="136" y="128" width="8" height="10" fill="#111"/></g>`;
    case 'whistle':
      return `<path d="M88 132 Q100 170 112 132" fill="none" stroke="${accent}" stroke-width="2"/><rect x="96" y="164" width="14" height="9" rx="4" fill="#ddd"/>`;
    case 'camera':
      return `<rect x="70" y="160" width="60" height="34" rx="4" fill="#222"/><circle cx="100" cy="177" r="12" fill="#111" stroke="${accent}" stroke-width="2"/><circle cx="100" cy="177" r="5" fill="${accent}" opacity=".6"/>`;
  }
}

export function heroinePortrait(h: HeroineDef, opts: { grim?: number } = {}): string {
  const l = h.look;
  const rim = uid('rim');
  const bg = uid('bg');
  const grim = Math.min(1, opts.grim ?? 0);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait" role="img" aria-label="${h.name}">
  <defs>
    <radialGradient id="${bg}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${l.accent}" stop-opacity=".55"/><stop offset=".55" stop-color="#140d1c"/><stop offset="1" stop-color="#050307"/></radialGradient>
    <linearGradient id="${rim}" x1="0" x2="1"><stop offset="0" stop-color="${l.accent}"/><stop offset=".35" stop-color="${l.skin}"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${bg})"/>
  ${hairBack(l.hairStyle, l.hair)}
  <path d="M40 200 C44 160 70 146 100 146 C130 146 156 160 160 200 Z" fill="#17121c" stroke="${l.accent}" stroke-opacity=".6" stroke-width="2"/>
  <rect x="88" y="118" width="24" height="34" fill="${l.skin}"/>
  <rect x="88" y="118" width="24" height="34" fill="#000" opacity=".35"/>
  <ellipse cx="100" cy="92" rx="34" ry="42" fill="url(#${rim})"/>
  <g fill="#120a0a"><ellipse cx="87" cy="92" rx="4.5" ry="${3 + grim * 1.5}"/><ellipse cx="113" cy="92" rx="4.5" ry="${3 + grim * 1.5}"/></g>
  <path d="M86 84 Q87 ${81 - grim * 3} 93 83" stroke="#120a0a" stroke-width="2" fill="none"/><path d="M107 83 Q113 ${81 - grim * 3} 114 84" stroke="#120a0a" stroke-width="2" fill="none"/>
  <path d="M90 116 Q100 ${grim > 0.5 ? 112 : 120} 110 116" stroke="#4a1f1f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  ${grim > 0.4 ? `<path d="M118 102 l3 12" stroke="#8a0f1f" stroke-width="2" opacity="${grim}"/>` : ''}
  ${hairFront(l.hairStyle, l.hair)}
  ${prop(l.prop, l.accent)}
</svg>`;
}

// ── Killer portrait: The Projectionist (original design) ────────────────────
export function killerPortrait(state: { finale?: boolean } = {}): string {
  const g = uid('kg');
  const beam = uid('kb');
  const eye = state.finale ? '#ff2244' : '#ffe9b0';
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait killer" role="img" aria-label="The Projectionist">
  <defs>
    <radialGradient id="${g}" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="${state.finale ? '#5a0010' : '#2a2f45'}"/><stop offset="1" stop-color="#030305"/></radialGradient>
    <linearGradient id="${beam}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d0" stop-opacity=".45"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${g})"/>
  <path d="M0 0 L120 0 L200 140 L200 200 Z" fill="url(#${beam})"/>
  <path d="M26 200 C30 150 60 130 100 130 C140 130 170 150 174 200 Z" fill="#0c0b0e"/>
  <path d="M70 140 L100 200 L130 140" fill="#3b2a1e"/>
  <path d="M84 150 L116 150 L112 200 L88 200 Z" fill="#5b4632" opacity=".7"/>
  <circle cx="100" cy="80" r="50" fill="#5d6068"/>
  <circle cx="100" cy="80" r="50" fill="none" stroke="#2c2e33" stroke-width="5"/>
  <circle cx="100" cy="80" r="40" fill="none" stroke="#7a7e88" stroke-width="1.5" opacity=".6"/>
  <circle cx="100" cy="80" r="11" fill="#1c1d21"/>
  ${[0, 72, 144, 216, 288]
    .map((a) => {
      const r = (a - 90) * (Math.PI / 180);
      const x = 100 + Math.cos(r) * 27;
      const y = 80 + Math.sin(r) * 27;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#0a0a0c"/>`;
    })
    .join('')}
  <circle cx="86" cy="73" r="2.6" fill="${eye}"><animate attributeName="opacity" values="1;.3;1" dur="3.2s" repeatCount="indefinite"/></circle>
  <circle cx="114" cy="73" r="2.6" fill="${eye}"><animate attributeName="opacity" values="1;.3;1" dur="3.2s" repeatCount="indefinite"/></circle>
  <path d="M62 112 C72 124 128 124 138 112" stroke="#1d1e22" stroke-width="3" fill="none"/>
  <g transform="rotate(-24 160 160)"><path d="M150 120 L160 186 L156 186 Z" fill="#c8ccd4"/><path d="M164 120 L160 186 L166 186 Z" fill="#9ea3ad"/><circle cx="153" cy="192" r="7" fill="none" stroke="#c8ccd4" stroke-width="3"/><circle cx="167" cy="192" r="7" fill="none" stroke="#c8ccd4" stroke-width="3"/></g>
  ${state.finale ? '<path d="M40 60 L60 64 M150 50 L170 58" stroke="#ff2244" stroke-width="1.5" opacity=".7"/>' : ''}
</svg>`;
}

// ── Node icons ──────────────────────────────────────────────────────────────
export function icon(key: string, color = '#d9d3c7'): string {
  const s = `fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  const f = `fill="${color}"`;
  const paths: Record<string, string> = {
    ticket: `<path ${s} d="M6 26 L6 12 L18 6 L30 12 L30 26"/><rect ${s} x="11" y="15" width="14" height="8"/><path ${s} d="M2 30 H34"/><path ${s} d="M30 22 L42 22"/>`,
    shed: `<path ${s} d="M4 18 L18 6 L32 18"/><path ${s} d="M8 16 V32 H28 V16"/><path ${s} d="M15 32 V22 H21 V32"/>`,
    car: `<path ${s} d="M4 24 L8 15 Q10 12 14 12 H24 Q28 12 30 15 L34 24 V29 H4 Z"/><circle ${s} cx="11" cy="29" r="3"/><circle ${s} cx="27" cy="29" r="3"/>`,
    door: `<rect ${s} x="10" y="4" width="18" height="28" rx="1"/><circle ${f} cx="24" cy="19" r="1.6"/><path ${s} d="M6 32 H32"/>`,
    popcorn: `<path ${s} d="M10 14 L13 32 H25 L28 14 Z"/><path ${s} d="M15 14 V32 M23 14 V32"/><path ${s} d="M10 14 Q8 8 13 8 Q14 3 19 5 Q23 2 26 7 Q31 8 28 14"/>`,
    projector: `<rect ${s} x="4" y="16" width="18" height="12" rx="2"/><circle ${s} cx="9" cy="10" r="5"/><circle ${s} cx="19" cy="10" r="5"/><path ${s} d="M22 19 L34 14 M22 25 L34 30"/>`,
    swing: `<path ${s} d="M4 32 L10 6 H28 L34 32"/><path ${s} d="M16 6 V24 M22 6 V24"/><path ${s} d="M14 24 H24"/>`,
    screen: `<rect ${s} x="3" y="5" width="32" height="18"/><path ${s} d="M10 23 V33 M28 23 V33 M10 28 H28"/>`,
    pine: `<path ${s} d="M19 3 L29 17 H24 L32 28 H6 L14 17 H9 Z"/><path ${s} d="M19 28 V34"/>`,
    wreck: `<path ${s} d="M4 28 L8 18 L16 16 L22 20 L32 18 L34 28 Z"/><circle ${s} cx="11" cy="29" r="3"/><path ${s} d="M24 10 L28 6 M30 12 L34 10"/>`,
  };
  return `<svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" class="icon">${paths[key] ?? paths.door}</svg>`;
}

// ── Map backdrop: the lot at night ──────────────────────────────────────────
export function mapBackdrop(loc: LocationPack, finale: boolean): string {
  const sky = uid('sky');
  const glow = uid('glow');
  const fog = uid('fog');
  const lot = uid('lot');
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(r() * 1000).toFixed(0)}" cy="${(r() * 220).toFixed(0)}" r="${(r() * 1.3 + 0.3).toFixed(2)}" fill="#fff" opacity="${(r() * 0.6 + 0.2).toFixed(2)}"/>`).join('');
  const pines = (y: number, h: number, n: number, col: string) =>
    Array.from({ length: n }, (_, i) => {
      const x = (i / n) * 1040 - 20 + r() * 20;
      const hh = h * (0.7 + r() * 0.6);
      return `<path d="M${x} ${y} L${x + 14} ${y - hh} L${x + 28} ${y} Z" fill="${col}"/>`;
    }).join('');
  const cars = (y: number, x0: number, x1: number) =>
    Array.from({ length: Math.floor((x1 - x0) / 46) }, (_, i) => {
      const x = x0 + i * 46 + r() * 8;
      return `<path d="M${x} ${y} l4 -10 q2 -4 7 -4 h14 q5 0 7 4 l4 10 z" fill="#0d1020" stroke="#232845" stroke-width="1"/><line x1="${x + 18}" y1="${y - 26}" x2="${x + 18}" y2="${y - 6}" stroke="#2b3050" stroke-width="1.4"/>`;
    }).join('');
  const screenCol = finale ? '#ff3355' : loc.palette.glow;
  return `<svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="backdrop">
  <defs>
    <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03040b"/><stop offset=".45" stop-color="${loc.palette.sky}"/><stop offset="1" stop-color="#121018"/></linearGradient>
    <radialGradient id="${glow}" cx="78%" cy="18%" r="45%"><stop offset="0" stop-color="${screenCol}" stop-opacity=".35"/><stop offset="1" stop-color="${screenCol}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${lot}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14131c"/><stop offset="1" stop-color="#0a090e"/></linearGradient>
    <filter id="${fog}"><feTurbulence type="fractalNoise" baseFrequency=".008 .03" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .75  0 0 0 0 .8  0 0 0 0 .9  0 0 0 .55 -.18"/></filter>
  </defs>
  <rect width="1000" height="640" fill="url(#${sky})"/>
  ${stars}
  <circle cx="140" cy="70" r="26" fill="#f4ecd2" opacity=".85"/><circle cx="152" cy="64" r="24" fill="${loc.palette.sky}" opacity=".9"/>
  ${pines(250, 110, 40, '#070913')}
  <rect y="230" width="1000" height="410" fill="url(#${lot})"/>
  <rect width="1000" height="640" fill="url(#${glow})"/>
  <g class="bigscreen"><rect x="700" y="40" width="210" height="110" fill="${screenCol}" opacity=".18"/><rect x="700" y="40" width="210" height="110" fill="none" stroke="${screenCol}" stroke-opacity=".5"/>
  <path d="M690 150 V230 M920 150 V230" stroke="#1a1d2c" stroke-width="6"/></g>
  <path d="M628 300 L700 40 L910 40 Z" fill="#fff6d0" opacity=".045" class="beam"/>
  ${cars(420, 230, 420)}${cars(560, 220, 420)}${cars(460, 470, 660)}${cars(590, 470, 680)}
  ${pines(640, 90, 22, '#05060c')}
  <rect width="1000" height="640" filter="url(#${fog})" class="fog" opacity=".55"/>
</svg>`;
}

// ── Card backs / dice ───────────────────────────────────────────────────────
export function pip(face: number): string {
  const spots: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
  };
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${spots[face].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</svg>`;
}

export function victimIcon(): string {
  return `<svg viewBox="0 0 20 30" xmlns="http://www.w3.org/2000/svg" class="victim"><circle cx="10" cy="7" r="5"/><path d="M3 30 L5 14 Q10 11 15 14 L17 30 Z"/></svg>`;
}
