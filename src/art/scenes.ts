// LAST LIGHT — scene art: the Anesthetist, the hospital backdrop, event-card
// "film stills", item icons and VHS-style feature posters. All original designs.
import type { EventDef, ItemDef, LocationPack } from '../engine/types';
import { gen, genSvg, slug } from './gen';

let n = 0;
const id = (p: string) => `${p}-${++n}`;

// ── The Anesthetist (original design) ───────────────────────────────────────
export function anesthetistPortrait(state: { finale?: boolean }): string {
  const [bg, lamp, mask] = [id('abg'), id('alamp'), id('amask')];
  const glow = state.finale ? '#ff3355' : '#c8ffe6';
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait killer" role="img" aria-label="The Anesthetist">
  <defs>
    <radialGradient id="${bg}" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="${state.finale ? '#4a0812' : '#1d2e28'}"/><stop offset="1" stop-color="#020403"/></radialGradient>
    <radialGradient id="${lamp}" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${mask}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7e6df"/><stop offset="1" stop-color="#9fb3aa"/></linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${bg})"/>
  <ellipse cx="100" cy="-10" rx="80" ry="34" fill="${glow}" opacity=".2"/>
  <rect width="200" height="200" fill="url(#${lamp})"/>
  <path d="M28 200 C32 150 62 128 100 128 C138 128 168 150 172 200 Z" fill="#3e5a4f"/>
  <path d="M70 136 L76 200 L124 200 L130 136 Q100 148 70 136 Z" fill="#2a2a2e"/>
  <path d="M76 150 L124 150" stroke="#46464c" stroke-width="2"/>
  <path d="M60 78 C58 30 142 30 140 78 L140 86 L60 86 Z" fill="#4f7266"/>
  <path d="M60 78 C70 72 130 72 140 78" stroke="#3b574d" stroke-width="2" fill="none"/>
  ${Array.from({ length: 7 }, (_, i) => `<circle cx="${70 + i * 10}" cy="${52 + (i % 2) * 6}" r="1.2" fill="#3b574d"/>`).join('')}
  <ellipse cx="100" cy="100" rx="38" ry="40" fill="#cbb8a6"/>
  <g>
    <circle cx="84" cy="94" r="11" fill="#0b0d0c" stroke="#7d8a84" stroke-width="3"/><circle cx="116" cy="94" r="11" fill="#0b0d0c" stroke="#7d8a84" stroke-width="3"/>
    <path d="M95 94 H105" stroke="#7d8a84" stroke-width="3"/><path d="M73 92 L62 88 M127 92 L138 88" stroke="#2a2a2a" stroke-width="3"/>
    <circle cx="80" cy="90" r="2.4" fill="${glow}" opacity=".8"/><circle cx="112" cy="90" r="2.4" fill="${glow}" opacity=".8"/>
  </g>
  <path d="M64 106 Q100 100 136 106 L132 134 Q100 146 68 134 Z" fill="url(#${mask})"/>
  <path d="M68 112 Q100 108 132 112 M70 120 Q100 116 130 120 M72 128 Q100 126 128 128" stroke="#8ea398" stroke-width="1" fill="none"/>
  <path d="M64 108 L56 100 M136 108 L144 100" stroke="#d7e6df" stroke-width="2"/>
  <path d="M80 120 Q100 136 120 120" stroke="#8a4a14" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".9"/>
  <path d="M84 121 L86 126 M92 125 L93 130 M100 127 L100 132 M108 125 L107 130 M116 121 L114 126" stroke="#8a4a14" stroke-width="1.6" opacity=".9"/>
  <g transform="translate(30 150) rotate(-8)"><rect x="0" y="8" width="22" height="34" rx="4" fill="#5a3410" opacity=".9"/><rect x="5" y="0" width="12" height="9" fill="#2a1a0a"/><rect x="3" y="18" width="16" height="12" fill="#e8dcc0" opacity=".85"/><path d="M6 23 H16 M6 26 H13" stroke="#5a3410" stroke-width="1"/></g>
  <g transform="translate(150 140) rotate(24)"><rect x="0" y="0" width="6" height="40" rx="2" fill="#dfe8f0" opacity=".85"/><rect x="-3" y="-4" width="12" height="5" fill="#9aa"/><path d="M3 40 L3 54" stroke="#cfd8e0" stroke-width="1.4"/><rect x="1" y="14" width="4" height="22" fill="${glow}" opacity=".55"/></g>
  ${state.finale ? '<path d="M78 112 L86 116 M120 110 L126 118" stroke="#ff3355" stroke-width="1.6"/>' : ''}
</svg>`;
}

// ── Hospital backdrop: a cutaway of the West Wing at night ───────────────────
export function hospitalBackdrop(loc: LocationPack, finale: boolean): string {
  const [wall, floor, light, fog] = [id('hw'), id('hf'), id('hl'), id('hfog')];
  const tint = finale ? '#ff3355' : loc.palette.glow;
  const windows = Array.from({ length: 8 }, (_, i) => {
    const x = 40 + i * 120;
    return `<g><rect x="${x}" y="40" width="70" height="90" fill="#06090b" stroke="#2a3a34" stroke-width="3"/><path d="M${x + 35} 40 V130 M${x} 85 H${x + 70}" stroke="#2a3a34" stroke-width="2"/>
      ${Array.from({ length: 6 }, (_, j) => `<path d="M${x + 6 + j * 11} ${46 + ((i * 7 + j * 13) % 30)} l-4 14" stroke="#7fa0b0" stroke-width="1" opacity=".35"><animateTransform attributeName="transform" type="translate" values="0 0;-6 40" dur="${0.9 + ((i + j) % 4) * 0.2}s" repeatCount="indefinite"/></path>`).join('')}</g>`;
  }).join('');
  const tubes = Array.from({ length: 7 }, (_, i) => {
    const x = 70 + i * 140;
    const dead = i === 3 || i === 5;
    return `<rect x="${x}" y="170" width="80" height="6" rx="3" fill="${tint}" opacity="${dead ? 0.15 : 0.8}">${i === 2 || i === 4 ? `<animate attributeName="opacity" values=".8;.1;.8;.8;.05;.8" dur="${3 + i}s" repeatCount="indefinite"/>` : ''}</rect>
      <path d="M${x - 40} 176 L${x + 120} 176 L${x + 160} 360 L${x - 80} 360 Z" fill="url(#${light})" opacity="${dead ? 0.1 : 0.5}"/>`;
  }).join('');
  const doors = Array.from({ length: 6 }, (_, i) => {
    const x = 60 + i * 160;
    return `<rect x="${x}" y="230" width="54" height="110" fill="#14201c" stroke="#2c3d36" stroke-width="2"/><rect x="${x + 14}" y="246" width="26" height="30" fill="${tint}" opacity=".08"/><circle cx="${x + 46}" cy="290" r="2.5" fill="#6a7a72"/>`;
  }).join('');
  return `<svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="backdrop">
  <defs>
    <linearGradient id="${wall}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1311"/><stop offset=".55" stop-color="#132320"/><stop offset=".56" stop-color="#1c2b27"/><stop offset="1" stop-color="#0b100f"/></linearGradient>
    <linearGradient id="${floor}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2420"/><stop offset="1" stop-color="#070a09"/></linearGradient>
    <linearGradient id="${light}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint}" stop-opacity=".35"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></linearGradient>
    <filter id="${fog}"><feTurbulence type="fractalNoise" baseFrequency=".01 .04" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .7  0 0 0 0 .9  0 0 0 0 .8  0 0 0 .35 -.1"/></filter>
    <pattern id="${floor}-tile" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="none" stroke="#24322d" stroke-width="1"/></pattern>
  </defs>
  <rect width="1000" height="640" fill="url(#${wall})"/>
  ${windows}
  <rect y="150" width="1000" height="20" fill="#0a0f0d"/>
  ${tubes}
  <rect y="352" width="1000" height="8" fill="#2c3d36"/>
  ${doors}
  <rect y="360" width="1000" height="280" fill="url(#${floor})"/>
  <rect y="360" width="1000" height="280" fill="url(#${floor}-tile)" opacity=".7" transform="skewX(-8)"/>
  <g transform="translate(36 380)"><rect width="60" height="18" rx="2" fill="#2a0508"/><text x="30" y="14" font-family="Oswald, sans-serif" font-size="12" fill="#b8323f" text-anchor="middle" letter-spacing="2">WARD C</text></g>
  <g opacity=".55"><path d="M600 470 h120 l10 -24 h-140 z" fill="#c9d6d0"/><path d="M610 470 v40 M710 470 v40" stroke="#5a6a62" stroke-width="3"/><circle cx="610" cy="514" r="5" fill="#2a2a2a"/><circle cx="710" cy="514" r="5" fill="#2a2a2a"/></g>
  <path d="M300 600 q30 -20 70 -6 q40 14 90 -4" stroke="#5a0a14" stroke-width="5" fill="none" opacity="${finale ? 0.8 : 0.35}"/>
  <rect width="1000" height="640" filter="url(#${fog})" class="fog" opacity=".5"/>
</svg>`;
}

// ── Extra node icons for the hospital ───────────────────────────────────────
export const HOSPITAL_ICONS: Record<string, (s: string, f: string) => string> = {
  ambulance: (s) => `<path ${s} d="M3 26 V12 H22 L30 18 H35 V26 Z"/><circle ${s} cx="10" cy="27" r="3"/><circle ${s} cx="28" cy="27" r="3"/><path ${s} d="M10 15 V21 M7 18 H13"/>`,
  cross: (s) => `<path ${s} d="M14 4 H24 V14 H34 V24 H24 V34 H14 V24 H4 V14 H14 Z"/>`,
  pill: (s) => `<rect ${s} x="4" y="13" width="30" height="12" rx="6" transform="rotate(-30 19 19)"/><path ${s} d="M14 10 L22 28" />`,
  desk: (s) => `<path ${s} d="M3 16 H35 V20 H3 Z"/><path ${s} d="M6 20 V33 M32 20 V33"/><path ${s} d="M22 16 V8 H30 V16"/><path ${s} d="M24 11 H28"/>`,
  candle: (s, f) => `<rect ${s} x="13" y="16" width="12" height="18"/><path ${f} d="M19 4 Q24 10 19 14 Q14 10 19 4 Z"/>`,
  elevator: (s) => `<rect ${s} x="6" y="4" width="26" height="30"/><path ${s} d="M19 4 V34"/><path ${s} d="M12 14 L10 18 H14 Z M26 22 L24 18 H28 Z"/>`,
  bear: (s) => `<circle ${s} cx="19" cy="20" r="10"/><circle ${s} cx="11" cy="11" r="4"/><circle ${s} cx="27" cy="11" r="4"/><circle cx="15" cy="18" r="1.5" fill="currentColor"/><path ${s} d="M16 25 Q19 27 22 25"/>`,
  files: (s) => `<rect ${s} x="5" y="6" width="28" height="28"/><path ${s} d="M5 15 H33 M5 24 H33 M16 10 H22 M16 19 H22 M16 28 H22"/>`,
  lamp: (s) => `<path ${s} d="M19 4 V12"/><path ${s} d="M6 22 Q19 6 32 22 Z"/><path ${s} d="M10 28 L8 34 M19 28 V34 M28 28 L30 34" opacity=".7"/>`,
  pipe: (s) => `<path ${s} d="M2 12 H22 Q30 12 30 20 V36"/><path ${s} d="M2 20 H18 Q22 20 22 24 V36"/><path ${s} d="M30 4 q4 4 0 8" opacity=".6"/>`,
  drawer: (s) => `<rect ${s} x="4" y="6" width="30" height="28"/><path ${s} d="M4 15 H34 M4 24 H34"/><rect ${s} x="12" y="17" width="14" height="5"/>`,
};

// ── Event-card film stills ──────────────────────────────────────────────────
type Motif = 'car' | 'fog' | 'moon' | 'radio' | 'blade' | 'screen' | 'wave' | 'lantern' | 'bell' | 'steps' | 'eye' | 'crowd' | 'fire' | 'door' | 'needle' | 'light' | 'flower';

const KEYWORDS: [RegExp, Motif][] = [
  [/headlight|car|truck|wagon|ambulance|alarm|causeway|rig|carload/i, 'car'],
  [/fog|mist|steam|vapor|smoke|ether|vent/i, 'fog'],
  [/moon|night light|harvest/i, 'moon'],
  [/radio|speaker|intercom|page|station|siren|coast guard|broadcast|jingle|tape/i, 'radio'],
  [/shear|splice|knife|hook|blade|instrument|tray|gaff|scalpel/i, 'blade'],
  [/screen|projector|reel|cartoon|countdown|film|frame/i, 'screen'],
  [/tide|flood|water|wave|drown|riptide|undertow|shallows|salt|slack/i, 'wave'],
  [/lantern|lamp|candle|chaplain|flare|generator|lights?\b/i, 'lantern'],
  [/bell|music box|hymn|lullaby|horn|foghorn|whisper/i, 'bell'],
  [/footprint|footstep|rounds|steps|prowl|elevator/i, 'steps'],
  [/face|eye|watch|count|chart|remember|tally/i, 'eye'],
  [/kids|crowd|campers|teen|couple|fishermen|bonfire|crew|intern|patients|transfer|dog|usher|scaveng|janitor|walk-in|trucker|check-in|disturb|swings/i, 'crowd'],
  [/burn|fire|bonfire|nitrate/i, 'fire'],
  [/door|window|sheet|laundry|closed|scrub/i, 'door'],
  [/needle|dose|pinch|sedat|inject|apron|bedside/i, 'needle'],
  [/coffee|cart|popcorn|crash/i, 'light'],
];

export function motifFor(ev: EventDef): Motif {
  const hay = `${ev.name} ${ev.text}`;
  for (const [re, m] of KEYWORDS) if (re.test(hay)) return m;
  return ev.tone === 'calm' ? 'moon' : ev.tone === 'victim' ? 'crowd' : 'eye';
}

function motifArt(m: Motif, ink: string, glow: string): string {
  switch (m) {
    case 'car':
      return `<path d="M60 120 l14 -26 q4 -8 14 -8 h64 q10 0 14 8 l14 26 v16 h-120 z" fill="${ink}"/><circle cx="88" cy="138" r="10" fill="#000"/><circle cx="152" cy="138" r="10" fill="#000"/><path d="M180 112 L300 84 L300 150 Z" fill="${glow}" opacity=".35"/><circle cx="178" cy="114" r="5" fill="${glow}"/>`;
    case 'fog':
      return Array.from({ length: 5 }, (_, i) => `<path d="M${-20 + i * 10} ${70 + i * 18} q60 -18 120 0 t120 0 t120 0" stroke="${glow}" stroke-width="${10 - i}" stroke-linecap="round" fill="none" opacity="${0.12 + i * 0.05}"/>`).join('') + `<path d="M150 150 v-50 q0 -16 12 -16 q12 0 12 16 v50" fill="${ink}" opacity=".7"/>`;
    case 'moon':
      return `<circle cx="210" cy="56" r="30" fill="${glow}" opacity=".85"/><circle cx="222" cy="50" r="27" fill="${ink}" opacity=".9"/>${Array.from({ length: 4 }, (_, i) => `<path d="M${20 + i * 60} 150 l18 -50 l18 50 z" fill="${ink}"/>`).join('')}`;
    case 'radio':
      return `<rect x="96" y="70" width="90" height="62" rx="8" fill="${ink}"/><circle cx="122" cy="101" r="17" fill="none" stroke="${glow}" stroke-width="3" opacity=".7"/><rect x="148" y="86" width="28" height="6" fill="${glow}" opacity=".6"/><path d="M110 70 L150 34" stroke="${ink}" stroke-width="3"/>${[1, 2, 3].map((i) => `<path d="M${196 + i * 10} ${78 - i * 4} q${8 + i * 4} ${22 + i * 4} 0 ${44 + i * 8}" stroke="${glow}" stroke-width="2" fill="none" opacity="${0.8 - i * 0.2}"/>`).join('')}`;
    case 'blade':
      return `<path d="M120 150 L150 30 L160 32 L140 150 Z" fill="#cfd4dc"/><path d="M150 30 L160 32 L155 54 Z" fill="#fff"/><rect x="116" y="146" width="28" height="12" fill="${ink}"/><path d="M146 80 l8 2 l-2 8" fill="#8a0f1f"/><circle cx="148" cy="170" r="3" fill="#8a0f1f"/><circle cx="160" cy="176" r="2" fill="#8a0f1f"/>`;
    case 'screen':
      return `<rect x="50" y="24" width="180" height="96" fill="${glow}" opacity=".85"/><text x="140" y="92" font-family="Oswald, sans-serif" font-size="64" text-anchor="middle" fill="${ink}" opacity=".85">8</text><circle cx="140" cy="72" r="40" fill="none" stroke="${ink}" stroke-width="3" opacity=".6"/><path d="M140 72 L140 32" stroke="${ink}" stroke-width="3" opacity=".6"/><path d="M76 120 v40 M204 120 v40" stroke="${ink}" stroke-width="6"/>`;
    case 'wave':
      return Array.from({ length: 4 }, (_, i) => `<path d="M-10 ${92 + i * 20} q30 -16 60 0 t60 0 t60 0 t60 0 t60 0" stroke="${glow}" stroke-width="3" fill="none" opacity="${0.8 - i * 0.15}"/>`).join('') + `<path d="M150 96 v-38 q0 -14 10 -14 q10 0 10 14 v38" fill="${ink}"/>`;
    case 'lantern':
      return `<circle cx="140" cy="86" r="56" fill="${glow}" opacity=".18"/><path d="M128 44 h24 l4 10 h-32 z" fill="${ink}"/><rect x="122" y="54" width="36" height="52" rx="5" fill="${glow}" opacity=".9"/><path d="M122 54 v52 M158 54 v52 M140 54 v52" stroke="${ink}" stroke-width="3"/><rect x="118" y="106" width="44" height="8" fill="${ink}"/><path d="M130 44 q10 -20 20 0" stroke="${ink}" stroke-width="3" fill="none"/>`;
    case 'bell':
      return `<path d="M110 120 q0 -60 30 -66 q30 6 30 66 z" fill="${ink}"/><circle cx="140" cy="126" r="7" fill="${ink}"/>${[1, 2, 3].map((i) => `<path d="M${100 - i * 12} ${90 - i * 6} q-10 20 0 40 M${180 + i * 12} ${90 - i * 6} q10 20 0 40" stroke="${glow}" stroke-width="2" fill="none" opacity="${0.8 - i * 0.2}"/>`).join('')}`;
    case 'steps':
      return Array.from({ length: 6 }, (_, i) => `<ellipse cx="${40 + i * 40}" cy="${150 - i * 14 + (i % 2) * 14}" rx="9" ry="15" fill="${ink}" opacity="${0.4 + i * 0.1}" transform="rotate(-20 ${40 + i * 40} ${150 - i * 14})"/>`).join('') + `<path d="M250 20 v130" stroke="${glow}" stroke-width="2" opacity=".3"/>`;
    case 'eye':
      return `<path d="M60 90 Q140 20 220 90 Q140 160 60 90 Z" fill="${glow}" opacity=".85"/><circle cx="140" cy="90" r="30" fill="${ink}"/><circle cx="140" cy="90" r="12" fill="#000"/><circle cx="150" cy="80" r="5" fill="#fff"/><path d="M80 82 Q140 30 200 82" stroke="#8a0f1f" stroke-width="1.5" fill="none" opacity=".6"/>`;
    case 'crowd':
      return Array.from({ length: 5 }, (_, i) => {
        const x = 50 + i * 46;
        const h = 60 + ((i * 17) % 20);
        return `<circle cx="${x}" cy="${168 - h - 10}" r="12" fill="${ink}"/><path d="M${x - 18} 168 L${x - 14} ${168 - h + 8} Q${x} ${168 - h} ${x + 14} ${168 - h + 8} L${x + 18} 168 Z" fill="${ink}"/>`;
      }).join('') + `<path d="M0 30 L280 30" stroke="${glow}" stroke-width="40" opacity=".12"/>`;
    case 'fire':
      return `<path d="M140 160 q-50 -30 -20 -90 q6 30 20 30 q-8 -40 24 -70 q-4 40 20 60 q14 -16 10 -34 q34 50 -4 104 z" fill="#ff7a2e" opacity=".85"/><path d="M140 160 q-24 -20 -8 -50 q10 20 18 16 q0 -20 14 -34 q8 30 8 40 q20 6 -12 28 z" fill="#ffd27a"/>`;
    case 'door':
      return `<rect x="104" y="30" width="72" height="140" fill="${ink}"/><rect x="108" y="34" width="64" height="132" fill="${glow}" opacity=".12"/><path d="M176 30 L210 40 L210 160 L176 170 Z" fill="${ink}" opacity=".7"/><circle cx="168" cy="100" r="3" fill="${glow}"/><path d="M130 166 L150 166 L150 120 Q140 108 130 120 Z" fill="#000" opacity=".8"/>`;
    case 'needle':
      return `<g transform="rotate(-35 140 90)"><rect x="80" y="80" width="100" height="22" rx="4" fill="#dfe8f0" opacity=".9"/><rect x="100" y="84" width="60" height="14" fill="${glow}" opacity=".6"/><rect x="60" y="76" width="22" height="30" fill="${ink}"/><path d="M180 91 L240 91" stroke="#e6edf3" stroke-width="2"/><circle cx="242" cy="91" r="2.5" fill="#8a0f1f"/></g>`;
    case 'light':
      return `<path d="M120 20 h40 l30 140 h-100 z" fill="${glow}" opacity=".18"/><rect x="118" y="10" width="44" height="14" fill="${ink}"/><rect x="100" y="120" width="80" height="40" rx="4" fill="${ink}"/>`;
    case 'flower':
      return `<circle cx="140" cy="90" r="20" fill="${glow}"/>`;
  }
}

export function eventStill(ev: EventDef, kind: 'event' | 'terror'): string {
  const url = gen(`still/${ev.id}`);
  if (url) {
    const vg = id('gsv');
    return genSvg(url, {
      w: 280,
      h: 170,
      cls: 'still',
      overlay: `<defs><radialGradient id="${vg}" cx="50%" cy="50%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs><rect width="280" height="170" fill="url(#${vg})"/>`,
    });
  }
  const m = motifFor(ev);
  const tone = kind === 'terror' ? 'terror' : ev.tone;
  const pal: Record<string, [string, string, string]> = {
    victim: ['#2a2230', '#ffd9a0', '#0d0a10'],
    calm: ['#1b2a3a', '#cfe6ff', '#070b10'],
    dread: ['#2a1418', '#ffb38a', '#0b0506'],
    killer: ['#320a12', '#ff6b83', '#080203'],
    terror: ['#4a0010', '#ff3355', '#050001'],
  };
  const [top, glow, ink] = pal[tone] ?? pal.dread;
  const [g, gr, vg] = [id('es'), id('esg'), id('esv')];
  return `<svg viewBox="0 0 280 170" xmlns="http://www.w3.org/2000/svg" class="still" aria-hidden="true">
  <defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${ink}"/></linearGradient>
    <radialGradient id="${vg}" cx="50%" cy="50%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>
    <filter id="${gr}"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="${n}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .12 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs>
  <rect width="280" height="170" fill="url(#${g})"/>
  <path d="M0 150 H280 V170 H0 Z" fill="${ink}"/>
  ${motifArt(m, ink, glow)}
  <rect width="280" height="170" fill="url(#${vg})"/>
  <rect width="280" height="170" fill="#fff" filter="url(#${gr})"/>
  <path d="M${30 + (n % 7) * 30} 0 v170" stroke="#fff" stroke-width=".6" opacity=".25"/>
</svg>`;
}

