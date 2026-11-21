import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Two.
export const tidewife: KillerPack = {
  id: 'the-tidewife',
  name: 'The Tidewife',
  epithet: 'Hester Crane, who is still waiting',
  art: 'tidewife',
  health: 23,
  horror: 2,
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'Waiting', text: 'She stands at the end of the dock.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 2, name: 'The Floodwater Rises', text: 'Seawater pours in under every door. She heals in it.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 2, name: 'The Drowned Rise', text: 'Shapes stand up in the shallows. They only watch. That is worse.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'The Lamp Turns', text: 'Her power is revealed.' },
      { move: 3, attack: 3, name: 'Riptide', text: 'The ground turns to wet sand and drags her toward the Tidewife.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 3, name: 'Salt in the Lungs', text: 'Every breath tastes of brine.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'High Water', text: 'The tide is in for good.', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'The water keeps rising: she heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'She drowns the strays first: she goes for the closest survivor (you, if there are none) and attacks.', effects: [{ op: 'target', who: 'npc' }, { op: 'hunt' }, { op: 'attack' }] },
  power: { name: 'Barnacled Skin', text: 'Her hands are crusted with shell. 3 temporary health; while it holds, she heals 1 every Upkeep.', health: 3, upkeep: [{ op: 'killerHeal', n: 1 }] },
  lore: [
    'Hester Crane kept the lighthouse log after her husband went out to sea. Every entry from October 1951 is the same: "No sign. Lamp lit. Waiting."',
    'She wears his oilskin coat, still dripping, and a lace wedding veil gone grey with salt. She carries a gaff hook in one hand and her storm lantern in the other. Where she walks, the floor is wet.',
    'She does not run. She does not need to. The tide always comes back.',
  ],
  weakness: { text: 'Find what Hester lost. Each lore item you find makes your attacks deal +1 damage — and shows her the waiting is over.' },
  finale: {
    name: 'The Drowning Hour',
    text: 'The lamp swings round and stops on her. Seawater pours from every drain. She heals 2, moves 2 toward her, and from now on hunts only her. Move +1, attacks +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerHeal', n: 2 }, { op: 'horror', n: 1 }, { op: 'killerMove', toward: 'heroine', steps: 2 }],
    behavior: { text: 'She comes for her and only her, and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt' }, { op: 'attack' }] },
    attack: 1, move: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'The Lantern Goes Out', text: 'Her lantern shatters. In the dark her veil lifts, and there is only water underneath.', effects: [{ op: 'horror', n: 2 }] },
  quotes: ['"Have you seen his boat?"', '"The lamp is lit. Come home."', '"Stay. Stay with me."', '"The water is warm, love."'],
  terror: [
    { id: 'tw-undertow', name: 'Undertow', tone: 'killer', text: 'She steps into a puddle at the lighthouse and steps out of one somewhere else.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'tw-lamp', name: 'The Lamp Turns', tone: 'killer', text: 'The great beam sweeps the point and stops. It is pointing at her.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'tw-wet', name: 'Wet Footprints', tone: 'killer', text: 'A trail of puddles leads right up to where she is standing.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 1 }, { op: 'horror', n: 1 }] },
    { id: 'tw-hymn', name: 'Sailor\'s Hymn', tone: 'killer', text: 'Humming from under the floorboards — an old hymn for sailors who never came home.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'tw-hook', name: 'The Gaff Hook', tone: 'killer', text: 'Scrape. Scrape. Along every cabin wall.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'horror', n: 1 }] },
    { id: 'tw-return', name: 'Back to the Lamp', tone: 'killer', text: 'The lamp gutters. She has gone back to tend it.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'tw-weeping', name: 'Weeping at the Window', tone: 'calm', text: 'She stops to grieve. For a moment, she is only a widow.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-letter', name: "The Keeper's Last Letter", kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to her.', lore: '"Hes — if the weather turns, don\'t wait on the dock. Light the lamp and go to bed. I will find my way. I always do. — E."' },
    { id: 'lore-ring', name: 'Wedding Ring in the Weed', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to her. Horror −1.', onGain: [{ op: 'horror', n: -1 }], lore: 'Engraved inside: "E & H — till the tide." It was found in the tidepools, a hundred yards from where his boat went down.' },
  ],
};
