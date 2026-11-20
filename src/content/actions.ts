import type { ActionCardDef } from '../engine/types';

// The heroine's action deck. Moving is always available on the map;
// everything else comes from the hand you draw each round.
export const coreActions: ActionCardDef[] = [
  { id: 'ac-search', name: 'Search', base: 'search', cost: 1, text: 'Roll search dice. Each success finds an item (max 2).', copies: 3 },
  { id: 'ac-ransack', name: 'Ransack', base: 'search', cost: 2, dice: 2, text: 'Tear the place apart: search with +2 dice.', copies: 1 },
  { id: 'ac-lead', name: 'Lead', base: 'lead', cost: 1, text: '“Stay close to me.” Survivors here follow you.', copies: 4 },
  { id: 'ac-fight', name: 'Fight', base: 'fight', cost: 2, text: 'Attack the killer here. Damage = successes − armor.', copies: 2 },
  { id: 'ac-swing', name: 'Desperate Swing', base: 'fight', cost: 3, dice: 2, text: 'Everything you have: fight with +2 dice.', copies: 1 },
  { id: 'ac-hide', name: 'Hide', base: 'hide', cost: 1, text: 'Roll hide dice. Any success: hidden this round.', copies: 2 },
  { id: 'ac-breath', name: 'Hold Your Breath', base: 'hide', cost: 2, auto: true, text: 'Hide automatically.', copies: 1 },
  { id: 'ac-barricade', name: 'Barricade', base: 'barricade', cost: 2, text: 'He must break through before entering here.', copies: 1 },
  { id: 'ac-rest', name: 'Catch Your Breath', base: 'rest', cost: 2, text: 'Roll 2 dice: each success heals 1 or calms 1. Also clears a Wound card.', copies: 3 },
  { id: 'ac-sprint', name: 'Sprint', base: 'effect', cost: 1, effects: [{ op: 'freeMove' }, { op: 'freeMove' }], text: 'Your next 2 moves cost no nerve.', copies: 1 },
];

export const junkActions: ActionCardDef[] = [
  { id: 'junk-wound', name: 'Bleeding', base: 'junk', cost: 0, junk: 'wound', text: 'Dead weight. Rest or healing clears it from your deck.' },
  { id: 'junk-panic', name: 'Panic', base: 'junk', cost: 1, junk: 'panic', text: 'Pay 1 nerve to shake it off (discard). Leaves your deck when you calm down.' },
];