// ── Item icons ──────────────────────────────────────────────────────────────
export function itemIcon(item: ItemDef): string {
  const url = gen(`item/${slug(item.name)}`);
  if (url) {
    const clip = id('gic');
    // The kind colour (currentColor) survives as a thin frame around the painting.
    return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" class="item-ico gen" aria-hidden="true"><clipPath id="${clip}"><rect width="36" height="36" rx="7"/></clipPath><image href="${url}" width="36" height="36" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/><rect x="1" y="1" width="34" height="34" rx="6.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  const s = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const k = `${item.id} ${item.name}`.toLowerCase();
  let p: string;
  if (item.kind === 'lore') p = `<path ${s} d="M8 6 H26 L30 10 V32 H8 Z"/><path ${s} d="M12 14 H26 M12 19 H26 M12 24 H20"/>`;
  else if (/shotgun|spear/.test(k)) p = `<path ${s} d="M4 24 L28 12 L32 14 L30 18 L8 28 Z"/><path ${s} d="M12 26 L14 32"/>`;
  else if (/shears|saw|axe/.test(k)) p = `<path ${s} d="M8 30 L22 10 L30 8 L28 16 L12 32 Z"/><path ${s} d="M22 10 L28 16"/>`;
  else if (/knife|scalpel|fillet|hook|gaff/.test(k)) p = `<path ${s} d="M6 32 L12 26 M12 26 L30 6 L26 18 Z"/>`;
  else if (/iron|speaker|weapon/.test(k) || item.kind === 'weapon') p = `<path ${s} d="M6 32 L28 8"/><path ${s} d="M24 6 L32 12"/>`;
  else if (/flare|defib/.test(k)) p = `<path ${s} d="M14 32 V14 H22 V32 Z"/><path d="M18 4 Q24 10 18 14 Q12 10 18 4 Z" fill="currentColor"/>`;
  else if (/extinguish|salt/.test(k)) p = `<rect ${s} x="12" y="10" width="12" height="22" rx="4"/><path ${s} d="M18 10 V6 H26 L30 4"/>`;
  else if (/flash|lantern|penlight/.test(k)) p = `<rect ${s} x="6" y="16" width="16" height="8" rx="2"/><path ${s} d="M22 14 L30 10 V30 L22 26 Z"/>`;
  else if (/aid|gauze|medkit|bandage/.test(k)) p = `<rect ${s} x="6" y="10" width="26" height="20" rx="3"/><path ${s} d="M19 14 V26 M13 20 H25"/>`;
  else if (/aspirin|brandy|sedative|thermos|coffee/.test(k)) p = `<path ${s} d="M12 8 H24 V32 H12 Z"/><path ${s} d="M14 4 H22 V8"/>`;
  else if (/candy|taffy|salts|epi/.test(k)) p = `<path ${s} d="M10 18 L26 18 L24 30 L12 30 Z"/><path ${s} d="M14 18 V12 M22 18 V12"/>`;
  else if (/chain|rope|gurney/.test(k)) p = `<rect ${s} x="6" y="12" width="12" height="8" rx="4"/><rect ${s} x="16" y="18" width="12" height="8" rx="4"/>`;
  else if (/walkie|radio|pager|intercom|transistor|bell|firecracker/.test(k)) p = `<rect ${s} x="12" y="10" width="14" height="22" rx="2"/><path ${s} d="M16 10 V4"/><path ${s} d="M15 16 H23 M15 20 H23"/>`;
  else if (/key/.test(k)) p = `<circle ${s} cx="12" cy="18" r="6"/><path ${s} d="M18 18 H32 M28 18 V23 M24 18 V22"/>`;
  else p = `<circle ${s} cx="18" cy="18" r="10"/>`;
  return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" class="item-ico" aria-hidden="true">${p}</svg>`;
}

// ── VHS feature poster ──────────────────────────────────────────────────────
export function posterFrame(opts: { backdrop: string; killer: string; title: string; sub: string; accent: string; locked?: boolean }): string {
  return `<div class="poster ${opts.locked ? 'locked' : ''}" style="--accent:${opts.accent}">
    <div class="poster-bd">${opts.backdrop}</div>
    <div class="poster-killer">${opts.killer}</div>
    <div class="poster-stripe"></div>
    <div class="poster-title">${opts.title}</div>
    <div class="poster-sub">${opts.sub}</div>
    <div class="poster-rating">LATE<br>SHOW</div>
    <div class="poster-wear"></div>
  </div>`;
}
