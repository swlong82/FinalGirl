// LAST LIGHT — Season 2 procedural fallback art. The painted Flux images (src/art/gen/)
// replace all of this once rendered; these keep a partly painted set looking deliberate.
import type { LocationPack } from '../engine/types';

let n = 0;
const id = (p: string) => `${p}${++n}`;

/** A palette-driven night scene with a silhouette skyline per Season 2 location. */
export function season2Backdrop(loc: LocationPack, finale: boolean): string {
  const [sky, glow, fog] = [id('s2sky'), id('s2glow'), id('s2fog')];
  const p = loc.palette;
  const top = finale ? '#3a0610' : p.sky;
  const accent = finale ? '#ff1a3c' : p.accent;
  const sil = '#05040a';
  const skyline: Record<string, string> = {
    camp: `${[60, 150, 240, 700, 790, 880, 960].map((x, i) => `<path d="M${x} ${300 - (i % 3) * 30} l40 120 h-80 z" fill="${sil}"/>`).join('')}
      <rect x="300" y="330" width="90" height="60" fill="${sil}"/><path d="M290 330 l55 -40 l55 40 z" fill="${sil}"/>
      <ellipse cx="560" cy="520" rx="420" ry="60" fill="#0a1420" opacity=".8"/><circle cx="330" cy="430" r="26" fill="${p.glow}" opacity=".55"/>`,
    mall: `<rect x="120" y="230" width="760" height="200" fill="${sil}"/><path d="M380 230 q120 -90 240 0 z" fill="#10202a" stroke="${p.glow}" stroke-opacity=".4"/>
      ${[160, 260, 640, 740].map((x) => `<rect x="${x}" y="300" width="70" height="50" fill="${accent}" opacity=".35"/>`).join('')}
      <rect x="120" y="430" width="760" height="10" fill="${p.glow}" opacity=".25"/>`,
    motel: `${[120, 200, 280, 360, 640, 720, 800].map((x) => `<rect x="${x}" y="330" width="70" height="80" fill="${sil}"/><rect x="${x + 24}" y="350" width="22" height="30" fill="${p.glow}" opacity=".3"/>`).join('')}
      <rect x="470" y="160" width="10" height="250" fill="${sil}"/><path d="M440 160 q35 -60 70 0 q-35 30 -70 0z" fill="${accent}" opacity=".7"/>
      <ellipse cx="500" cy="470" rx="90" ry="22" fill="#3ee6c1" opacity=".35"/>`,
    rink: `<path d="M100 420 q400 -260 800 0 z" fill="${sil}"/><circle cx="500" cy="200" r="46" fill="#cfd4ff" opacity=".55"/>
      ${Array.from({ length: 14 }, (_, i) => `<line x1="500" y1="200" x2="${80 + i * 64}" y2="640" stroke="${i % 2 ? accent : p.glow}" stroke-width="3" opacity=".18"/>`).join('')}`,
    farm: `<path d="M0 420 ${Array.from({ length: 50 }, (_, i) => `l10 ${i % 2 ? 16 : -16}`).join(' ')} V640 H0z" fill="${sil}"/>
      <rect x="160" y="250" width="110" height="120" fill="#3a0a0a"/><path d="M150 250 l65 -50 l65 50z" fill="#3a0a0a"/><rect x="320" y="170" width="44" height="200" rx="20" fill="${sil}"/>
      <circle cx="820" cy="140" r="60" fill="${finale ? '#ff1a3c' : '#ffb347'}" opacity=".7"/><rect x="700" y="260" width="6" height="110" fill="${sil}"/><rect x="680" y="280" width="46" height="6" fill="${sil}"/>`,
  };
  return `<svg viewBox="0 0 1000 640" xmlns="http://www.w3.org/2000/svg" class="backdrop" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="#030205"/></linearGradient>
    <radialGradient id="${glow}" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="${accent}" stop-opacity=".35"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <filter id="${fog}"><feTurbulence type="fractalNoise" baseFrequency=".008 .02" numOctaves="2" seed="${loc.id.length}"/><feColorMatrix values="0 0 0 0 .8  0 0 0 0 .8  0 0 0 0 .9  0 0 0 .35 0"/></filter>
  </defs>
  <rect width="1000" height="640" fill="url(#${sky})"/>
  <rect width="1000" height="640" fill="url(#${glow})"/>
  ${skyline[loc.art] ?? ''}
  <rect y="430" width="1000" height="210" fill="#000" opacity=".45"/>
  <rect width="1000" height="640" filter="url(#${fog})" class="fog" opacity=".5"/>
</svg>`;
}

