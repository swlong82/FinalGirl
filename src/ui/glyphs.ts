// Tiny inline SVG glyphs in the game's line style (replaces emoji in the UI).
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const G: Record<string, string> = {
  snow: `<path ${S} d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 3 3-3M9 20l3-3 3 3"/>`,
  fire: `<path ${S} d="M12 22c-4 0-7-3-7-7 0-5 5-7 5-12 3 2 4 5 4 7 1-1 2-2 2-4 2 2 3 5 3 9 0 4-3 7-7 7z"/>`,
  wave: `<path ${S} d="M2 9c3-3 5-3 7 0s4 3 7 0 4-3 6 0M2 16c3-3 5-3 7 0s4 3 7 0 4-3 6 0"/>`,
  ripple: `<path ${S} d="M2 12c3-2 5-2 7 0s4 2 7 0 4-2 6 0"/>`,
  phone: `<path ${S} d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/>`,
  bulb: `<path ${S} d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z"/>`,
  undo: `<path ${S} d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>`,
  die: `<rect ${S} x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`,
  reel: `<circle ${S} cx="12" cy="12" r="9"/><circle cx="12" cy="7" r="2" fill="currentColor"/><circle cx="16.8" cy="10.5" r="2" fill="currentColor"/><circle cx="15" cy="16" r="2" fill="currentColor"/><circle cx="9" cy="16" r="2" fill="currentColor"/><circle cx="7.2" cy="10.5" r="2" fill="currentColor"/>`,
  search: `<circle ${S} cx="10" cy="10" r="6"/><path ${S} d="M15 15l6 6"/>`,
  barricade: `<path ${S} d="M3 7h18v10H3zM7 7l4 10M13 7l4 10"/>`,
  alarm: `<circle ${S} cx="12" cy="13" r="8"/><path ${S} d="M12 9v4M12 16.5v.5M4 4l3 2M20 4l-3 2"/>`,
  person: `<circle ${S} cx="12" cy="6" r="3"/><path ${S} d="M6 21l1-8q5-3 10 0l1 8"/>`,
  pack: `<path ${S} d="M6 8a6 6 0 0 1 12 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path ${S} d="M9 8V6a3 3 0 0 1 6 0v2M8 13h8v4H8z"/>`,
  key: `<circle ${S} cx="8" cy="12" r="4"/><path ${S} d="M12 12h9M17 12v3M20 12v2"/>`,
  target: `<circle ${S} cx="12" cy="12" r="9"/><circle ${S} cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>`,
  flag: `<path ${S} d="M5 21V4M5 4h11l-2 4 2 4H5"/>`,
};
export const glyph = (name: string, cls = '') => `<svg class="glyph ${cls}" viewBox="0 0 24 24" aria-hidden="true">${G[name] ?? ''}</svg>`;
