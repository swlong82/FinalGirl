import type { ActionCardDef } from '../engine/types';

// ── Basic kit ── topped up for free every round (2 of each). Pay nerve to play.
export const basicActions: ActionCardDef[] = [
  { id: 'ac-walk', name: 'Walk', tier: 'basic', base: 'move', cost: 1, range: 1, text: 'Move 1 step. Escorted survivors come with you.' },
  { id: 'ac-search', name: 'Search', tier: 'basic', base: 'search', cost: 1, text: 'Roll search dice. Each success finds an item (max 2).' },
  { id: 'ac-hide', name: 'Hide', tier: 'basic', base: 'hide', cost: 1, text: 'Roll hide dice. Any success: hidden this round.' },
  { id: 'ac-lead', name: 'Lead', tier: 'basic', base: 'lead', cost: 1, text: '“Stay close to me.” Survivors here follow you.' },
];
export const KIT = ['ac-walk', 'ac-search', 'ac-hide', 'ac-lead'];
export const KIT_COPIES = 2;

// ── Market ── always 4 face up, refills on purchase. Pay the price once; then it's free to play.
export const marketActions: ActionCardDef[] = [
  { id: 'ac-fight', name: 'Fight', tier: 'market', base: 'fight', cost: 0, price: 2, text: 'Attack the killer here. Damage = successes − armor.', copies: 4 },
  { id: 'ac-swing', name: 'Desperate Swing', tier: 'market', base: 'fight', cost: 0, price: 3, dice: 2, text: 'Everything you have: fight with +2 dice.', copies: 2 },
  { id: 'ac-run', name: 'Run', tier: 'market', base: 'move', cost: 0, price: 1, range: 2, text: 'Move up to 2 steps.', copies: 3 },
  { id: 'ac-slip', name: 'Slip Away', tier: 'market', base: 'move', cost: 0, price: 1, range: 1, sneak: true, text: 'Move 1 step and end up hidden.', copies: 2 },
  { id: 'ac-ransack', name: 'Ransack', tier: 'market', base: 'search', cost: 0, price: 2, dice: 2, text: 'Tear the place apart: search with +2 dice.', copies: 2 },
  { id: 'ac-breath', name: 'Hold Your Breath', tier: 'market', base: 'hide', cost: 0, price: 2, auto: true, text: 'Hide automatically.', copies: 2 },
  { id: 'ac-barricade', name: 'Barricade', tier: 'market', base: 'barricade', cost: 0, price: 2, text: 'He must break through before entering here.', copies: 2 },
  { id: 'ac-rest', name: 'Catch Your Breath', tier: 'market', base: 'rest', cost: 0, price: 2, text: 'Roll 2 dice: each success heals 1 or calms 1. Clears a Bleeding card.', copies: 3 },
];
export const MARKET_SIZE = 4;

// ── Last-chance shop ── offered after End Turn, bought with leftover nerve. Kept until played (free).
export const specialActions: ActionCardDef[] = [
  { id: 'sp-molotov', name: 'Molotov', tier: 'special', base: 'effect', cost: 0, price: 4, needsKiller: true, effects: [{ op: 'killerDamage', n: 2, ignoreArmor: true }, { op: 'killerStun', n: 1 }], text: 'Killer here: 2 damage through armor, and he loses a turn.' },
  { id: 'sp-ambush', name: 'Ambush', tier: 'special', base: 'fight', cost: 0, price: 4, dice: 3, text: 'Strike from cover: fight with +3 dice.' },
  { id: 'sp-shortcut', name: 'Shortcut', tier: 'special', base: 'move', cost: 0, price: 3, range: 3, text: 'You know a way through: move up to 3 steps.' },
  { id: 'sp-snare', name: 'Wire Snare', tier: 'special', base: 'effect', cost: 0, price: 3, effects: [{ op: 'barricade', at: 'here', strength: 3 }], text: 'Rig this place: barricade (strength 3).' },
  { id: 'sp-steel', name: 'Steel Nerves', tier: 'special', base: 'effect', cost: 0, price: 3, effects: [{ op: 'horror', n: -2 }, { op: 'nerve', n: 1 }], text: 'Horror −2 and +1 nerve.' },
  { id: 'sp-dressing', name: 'Field Dressing', tier: 'special', base: 'effect', cost: 0, price: 3, effects: [{ op: 'heal', n: 2 }], text: 'Heal 2 (clears Bleeding).' },
  { id: 'sp-noisemaker', name: 'Noisemaker', tier: 'special', base: 'effect', cost: 0, price: 3, effects: [{ op: 'killerMove', toward: 'lair', steps: 3 }], text: 'Draw him off: the killer moves 3 toward his lair.' },
  { id: 'sp-surge', name: 'Adrenaline Surge', tier: 'special', base: 'effect', cost: 0, price: 3, effects: [{ op: 'nerve', n: 3 }], text: '+3 nerve when you play it.' },
];
export const SHOP_SIZE = 3;

export const junkActions: ActionCardDef[] = [
  { id: 'junk-wound', name: 'Bleeding', tier: 'junk', base: 'junk', cost: 0, junk: 'wound', text: '−1 nerve each round while you hold it. Rest or healing clears it.' },
  { id: 'junk-panic', name: 'Panic', tier: 'junk', base: 'junk', cost: 1, junk: 'panic', text: '−1 nerve each round while held. Pay 1 nerve to shake it off.' },
];

export const allActions = [...basicActions, ...marketActions, ...specialActions, ...junkActions];
