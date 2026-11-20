// Original procedural SVG art for LAST LIGHT. Everything is drawn in code:
// silhouettes, rim light, film grain filters. No external image assets.
import type { HeroineDef, LocationPack, PortraitLook } from '../engine/types';
import { heroinePortraitV2 } from './portraits';
import { anesthetistPortrait, hospitalBackdrop, HOSPITAL_ICONS } from './scenes';

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

export function heroinePortrait(h: HeroineDef, opts: { grim?: number; hurt?: number } = {}): string {
  return heroinePortraitV2(h, opts);
}

/** v1 flat portrait, kept for the small board token. */
export function heroineToken(h: HeroineDef, opts: { grim?: number } = {}): string {
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

// ── Killer portraits ────────────────────────────────────────────────────────
export function killerPortrait(state: { finale?: boolean; art?: string } = {}): string {
  if (state.art === 'tidewife') return tidewifePortrait(state);
  if (state.art === 'anesthetist') return anesthetistPortrait(state);
  return projectionistPortrait(state);
}

// The Tidewife (original design): oilskin coat, salt-grey veil, storm lantern, gaff hook.
function tidewifePortrait(state: { finale?: boolean }): string {
  const g = uid('tg');
  const l = uid('tl');
  const lamp = state.finale ? '#ff3355' : '#ffd27a';
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait killer" role="img" aria-label="The Tidewife">
  <defs>
    <radialGradient id="${g}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${state.finale ? '#3a0a18' : '#12343a'}"/><stop offset="1" stop-color="#020607"/></radialGradient>
    <radialGradient id="${l}" cx="30%" cy="72%" r="40%"><stop offset="0" stop-color="${lamp}" stop-opacity=".55"/><stop offset="1" stop-color="${lamp}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${g})"/>
  <rect width="200" height="200" fill="url(#${l})"/>
  <path d="M30 200 C34 140 62 118 100 118 C138 118 166 140 170 200 Z" fill="#2c3a2a"/>
  <path d="M30 200 C34 140 62 118 100 118 C138 118 166 140 170 200 Z" fill="none" stroke="#5e7a5a" stroke-width="1.5" opacity=".6"/>
  <path d="M100 118 L92 200 M100 118 L108 200" stroke="#1b241a" stroke-width="2"/>
  <path d="M58 104 C56 40 144 40 142 104 C150 140 146 170 140 186 C120 170 80 170 60 186 C54 170 50 140 58 104 Z" fill="#cfd6d2" opacity=".82"/>
  <path d="M64 100 C62 50 138 50 136 100 C138 130 132 150 128 160 C110 150 90 150 72 160 C68 150 62 130 64 100 Z" fill="#0b1112"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${62 + i * 9} 60 Q${66 + i * 9} 120 ${60 + i * 10} 182" stroke="#e8eeea" stroke-width=".7" fill="none" opacity=".35"/>`).join('')}
  <circle cx="88" cy="96" r="2.4" fill="#bfe9e2" opacity=".8"><animate attributeName="opacity" values=".8;.2;.8" dur="4s" repeatCount="indefinite"/></circle>
  <circle cx="112" cy="96" r="2.4" fill="#bfe9e2" opacity=".8"><animate attributeName="opacity" values=".8;.2;.8" dur="4s" repeatCount="indefinite"/></circle>
  ${[70, 92, 120, 134].map((x, i) => `<path d="M${x} 170 q2 ${10 + i * 3} 0 ${16 + i * 4}" stroke="#7fb6b0" stroke-width="2" fill="none" opacity=".6"><animate attributeName="opacity" values=".6;0;.6" dur="${2 + i * 0.4}s" repeatCount="indefinite"/></path>`).join('')}
  <g transform="translate(36 140)"><path d="M10 0 L22 0 L24 6 L8 6 Z" fill="#222"/><rect x="6" y="6" width="20" height="26" rx="3" fill="${lamp}" opacity=".85"/><path d="M6 6 V32 M26 6 V32 M16 6 V32" stroke="#222" stroke-width="2"/><rect x="4" y="32" width="24" height="5" fill="#222"/><path d="M12 0 Q16 -12 20 0" fill="none" stroke="#222" stroke-width="2"/></g>
  <g transform="rotate(14 160 150)"><rect x="156" y="104" width="5" height="96" fill="#6b5236"/><path d="M158 104 C158 84 182 84 180 102 C179 110 172 110 170 104" fill="none" stroke="#a9b0b6" stroke-width="4" stroke-linecap="round"/></g>
</svg>`;
}

// The Projectionist (original design): film-canister mask, splicing shears.
function projectionistPortrait(state: { finale?: boolean } = {}): string {
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
    gate: `<path ${s} d="M4 32 V10 M34 32 V10"/><path ${s} d="M4 14 H34 M4 22 H34"/><path ${s} d="M10 14 L16 22 M22 14 L28 22"/>`,
    cabin: `<path ${s} d="M4 18 L19 6 L34 18"/><path ${s} d="M8 15 V32 H30 V15"/><rect ${s} x="12" y="20" width="6" height="6"/><path ${s} d="M22 32 V22 H27 V32"/>`,
    grass: `<path ${s} d="M6 34 Q8 20 4 8 M12 34 Q14 18 12 4 M19 34 Q19 16 22 6 M26 34 Q26 20 30 10 M32 34 Q31 24 35 16"/>`,
    hook: `<path ${s} d="M22 4 V22 Q22 32 14 32 Q6 32 6 24"/><path ${s} d="M6 24 L10 20"/><circle ${s} cx="22" cy="4" r="2"/>`,
    wave: `<path ${s} d="M2 16 Q8 8 14 16 T26 16 T38 16"/><path ${s} d="M2 26 Q8 18 14 26 T26 26 T38 26"/>`,
    boat: `<path ${s} d="M4 22 H34 L28 30 H10 Z"/><path ${s} d="M18 22 V4 L30 18 H18"/>`,
    lighthouse: `<path ${s} d="M14 34 L16 12 H22 L24 34 Z"/><rect ${s} x="15" y="6" width="8" height="6"/><path ${s} d="M23 9 L34 5 M23 9 L34 13"/><path ${s} d="M10 34 H28"/>`,
    dock: `<path ${s} d="M2 18 H36"/><path ${s} d="M6 18 V32 M14 18 V32 M22 18 V32 M30 18 V32"/><path ${s} d="M2 30 Q8 26 14 30 T26 30 T38 30"/>`,
    wreck: `<path ${s} d="M4 28 L8 18 L16 16 L22 20 L32 18 L34 28 Z"/><circle ${s} cx="11" cy="29" r="3"/><path ${s} d="M24 10 L28 6 M30 12 L34 10"/>`,
  };
  const extra = HOSPITAL_ICONS[key]?.(s, f);
  return `<svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" class="icon" style="color:${color}">${extra ?? paths[key] ?? paths.door}</svg>`;
}

// ── Map backdrop: the lot at night ──────────────────────────────────────────
export function mapBackdrop(loc: LocationPack, finale: boolean): string {
  if (loc.art === 'hospital') return hospitalBackdrop(loc, finale);
  return loc.art === 'coast' ? coastBackdrop(loc, finale) : driveInBackdrop(loc, finale);
}

function coastBackdrop(loc: LocationPack, finale: boolean): string {
  const sky = uid('csky');
  const sea = uid('csea');
  const fog = uid('cfog');
  const beam = uid('cbeam');
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 60 }, () => `<circle cx="${(r() * 1000).toFixed(0)}" cy="${(r() * 160).toFixed(0)}" r="${(r() * 1.2 + 0.3).toFixed(2)}" fill="#fff" opacity="${(r() * 0.5 + 0.2).toFixed(2)}"/>`).join('');
  const lamp = finale ? '#ff3355' : '#fff1c2';
  const waves = Array.from({ length: 9 }, (_, i) => {
    const y = 200 + i * 48;
    return `<path d="M${560 - i * 10} ${y} q40 -8 80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="${loc.palette.glow}" stroke-opacity="${0.06 + i * 0.012}" stroke-width="1.5"><animateTransform attributeName="transform" type="translate" values="0 0;-20 2;0 0" dur="${6 + i}s" repeatCount="indefinite"/></path>`;
  }).join('');
  const cabins = (x0: number, y: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const x = x0 + i * 38;
      const lit = r() > 0.5;
      return `<path d="M${x} ${y} v-18 l14 -12 l14 12 v18 z" fill="#0b1416" stroke="#1d3034"/><rect x="${x + 9}" y="${y - 14}" width="10" height="8" fill="${lit ? '#ffcf7a' : '#132024'}" opacity="${lit ? 0.6 : 1}"/>`;
    }).join('');
  const grass = Array.from({ length: 80 }, () => {
    const x = 330 + r() * 300;
    const y = 120 + r() * 70;
    return `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(r() * 6 - 3).toFixed(1)} -14 ${(r() * 8 - 4).toFixed(1)} -22" stroke="#24302a" stroke-width="1.4" fill="none"/>`;
  }).join('');
  return `<svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="backdrop">
  <defs>
    <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020507"/><stop offset=".5" stop-color="${loc.palette.sky}"/><stop offset="1" stop-color="#0a1214"/></linearGradient>
    <linearGradient id="${sea}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#071012" stop-opacity="0"/><stop offset=".45" stop-color="#06181c"/><stop offset="1" stop-color="#041114"/></linearGradient>
    <linearGradient id="${beam}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lamp}" stop-opacity=".35"/><stop offset="1" stop-color="${lamp}" stop-opacity="0"/></linearGradient>
    <filter id="${fog}"><feTurbulence type="fractalNoise" baseFrequency=".006 .025" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 .7  0 0 0 0 .85  0 0 0 0 .85  0 0 0 .6 -.2"/></filter>
  </defs>
  <rect width="1000" height="640" fill="url(#${sky})"/>
  ${stars}
  <circle cx="200" cy="64" r="22" fill="#e9f2ee" opacity=".8"/>
  <path d="M520 0 L1000 0 L1000 640 L640 640 C600 520 560 360 600 200 C610 120 560 60 520 0 Z" fill="url(#${sea})"/>
  <path d="M200 70 L210 620" stroke="#e9f2ee" stroke-opacity=".0"/>
  ${waves}
  <path d="M0 640 L0 220 C120 200 260 230 380 210 C460 196 540 170 600 200 C560 360 600 520 640 640 Z" fill="#0d1517"/>
  ${grass}
  ${cabins(260, 268, 4)}${cabins(420, 486, 4)}
  <g transform="translate(880 30)"><path d="M10 120 L16 20 L32 20 L38 120 Z" fill="#cfd8d6"/><path d="M12 90 L36 90 M13 60 L35 60" stroke="#8a2a2a" stroke-width="7"/><rect x="14" y="6" width="20" height="16" fill="${lamp}"/><path d="M10 6 L24 -6 L38 6 Z" fill="#1d2628"/></g>
  <path d="M904 44 L560 0 L560 120 Z" fill="url(#${beam})" class="beam"><animateTransform attributeName="transform" type="rotate" values="-6 904 44;8 904 44;-6 904 44" dur="9s" repeatCount="indefinite"/></path>
  <path d="M740 404 H940" stroke="#3a2e22" stroke-width="7"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${746 + i * 24} 404 v22" stroke="#2a2018" stroke-width="3"/>`).join('')}
  <rect width="1000" height="640" filter="url(#${fog})" class="fog" opacity=".6"/>
</svg>`;
}

function driveInBackdrop(loc: LocationPack, finale: boolean): string {
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
