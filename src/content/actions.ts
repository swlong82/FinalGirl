import type { ActionCardDef } from '../engine/types';

// The heroine's action cards. Six zero-cost starters begin in her hand; every
// other card sits in a face-up pile in the tableau, bought with leftover nerve
// in the Planning phase. Most cards make a Horror Roll and resolve one band:
// great (2+ successes), good (exactly 1), or fail.
export const coreActions: ActionCardDef[] = [
  // ── Starters (cost 0) ──
  { id: 'ac-walk', name: 'Walk', cost: 0, kind: 'action', tags: ['move'], roll: false, always: [{ op: 'move', n: 1 }], flavor: 'One foot in front of the other.', copies: 2, starter: true },
  { id: 'ac-hurry', name: 'Hurry', cost: 0, kind: 'action', tags: ['move'], roll: true, great: [{ op: 'move', n: 2 }], good: [{ op: 'move', n: 1 }], fail: [{ op: 'horror', n: 1 }], flavor: 'Faster. Don’t look back.', copies: 1, starter: true },
  { id: 'ac-look', name: 'Look Around', cost: 0, kind: 'action', tags: ['search'], roll: true, req: 'searchSpace', great: [{ op: 'search', draw: 2, keep: 1 }], good: [{ op: 'search', draw: 1, keep: 1 }], fail: [{ op: 'horror', n: 1 }], flavor: 'Drawers, shelves, under the seats.', copies: 1, starter: true },
  { id: 'ac-shove', name: 'Shove', cost: 0, kind: 'action', tags: ['attack'], roll: true, light: true, req: 'reach', great: [{ op: 'damage', n: 1 }], good: [], fail: [{ op: 'horror', n: 1 }], flavor: 'Get off me! Light: weapons, lore and focus don’t add to it.', copies: 1, starter: true },
  { id: 'ac-steady', name: 'Steady Yourself', cost: 0, kind: 'action', tags: ['calm'], roll: true, great: [{ op: 'horror', n: -2 }], good: [{ op: 'horror', n: -1 }], fail: [], flavor: 'Breathe in for four. Out for four.', copies: 1, starter: true },
  { id: 'ac-duck', name: 'Duck', cost: 0, kind: 'reaction', tags: ['reaction'], roll: true, great: [{ op: 'block', n: 2 }], good: [{ op: 'block', n: 1 }], fail: [], flavor: 'Reaction. Down!', copies: 1, starter: true },

  // ── Movement ──
  { id: 'ac-run', name: 'Run', cost: 1, kind: 'action', tags: ['move'], roll: true, great: [{ op: 'move', n: 3 }], good: [{ op: 'move', n: 2 }], fail: [{ op: 'move', n: 1 }], flavor: 'Lungs burning, legs pumping.', copies: 2 },
  { id: 'ac-sprint', name: 'Sprint', cost: 2, kind: 'action', tags: ['move'], roll: false, always: [{ op: 'move', n: 2 }], flavor: 'No thinking. Just go.', copies: 1 },
  { id: 'ac-slip', name: 'Slip Away', cost: 1, kind: 'action', tags: ['move', 'hide'], roll: true, great: [{ op: 'move', n: 1 }, { op: 'hide' }], good: [{ op: 'move', n: 1 }], fail: [{ op: 'move', n: 1 }, { op: 'horror', n: 1 }], flavor: 'Through the gap, into the dark.', copies: 2 },

  // ── Searching ──
  { id: 'ac-search', name: 'Search', cost: 1, kind: 'action', tags: ['search'], roll: true, req: 'searchSpace', great: [{ op: 'search', draw: 3, keep: 2 }], good: [{ op: 'search', draw: 2, keep: 1 }], fail: [{ op: 'search', draw: 1, keep: 1 }, { op: 'horror', n: 1 }], flavor: 'There has to be something here.', copies: 3 },
  { id: 'ac-ransack', name: 'Ransack', cost: 2, kind: 'action', tags: ['search'], roll: true, dice: 1, req: 'searchSpace', great: [{ op: 'search', draw: 4, keep: 2 }], good: [{ op: 'search', draw: 3, keep: 2 }], fail: [{ op: 'search', draw: 2, keep: 1 }, { op: 'horror', n: 1 }], flavor: 'Tear the place apart. +1 die.', copies: 2 },

  // ── Fighting ──
  { id: 'ac-swing', name: 'Swing', cost: 1, kind: 'action', tags: ['attack'], roll: true, light: true, req: 'reach', great: [{ op: 'damage', n: 2 }], good: [{ op: 'damage', n: 1 }], fail: [{ op: 'horror', n: 1 }], flavor: 'A quick, wild swing. Light: weapons, lore and focus don’t add to it.', copies: 3 },
  { id: 'ac-fullswing', name: 'Full Swing', cost: 2, kind: 'action', tags: ['attack'], roll: true, req: 'reach', great: [{ op: 'damage', n: 3 }], good: [{ op: 'damage', n: 1 }], fail: [{ op: 'horror', n: 1 }], flavor: 'Plant your feet and put everything behind it. Your weapon, lore and focus add to it.', copies: 2 },
  { id: 'ac-desperate', name: 'Desperate Strike', cost: 3, kind: 'action', tags: ['attack'], roll: true, dice: 1, req: 'reach', great: [{ op: 'damage', n: 3 }], good: [{ op: 'damage', n: 2 }], fail: [{ op: 'wound', n: 1 }, { op: 'horror', n: 1 }], flavor: 'All or nothing. +1 die.', copies: 1 },
  { id: 'ac-psych', name: 'Psych Up', cost: 1, kind: 'action', tags: ['focus'], roll: true, great: [{ op: 'mod', key: 'damage', n: 2 }], good: [{ op: 'mod', key: 'damage', n: 1 }], fail: [{ op: 'horror', n: 1 }], flavor: 'Your next attack this turn that hits deals extra damage.', copies: 2 },
  { id: 'ac-steadyhands', name: 'Steady Hands', cost: 1, kind: 'action', tags: ['focus'], roll: false, always: [{ op: 'mod', key: 'rerollNext', n: 1 }], flavor: 'Your next roll rerolls every die that isn’t a success.', copies: 1 },

  // ── Survival ──
  { id: 'ac-hide', name: 'Hide', cost: 1, kind: 'action', tags: ['hide'], roll: true, req: 'killerAway', great: [{ op: 'hide' }], good: [{ op: 'hide' }, { op: 'endPhase' }], fail: [{ op: 'horror', n: 1 }], flavor: 'Under the bed. In the closet. Don’t breathe.', copies: 2 },
  { id: 'ac-barricade', name: 'Barricade', cost: 2, kind: 'action', tags: ['barricade'], roll: true, req: 'killerAway', great: [{ op: 'barricade', at: 'here', strength: 2 }], good: [{ op: 'barricade', at: 'here', strength: 1 }], fail: [{ op: 'barricade', at: 'here', strength: 1 }, { op: 'horror', n: 1 }], flavor: 'He has to break through to get in here.', copies: 2 },
  { id: 'ac-rest', name: 'Catch Your Breath', cost: 2, kind: 'action', tags: ['heal'], roll: true, req: 'killerAway', great: [{ op: 'heal', n: 2 }], good: [{ op: 'heal', n: 1 }], fail: [{ op: 'horror', n: 1 }], flavor: 'Bind it tight. Keep going.', copies: 2 },
  { id: 'ac-deepbreath', name: 'Deep Breath', cost: 1, kind: 'action', tags: ['calm'], roll: true, great: [{ op: 'horror', n: -3 }], good: [{ op: 'horror', n: -2 }], fail: [{ op: 'horror', n: -1 }], flavor: 'You are still alive. Hold on to that.', copies: 2 },
  { id: 'ac-adrenaline', name: 'Adrenaline', cost: 1, kind: 'action', tags: ['nerve'], roll: false, always: [{ op: 'nerve', n: 2 }, { op: 'horror', n: 1 }], flavor: 'Heart hammering. Costs 1, gives 2 (+1 horror): worth it only to reach a big card.', copies: 2 },
  { id: 'ac-overhere', name: 'Over Here!', cost: 1, kind: 'action', tags: ['rally'], roll: true, great: [{ op: 'rally', n: 3 }], good: [{ op: 'rally', n: 2 }], fail: [{ op: 'rally', n: 1 }, { op: 'horror', n: 1 }], flavor: 'Survivors next door run to you.', copies: 2 },
  { id: 'ac-scream', name: 'Scream', cost: 0, kind: 'action', tags: ['lure'], roll: false, always: [{ op: 'killerMove', toward: 'heroine', steps: 1 }, { op: 'horror', n: 1 }], flavor: 'He comes 1 step toward you: away from the others.', copies: 1 },

  // ── Reactions (only when he attacks you) ──
  { id: 'ac-brace', name: 'Brace', cost: 1, kind: 'reaction', tags: ['reaction'], roll: true, great: [{ op: 'block', n: 99 }], good: [{ op: 'block', n: 2 }], fail: [{ op: 'block', n: 1 }], flavor: 'Reaction. Arms up, take it on the shoulder.', copies: 2 },
  { id: 'ac-dodge', name: 'Dodge', cost: 2, kind: 'reaction', tags: ['reaction'], roll: false, always: [{ op: 'block', n: 99 }], flavor: 'Reaction. The blade bites the wall, not you.', copies: 1 },
  { id: 'ac-counter', name: 'Counter', cost: 3, kind: 'reaction', tags: ['reaction', 'attack'], roll: true, great: [{ op: 'block', n: 99 }, { op: 'counter', n: 2 }], good: [{ op: 'block', n: 1 }, { op: 'counter', n: 1 }], fail: [], flavor: 'Reaction. Step inside his swing and hit back.', copies: 1 },
];
