// LAST LIGHT — detailed heroine portraits (v2). Original character designs,
// drawn as layered SVG with gradients, rim light, film grain and damage states.
import type { HeroineDef, PortraitLook } from '../engine/types';

let n = 0;
const id = (p: string) => `${p}-${++n}`;

function shade(hex: string, amt: number): string {
  const c = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  const out = v.map((x) => Math.max(0, Math.min(255, Math.round(amt < 0 ? x * (1 + amt) : x + (255 - x) * amt))));
  return `#${out.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function hairBack(l: PortraitLook, fill: string): string {
  switch (l.hairStyle) {
    case 'long':
      return `<path d="M56 86 C46 30 154 26 146 86 C150 120 156 160 160 200 L40 200 C44 160 50 120 56 86 Z" fill="${fill}"/>`;
    case 'ponytail':
      return `<path d="M126 64 C170 60 176 120 158 176 C152 186 146 182 148 170 C156 128 146 98 120 86 Z" fill="${fill}"/><circle cx="128" cy="66" r="7" fill="${l.accent}"/>`;
    case 'curls':
      return `<g fill="${fill}">${[
        [60, 74, 22], [74, 50, 22], [96, 38, 24], [120, 40, 23], [140, 56, 22], [150, 82, 21], [52, 100, 20], [150, 108, 20], [56, 126, 17], [148, 132, 17],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
        .join('')}</g>`;
    case 'bob':
      return `<path d="M56 92 C50 36 150 34 146 92 L150 132 C140 140 60 140 50 132 Z" fill="${fill}"/>`;
    case 'pixie':
      return `<path d="M62 90 C56 44 146 40 140 88 L138 104 L64 104 Z" fill="${fill}"/>`;
  }
}

function hairFront(l: PortraitLook, fill: string, hi: string): string {
  const strands = (d: string) => `<path d="${d}" stroke="${hi}" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>`;
  switch (l.hairStyle) {
    case 'pixie':
      return `<path d="M64 88 C58 46 140 36 138 84 C128 70 112 60 96 64 C86 70 76 78 64 88 Z" fill="${fill}"/>${strands('M78 62 Q96 52 118 56')}${strands('M90 58 Q104 62 116 72')}`;
    case 'bob':
      return `<path d="M64 88 C66 50 136 48 138 88 C120 74 102 66 80 72 C74 76 68 82 64 88 Z" fill="${fill}"/><path d="M58 92 Q60 120 66 132 L58 132 Z M142 92 Q140 120 134 132 L142 132 Z" fill="${fill}"/>${strands('M74 64 Q100 52 128 66')}`;
    case 'curls':
      return `<g fill="${fill}"><circle cx="78" cy="62" r="13"/><circle cx="98" cy="56" r="14"/><circle cx="120" cy="60" r="13"/></g>${strands('M86 54 q6 -6 12 0')}${strands('M110 54 q6 -6 12 0')}`;
    case 'long':
      return `<path d="M64 88 C64 46 138 44 138 88 C124 66 104 58 100 58 C96 66 80 74 64 88 Z" fill="${fill}"/><path d="M60 90 Q54 140 62 192 L50 192 Q44 140 60 90 Z M140 90 Q146 140 138 192 L150 192 Q156 140 140 90 Z" fill="${fill}"/>${strands('M100 58 Q120 64 134 84')}${strands('M64 110 Q60 150 64 186')}`;
    case 'ponytail':
      return `<path d="M64 88 C62 48 138 44 138 84 C126 66 108 60 92 64 C80 70 70 78 64 88 Z" fill="${fill}"/>${strands('M76 66 Q100 52 130 68')}${strands('M150 120 Q156 150 150 172')}`;
  }
}

function outfit(l: PortraitLook, w: string, accent: string): string {
  const base = `<path d="M30 200 C34 160 64 144 100 144 C136 144 166 160 170 200 Z" fill="${w}"/>`;
  switch (l.prop) {
    case 'apron':
      return `${base}<path d="M30 200 C34 160 64 144 100 144 C136 144 166 160 170 200 Z" fill="url(#stripes)" opacity=".35"/>
        <path d="M74 158 L126 158 L132 200 L68 200 Z" fill="#f2ece2"/><path d="M74 158 L64 146 M126 158 L136 146" stroke="#f2ece2" stroke-width="4"/>
        <rect x="90" y="168" width="20" height="9" rx="2" fill="${accent}"/><path d="M80 186 Q100 192 120 186" stroke="#d8c9b2" stroke-width="1.5" fill="none"/>`;
    case 'ticket':
      return `${base}<path d="M70 150 L100 200 L130 150 L124 148 L100 186 L76 148 Z" fill="#1b1b22"/>
        <rect x="112" y="164" width="22" height="9" rx="1.5" fill="#e9e1cf"/><rect x="114" y="166" width="10" height="2" fill="#6a5"/>
        <g transform="rotate(-14 66 176)"><rect x="50" y="168" width="34" height="16" rx="1.5" fill="${accent}"/><circle cx="50" cy="176" r="3.5" fill="${w}"/><circle cx="84" cy="176" r="3.5" fill="${w}"/><path d="M58 176 H76" stroke="#7a5a10" stroke-dasharray="2 2"/></g>`;
    case 'wrench':
      return `${base}<path d="M64 200 L70 160 L84 160 L84 200 Z M136 200 L130 160 L116 160 L116 200 Z" fill="#3c5a86"/><rect x="74" y="170" width="52" height="30" fill="#3c5a86"/>
        <circle cx="78" cy="166" r="3" fill="#c9c9c9"/><circle cx="122" cy="166" r="3" fill="#c9c9c9"/><path d="M88 182 q8 -4 14 2 q6 4 12 -2" stroke="#222" stroke-width="3" opacity=".45" fill="none"/>
        <g transform="rotate(32 148 168)"><rect x="144" y="136" width="8" height="54" rx="3" fill="#a9b0b8"/><path d="M138 132 a10 10 0 1 0 20 0 l-5 0 l0 6 l-10 0 l0 -6 z" fill="#a9b0b8"/></g>`;
    case 'whistle':
      return `<path d="M30 200 C34 160 64 144 100 144 C136 144 166 160 170 200 Z" fill="#b3122c"/><path d="M84 146 Q100 160 116 146" stroke="#7a0a1c" stroke-width="5" fill="none"/>
        <path d="M86 146 Q100 186 114 146" stroke="${accent}" stroke-width="2" fill="none"/><rect x="94" y="176" width="16" height="10" rx="4" fill="#e6e6e6"/><circle cx="98" cy="181" r="2" fill="#555"/>
        <path d="M56 176 L68 200 M144 176 L132 200" stroke="#7a0a1c" stroke-width="3"/>`;
    case 'camera':
      return `<path d="M30 200 C34 160 64 144 100 144 C136 144 166 160 170 200 Z" fill="#2a1f1a"/><path d="M84 146 L76 200 M116 146 L124 200" stroke="#46352b" stroke-width="7"/>
        <path d="M60 158 L140 190" stroke="#3a2a22" stroke-width="5"/>
        <g transform="translate(110 162)"><rect width="46" height="28" rx="4" fill="#1a1a1e"/><rect x="-10" y="7" width="12" height="14" rx="2" fill="#26262c"/><circle cx="8" cy="14" r="9" fill="#0a0a0c" stroke="${accent}" stroke-width="2"/><circle cx="8" cy="14" r="3.5" fill="${accent}" opacity=".7"/><circle cx="38" cy="7" r="2.2" fill="#ff3355"><animate attributeName="opacity" values="1;0;1" dur="1.4s" repeatCount="indefinite"/></circle></g>`;
  }
}

export function heroinePortraitV2(h: HeroineDef, opts: { grim?: number; hurt?: number } = {}): string {
  const l = h.look;
  const grim = Math.min(1, opts.grim ?? 0);
  const hurt = Math.min(1, opts.hurt ?? 0);
  const [bg, sk, hr, rim, gr, vg, st] = ['bg', 'sk', 'hr', 'rim', 'gr', 'vg', 'stripes'].map(id);
  const skinHi = shade(l.skin, 0.18);
  const skinLo = shade(l.skin, -0.32);
  const hairHi = shade(l.hair, 0.35);
  const eyeY = 98;
  const browLift = grim * 5;
  const mouth = grim > 0.66 ? `<ellipse cx="100" cy="128" rx="6" ry="${4 + grim * 2}" fill="#3a1414"/>` : `<path d="M90 126 Q100 ${grim > 0.33 ? 124 : 131} 110 126" stroke="#6a2a2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M93 128 Q100 130 107 128" stroke="${shade(l.skin, 0.3)}" stroke-width="1" fill="none" opacity=".6"/>`;
  const outfitStripes = `<pattern id="${st}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><rect width="4" height="8" fill="${l.accent}"/></pattern>`;
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="portrait" role="img" aria-label="${h.name}">
  <defs>
    <radialGradient id="${bg}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${l.accent}" stop-opacity=".7"/><stop offset=".45" stop-color="${shade(l.accent, -0.75)}"/><stop offset="1" stop-color="#040306"/></radialGradient>
    <radialGradient id="${sk}" cx="38%" cy="38%" r="70%"><stop offset="0" stop-color="${skinHi}"/><stop offset=".6" stop-color="${l.skin}"/><stop offset="1" stop-color="${skinLo}"/></radialGradient>
    <linearGradient id="${hr}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hairHi}"/><stop offset=".5" stop-color="${l.hair}"/><stop offset="1" stop-color="${shade(l.hair, -0.5)}"/></linearGradient>
    <linearGradient id="${rim}" x1="0" x2="1"><stop offset="0" stop-color="${l.accent}" stop-opacity=".75"/><stop offset=".25" stop-color="${l.accent}" stop-opacity="0"/></linearGradient>
    <radialGradient id="${vg}" cx="50%" cy="45%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
    <filter id="${gr}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${n}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    ${outfitStripes.replace(`id="${st}"`, 'id="stripes"')}
  </defs>
  <rect width="200" height="200" fill="url(#${bg})"/>
  ${[[30, 40, 10], [168, 30, 6], [150, 70, 4], [24, 110, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${l.accent}" opacity=".18"/>`).join('')}
  ${hairBack(l, `url(#${hr})`)}
  ${outfit(l, '#17121c', l.accent)}
  <path d="M86 122 L86 152 Q100 160 114 152 L114 122 Z" fill="${skinLo}"/>
  <path d="M86 140 Q100 150 114 140 L114 132 Q100 142 86 132 Z" fill="#000" opacity=".25"/>
  <ellipse cx="60" cy="104" rx="6" ry="10" fill="${l.skin}"/><ellipse cx="140" cy="104" rx="6" ry="10" fill="${skinLo}"/>
  <path d="M64 90 C64 52 136 52 136 90 C136 116 124 140 100 142 C76 140 64 116 64 90 Z" fill="url(#${sk})"/>
  <path d="M64 90 C64 52 136 52 136 90 C136 116 124 140 100 142 C76 140 64 116 64 90 Z" fill="url(#${rim})"/>
  <path d="M120 88 C130 104 128 128 108 140 C122 134 134 118 136 96 Z" fill="#000" opacity=".18"/>
  <ellipse cx="80" cy="114" rx="8" ry="5" fill="#ff7a8a" opacity="${0.18 - grim * 0.12}"/><ellipse cx="120" cy="114" rx="8" ry="5" fill="#ff7a8a" opacity="${0.14 - grim * 0.1}"/>
  <path d="M100 100 Q97 112 95 116 Q100 119 104 116" stroke="${skinLo}" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${[84, 116].map((x) => `<g>
    <path d="M${x - 9} ${eyeY} Q${x} ${eyeY - 7 - grim * 2} ${x + 9} ${eyeY} Q${x} ${eyeY + 5 + grim * 1.5} ${x - 9} ${eyeY} Z" fill="#f4efe8"/>
    <circle cx="${x + (x < 100 ? 1 : 1)}" cy="${eyeY}" r="${4.2 - grim * 0.8}" fill="${shade(l.hair, 0.15)}"/><circle cx="${x + 1}" cy="${eyeY}" r="${2 - grim * 0.6}" fill="#050505"/><circle cx="${x + 2.4}" cy="${eyeY - 1.6}" r="1.1" fill="#fff"/>
    <path d="M${x - 9} ${eyeY} Q${x} ${eyeY - 7 - grim * 2} ${x + 9} ${eyeY}" stroke="#1a0f0c" stroke-width="2" fill="none"/>
  </g>`).join('')}
  <path d="M74 ${88 - browLift} Q84 ${83 - browLift * 1.2} 93 ${87 - browLift * 0.4}" stroke="${shade(l.hair, -0.2)}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M107 ${87 - browLift * 0.4} Q116 ${83 - browLift * 1.2} 126 ${88 - browLift}" stroke="${shade(l.hair, -0.2)}" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${mouth}
  ${grim > 0.3 ? `<g fill="#cfe9ff" opacity="${grim * 0.8}"><ellipse cx="72" cy="80" rx="1.4" ry="2.4"/><ellipse cx="130" cy="86" rx="1.2" ry="2"/><ellipse cx="126" cy="70" rx="1" ry="1.8"/></g>` : ''}
  ${grim > 0.55 ? `<path d="M80 104 Q78 116 80 128" stroke="#bfe0ff" stroke-width="1.2" opacity=".5" fill="none"/>` : ''}
  ${hurt > 0 ? `<path d="M118 76 q4 10 -2 20" stroke="#8a0f1f" stroke-width="${1 + hurt * 2}" fill="none" opacity="${0.4 + hurt * 0.6}" stroke-linecap="round"/>` : ''}
  ${hurt > 0.4 ? `<g fill="#7a0a1c" opacity="${hurt}"><circle cx="70" cy="122" r="2"/><circle cx="66" cy="128" r="1.2"/><circle cx="74" cy="130" r="1.4"/><path d="M106 136 q6 4 12 0" stroke="#7a0a1c" stroke-width="2" fill="none"/></g>` : ''}
  ${hurt > 0.7 ? `<path d="M140 150 l10 30 M148 152 l6 22" stroke="#6a0816" stroke-width="2.5" opacity=".8"/>` : ''}
  ${hairFront(l, `url(#${hr})`, hairHi)}
  <rect width="200" height="200" fill="url(#${vg})"/>
  <rect width="200" height="200" fill="#fff" filter="url(#${gr})"/>
</svg>`;
}
