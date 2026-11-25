// LAST LIGHT — stat symbols: horror, dice, nerve, health.
// Numbers read as "👁 2/6 · 🎲 4 · ⚡5" instead of words. These vector placeholders
// always work; a painted version (scripts/flux/prompts.mjs, class "symbol") replaces
// them in the larger spots (`big: true`) once src/art/gen/symbol/<name>.webp exists.
// Tiny inline uses stay vector: a painting doesn't survive 12 pixels.
import { gen } from '../art/gen';

export type SymName = 'horror' | 'dice' | 'nerve' | 'health';

const LABEL: Record<SymName, string> = { horror: 'Horror', dice: 'Dice', nerve: 'Nerve', health: 'Health' };

const SVG: Record<SymName, string> = {
  // A wide, staring eye: fear.
  horror: `<path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z" fill="#f3ecff" stroke="#3b1450" stroke-width="1.4"/>
    <circle cx="12" cy="12" r="4.6" fill="#a44bff"/><circle cx="12" cy="12" r="2.3" fill="#12060f"/>
    <circle cx="10.6" cy="10.6" r=".9" fill="#fff"/>
    <path d="M4.5 10.2l2 .9M4.3 13.6l2.1-.6M19.5 10.2l-2 .9M19.7 13.6l-2.1-.6" stroke="#ff3355" stroke-width=".8" stroke-linecap="round"/>`,
  // A bone-white die, three pips.
  dice: `<rect x="3" y="3" width="18" height="18" rx="4.5" fill="#f4ede0" stroke="#3a2c20" stroke-width="1.4"/>
    <circle cx="8" cy="8" r="1.8" fill="#1b1216"/><circle cx="12" cy="12" r="1.8" fill="#1b1216"/><circle cx="16" cy="16" r="1.8" fill="#1b1216"/>`,
  // A gold token struck with a lightning bolt: the courage you spend.
  nerve: `<circle cx="12" cy="12" r="9.6" fill="#f9c74f" stroke="#7a5200" stroke-width="1.4"/>
    <circle cx="12" cy="12" r="7.2" fill="none" stroke="#b07a1a" stroke-width=".9" stroke-dasharray="1.6 1.4"/>
    <path d="M13.4 5.5 8.6 12.6h3.3l-1.3 5.9 4.9-7.3h-3.4z" fill="#5a3600"/>`,
  // A heart.
  health: `<path d="M12 20.5 4.2 12.9A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 7.8 6.3z" fill="#e0243f" stroke="#5a0714" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M7.4 9.2a2.4 2.4 0 0 1 2.4-1.5" stroke="#ffb3c0" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
};

/** A stat symbol, inline with text. `big` uses the painted version when one has been rendered. */
export function sym(name: SymName, o: { big?: boolean; title?: string } = {}): string {
  const label = o.title ?? LABEL[name];
  const painted = o.big ? gen(`symbol/${name}`) : undefined;
  if (painted) return `<img class="sym sym-${name} gen" src="${painted}" alt="${label}" title="${label}">`;
  return `<svg class="sym sym-${name}" viewBox="0 0 24 24" role="img" aria-label="${label}"><title>${label}</title>${SVG[name]}</svg>`;
}