/** A hooded silhouette with a per-killer mask, lit in the killer's colours. */
export function season2Portrait(art: string, finale = false): string {
  const g = id('s2kp');
  const look: Record<string, { rim: string; mask: string }> = {
    trapper: { rim: '#ff9a3c', mask: `<path d="M76 70 h48 v54 q-24 14 -48 0z" fill="#8a6a44"/><path d="M84 112 h32" stroke="#2a1a0a" stroke-width="3"/><circle cx="90" cy="88" r="4" fill="#120a04"/><circle cx="110" cy="88" r="4" fill="#120a04"/>` },
    dresser: { rim: '#9fe8ff', mask: `<ellipse cx="100" cy="92" rx="26" ry="34" fill="#f2ede6"/><path d="M84 80 q6 -4 12 0 M104 80 q6 -4 12 0" stroke="#7a6a5a" stroke-width="2" fill="none"/><ellipse cx="90" cy="90" rx="4" ry="3" fill="#1a1416"/><ellipse cx="110" cy="90" rx="4" ry="3" fill="#1a1416"/>` },
    manager: { rim: '#ff5470', mask: `<path d="M70 70 q30 -50 60 0 z" fill="#c9cdd6"/><ellipse cx="100" cy="96" rx="24" ry="30" fill="#e8c8b0"/><rect x="80" y="86" width="16" height="9" rx="4" fill="#111"/><rect x="104" y="86" width="16" height="9" rx="4" fill="#111"/>` },
    mirrorball: { rim: '#b45cff', mask: `<circle cx="100" cy="92" r="30" fill="#9aa0c0"/>${Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => `<rect x="${74 + c * 9}" y="${66 + r * 9}" width="8" height="8" fill="${(r + c) % 3 ? '#cfd4ff' : '#ff9de6'}" opacity=".8"/>`).join('')).join('')}` },
    harvestman: { rim: '#e0a526', mask: `<path d="M72 70 q28 -10 56 0 v50 q-28 16 -56 0z" fill="#a8844e"/><path d="M84 86 l8 6 M108 92 l8 -6 M84 110 q16 8 32 0" stroke="#1a1006" stroke-width="2.5" fill="none"/><path d="M66 70 h68 l-10 -16 h-48z" fill="#3a2a14"/>` },
  };
  const l = look[art] ?? look.trapper;
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait killer" role="img" aria-label="${art}">
  <defs><radialGradient id="${g}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${finale ? '#ff1a3c' : l.rim}" stop-opacity=".45"/><stop offset=".6" stop-color="#0c0810"/><stop offset="1" stop-color="#020103"/></radialGradient></defs>
  <rect width="200" height="200" fill="url(#${g})"/>
  <path d="M30 200 C36 150 64 130 100 130 C136 130 164 150 170 200Z" fill="#0a0709" stroke="${l.rim}" stroke-opacity=".5" stroke-width="2"/>
  <path d="M60 120 C56 60 144 60 140 120 C130 136 70 136 60 120Z" fill="#0a0709"/>
  ${l.mask}
</svg>`;
}

/** Procedural node icons for the Season 2 maps. */
export const SEASON2_ICONS: Record<string, (s: string, f: string) => string> = {
  campfire: (s, f) => `<path ${s} d="M6 32 L32 26 M6 26 L32 32"/><path ${f} d="M19 6 Q27 16 22 24 Q19 20 19 26 Q11 20 16 12 Q17 16 19 6 Z"/>`,
  target: (s, f) => `<circle ${s} cx="19" cy="19" r="14"/><circle ${s} cx="19" cy="19" r="8"/><circle ${f} cx="19" cy="19" r="3"/>`,
  canoe: (s) => `<path ${s} d="M2 20 Q19 30 36 20 Q19 24 2 20 Z"/><path ${s} d="M26 6 L18 28"/>`,
  arcade: (s) => `<path ${s} d="M10 34 V8 Q10 4 14 4 H24 Q28 4 28 8 V34 Z"/><rect ${s} x="13" y="8" width="12" height="10"/><circle ${s} cx="16" cy="25" r="2"/><path ${s} d="M22 24 h4"/>`,
  tray: (s) => `<rect ${s} x="4" y="22" width="30" height="8" rx="2"/><path ${s} d="M10 22 L12 10 H18 L20 22 M24 22 V14 H30 V22"/>`,
  fountain: (s) => `<path ${s} d="M4 30 H34 M8 30 Q8 22 19 22 Q30 22 30 30"/><path ${s} d="M19 22 V8 M19 8 Q12 8 10 16 M19 8 Q26 8 28 16"/>`,
  escalator: (s) => `<path ${s} d="M4 32 H12 L26 10 H34"/><path ${s} d="M4 26 H10 L24 4 H34"/>`,
  mannequin: (s) => `<circle ${s} cx="19" cy="7" r="4"/><path ${s} d="M13 12 H25 L23 24 H15 Z M19 24 V32 M12 34 H26"/>`,
  gift: (s) => `<rect ${s} x="6" y="14" width="26" height="20"/><path ${s} d="M4 14 H34 M19 14 V34 M19 14 Q12 4 10 10 Q10 14 19 14 Q26 4 28 10 Q28 14 19 14"/>`,
  monitor: (s) => `<rect ${s} x="4" y="6" width="14" height="11"/><rect ${s} x="20" y="6" width="14" height="11"/><rect ${s} x="4" y="20" width="14" height="11"/><rect ${s} x="20" y="20" width="14" height="11"/>`,
  truck: (s) => `<rect ${s} x="2" y="10" width="22" height="16"/><path ${s} d="M24 14 H31 L35 20 V26 H24"/><circle ${s} cx="9" cy="29" r="3"/><circle ${s} cx="29" cy="29" r="3"/>`,
  bus: (s) => `<path ${s} d="M4 34 V14 L19 6 L34 14 V34"/><path ${s} d="M8 24 H30"/>`,
  bell: (s, f) => `<path ${s} d="M8 28 Q8 14 19 14 Q30 14 30 28 Z M4 28 H34"/><circle ${f} cx="19" cy="10" r="3"/>`,
  neon: (s) => `<path ${s} d="M20 34 V22 M20 22 Q8 22 10 12 Q12 4 20 6 Q26 8 24 14 Q22 18 26 20 L30 16"/>`,
  pool: (s) => `<rect ${s} x="4" y="12" width="30" height="18" rx="8"/><path ${s} d="M8 22 Q12 19 16 22 T24 22 T32 22"/>`,
  key: (s) => `<circle ${s} cx="12" cy="12" r="7"/><path ${s} d="M17 17 L32 32 M26 26 L30 22 M29 29 L32 26"/>`,
  icebox: (s) => `<rect ${s} x="8" y="4" width="22" height="30" rx="2"/><path ${s} d="M8 14 H30 M12 9 h6"/>`,
  laundry: (s) => `<rect ${s} x="6" y="4" width="26" height="30" rx="2"/><circle ${s} cx="19" cy="21" r="8"/><path ${s} d="M10 9 h4"/>`,
  road: (s) => `<path ${s} d="M12 34 L16 4 M26 34 L22 4"/><path ${s} d="M19 30 v-4 M19 20 v-4 M19 10 v-3"/>`,
  skate: (s) => `<path ${s} d="M8 6 V22 H30 Q32 22 32 26 H6 V6 Z"/><circle ${s} cx="11" cy="30" r="3"/><circle ${s} cx="27" cy="30" r="3"/>`,
  soda: (s) => `<path ${s} d="M10 10 H28 L25 34 H13 Z"/><path ${s} d="M22 10 L26 2"/>`,
  discoball: (s) => `<circle ${s} cx="19" cy="21" r="12"/><path ${s} d="M7 21 H31 M19 9 V33 M10 14 Q19 18 28 14 M10 28 Q19 24 28 28 M19 2 V9"/>`,
  pinball: (s) => `<path ${s} d="M10 34 L6 6 H32 L28 34 Z"/><circle ${s} cx="19" cy="14" r="3"/><path ${s} d="M12 28 L17 25 M26 28 L21 25"/>`,
  locker: (s) => `<rect ${s} x="5" y="4" width="13" height="30"/><rect ${s} x="20" y="4" width="13" height="30"/><path ${s} d="M8 9 h6 M23 9 h6 M15 20 v3 M30 20 v3"/>`,
  spotlight: (s) => `<path ${s} d="M4 8 H34"/><path ${s} d="M19 8 V14"/><path ${s} d="M12 14 H26 L23 22 H15 Z"/><path ${s} d="M15 22 L8 34 M23 22 L30 34" opacity=".6"/>`,
  ladder: (s) => `<path ${s} d="M12 34 V4 M26 34 V4 M12 10 H26 M12 18 H26 M12 26 H26"/>`,
  dumpster: (s) => `<path ${s} d="M4 14 H34 L31 32 H7 Z M4 14 L8 8 H30 L34 14"/>`,
  farmhouse: (s) => `<path ${s} d="M4 18 L19 6 L34 18 V34 H4 Z"/><rect ${s} x="15" y="24" width="8" height="10"/><path ${s} d="M26 10 V4 H30 V13"/>`,
  pumpkin: (s, f) => `<ellipse ${s} cx="19" cy="22" rx="14" ry="11"/><path ${s} d="M19 11 V5 L23 3"/><path ${f} d="M12 19 l3 -3 l3 3z M20 19 l3 -3 l3 3z M12 26 Q19 31 26 26 Z"/>`,
  barn: (s) => `<path ${s} d="M4 34 V16 L10 8 H28 L34 16 V34 Z"/><path ${s} d="M13 34 V22 H25 V34 M13 22 L25 34 M25 22 L13 34"/>`,
  wagon: (s) => `<path ${s} d="M2 18 H32 V26 H2 Z"/><circle ${s} cx="8" cy="30" r="4"/><circle ${s} cx="26" cy="30" r="4"/><path ${s} d="M32 22 H37 M4 18 Q8 10 14 14 Q18 8 24 14 Q30 10 32 18"/>`,
  silo: (s) => `<path ${s} d="M10 34 V12 Q10 4 19 4 Q28 4 28 12 V34 Z M10 16 H28 M10 24 H28"/>`,
  corn: (s) => `<path ${s} d="M19 34 V6 M19 12 Q10 10 8 2 M19 18 Q28 16 30 8 M19 24 Q10 22 6 16 M19 28 Q28 26 32 20"/>`,
  scarecrow: (s) => `<path ${s} d="M19 34 V6 M6 14 H32"/><circle ${s} cx="19" cy="8" r="4"/><path ${s} d="M13 14 L11 26 H27 L25 14"/>`,
  tractor: (s) => `<circle ${s} cx="10" cy="26" r="7"/><circle ${s} cx="29" cy="29" r="4"/><path ${s} d="M10 19 V10 H22 V22 H33 V26"/>`,
  cellar: (s) => `<path ${s} d="M4 30 L34 30 L28 14 H10 Z"/><path ${s} d="M19 14 V30 M12 20 h4 M22 20 h4"/>`,
};
