import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Six (Season 2).
export const trapper: KillerPack = {
  id: 'the-trapper',
  name: 'The Trapper',
  epithet: 'Silas Kroll, who never gave up his trapline',
  art: 'trapper',
  health: 10,
  horror: 2,
  gimmick: {
    kind: 'traps',
    name: 'Trapline',
    text: 'Every time {he} moves, {he} leaves a steel trap where {he} was (up to 3; the oldest is pulled up). Step into one: lose 1 health and your move ends there. Traps never catch {him} or the survivors with you.',
    max: 3,
  },
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'Checking the Line', text: 'He walks his old trapline, counting.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 1, name: 'Skinning Knife', text: 'He cleans the blade on his sleeve and his wounds close.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 1, name: 'Snap', text: 'Somewhere close, a trap snaps shut on nothing. She flinches anyway.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'Winter Coat', text: 'His power is revealed.' },
      { move: 3, attack: 2, name: 'Fresh Set', text: 'He buries a new trap right in her path.', effects: [{ op: 'trap', at: 'nearHeroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 2, name: 'Chain and Hook', text: 'A chain whips out of the dark and bites her ankle.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'Open Season', text: 'He stops hiding. He wants her to hear him coming.', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'He knows every inch of this ground: he heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'He works his line: he goes after whoever is closest, you or a survivor, and attacks.', effects: [{ op: 'target', who: 'any' }, { op: 'hunt' }, { op: 'attack' }] },
  power: { name: 'Winter Coat', text: 'A coat of stitched pelts, stiff as armor. 4 temporary health.', health: 4 },
  lore: [
    'Silas Kroll trapped mink and beaver on the north shore of Tamarack Lake for thirty years before the camp came. When they bought the land out from under him, he kept setting his line anyway, right through the middle of their summer.',
    'He wears a hood of stitched pelts with the face cut out, and under it a burlap mask sewn shut over the mouth. Rusted traps hang from his belt on chains. He carries a skinning knife and a long iron trap-setting hook.',
    'He never forgave them for taking his land. Every summer he takes a little of it back.',
  ],
  weakness: { text: 'Find out what the camp did to Silas Kroll. Each lore item you find makes your attacks deal +1 damage; he has never once been told he was in the right.' },
  finale: {
    name: 'The Last Set',
    text: 'Thunder, then rain that hisses out every fire in camp. He comes out of the trees 2 steps toward her and hunts only her from now on. His attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'horror', n: 1 }],
    behavior: { text: 'He has one animal left on his line: he hunts her and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt' }, { op: 'attack' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Gnawed Free', text: 'He gets up the way a trapped animal does: by tearing loose whatever is holding him down.', effects: [{ op: 'horror', n: 1 }] },
  quotes: ['"This is my land."', '"Hold still."', '"Every animal steps in one, sooner or later."', '"You’re on my line."'],
  minions: { name: 'A Trap Hound', plural: 'Trap Hounds', text: 'His lean, silent dogs, wearing collars of chain. 1 health, move 2, attack 1. They run down whoever is closest and act before he does.', health: 1, move: 2, attack: 1, max: 2, who: 'any', order: 'before' },
  terror: [
    { id: 'tr-hounds', name: 'Let the Dogs Loose', tone: 'killer', text: 'A chain rattles off a post. Something low and fast goes through the ferns.', effects: [{ op: 'spawnMinion', at: 'nearKiller', n: 1 }, { op: 'minionsAct' }] },
    { id: 'tr-set', name: 'A New Set', tone: 'killer', text: 'Leaves are scraped back over fresh steel, right beside the path she is on.', effects: [{ op: 'trap', at: 'nearHeroine' }] },
    { id: 'tr-drag', name: 'Drag Marks', tone: 'killer', text: 'A long furrow through the pine needles, and at the end of it, him.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'tr-line', name: 'Running the Line', tone: 'killer', text: 'He checks his traps one by one, and now he is somewhere else entirely.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'tr-notches', name: 'Notches', tone: 'killer', text: 'He cuts another notch in the handle of the trap-setter.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'tr-whet', name: 'Whetstone', tone: 'killer', text: 'Stone on steel, slow and patient, out in the dark.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'tr-shack', name: 'Back to the Shack', tone: 'killer', text: 'A lantern comes on in the old shack. He has gone home to fetch more steel.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'tr-snapped', name: 'Snapped Shut', tone: 'calm', text: 'One of his own old traps catches his boot. He stands there working it loose.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-lease', name: 'Trapline Lease, 1938', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: 'Ninety-nine years, signed by the county to S. Kroll. Stamped across it in 1958, in the camp’s purple ink: VOID. Nobody ever told him it could be voided.' },
    { id: 'lore-nametag', name: 'Camper’s Name Tag', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him. Horror −1.', onGain: [{ op: 'horror', n: -1 }], lore: 'HI! MY NAME IS: DOUGIE, CABIN 4, 1961. On the back, in a child’s pencil: “the trap man carried me all the way to the nurse. he was crying.”' },
  ],
};
