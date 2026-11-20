import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Two.
export const tidewife: KillerPack = {
  id: 'the-tidewife',
  name: 'The Tidewife',
  epithet: 'Hester Crane, who is still waiting',
  art: 'tidewife',
  health: 7,
  armor: 0,
  attackDice: 2,
  attackThreshold: 4,
  speed: 1,
  frenzyAt: 6,
  finaleAt: 12,
  bloodlustMax: 14,
  lore: [
    'Hester Crane kept the lighthouse log after her husband went out to sea. Every entry from October 1951 is the same: "No sign. Lamp lit. Waiting."',
    'She wears his oilskin coat, still dripping, and a lace wedding veil gone grey with salt. She carries a gaff hook in one hand and her storm lantern in the other. Where she walks, the floor is wet.',
    'She does not run. She does not need to. The tide always comes back.',
  ],
  weakness: { text: "Find what Hester lost. Each lore item you recover strips 1 armor — and shows her the waiting is over." },
  finale: {
    name: 'The Drowning Hour',
    text: 'The lamp swings round and stops on her. Seawater pours from every drain. She comes for her, and only her.',
    armor: 1,
    attackDice: 3,
    effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'killerHeal', n: 2 }, { op: 'horror', n: 1 }],
    phases: [
      {
        name: 'The Lantern Goes Out',
        text: 'Her lantern shatters. In the dark her veil lifts, and there is only water underneath.',
        health: 3,
        effects: [{ op: 'horror', n: 2 }],
      },
    ],
  },
  quotes: ['"Have you seen his boat?"', '"The lamp is lit. Come home."', '"Stay. Stay with me."', '"The water is warm, love."'],
  events: [
    { id: 'tw-undertow', name: 'Undertow', tone: 'killer', text: 'She steps into a puddle at the lighthouse and steps out of one somewhere else.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'tw-lamp', name: 'The Lamp Turns', tone: 'killer', text: 'The great beam sweeps the point and stops. It is pointing at her.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }] },
    { id: 'tw-wet', name: 'Wet Footprints', tone: 'killer', text: 'A trail of puddles leads right up to where she is standing.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 1 }, { op: 'horror', n: 1 }] },
    { id: 'tw-hymn', name: 'Sailor\'s Hymn', tone: 'killer', text: 'Humming from under the floorboards — an old hymn for sailors who never came home.', effects: [{ op: 'bloodlust', n: 2 }] },
    { id: 'tw-hook', name: 'The Gaff Hook', tone: 'killer', text: 'Scrape. Scrape. Along every cabin wall.', effects: [{ op: 'mod', key: 'killerAttackDice', n: 1 }, { op: 'horror', n: 1 }] },
    { id: 'tw-return', name: 'Back to the Lamp', tone: 'killer', text: 'The lamp gutters. She has gone back to tend it.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'tw-weeping', name: 'Weeping at the Window', tone: 'calm', text: 'She stops to grieve. For a moment, she is only a widow.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  terrorEvery: 4,
  terror: [
    { id: 'twt-flood', name: 'The Floodwater Rises', tone: 'killer', text: 'Seawater pours in under every door. She heals in it.', effects: [{ op: 'killerHeal', n: 2 }] },
    { id: 'twt-barnacle', name: 'Barnacled Skin', tone: 'killer', text: 'Her hands are crusted with shell. Steel scrapes and slides.', effects: [{ op: 'killerArmor', n: 1 }] },
    { id: 'twt-riptide', name: 'Riptide', tone: 'killer', text: 'The ground turns to wet sand under your feet and drags you toward her.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
    { id: 'twt-drowned', name: 'The Drowned Rise', tone: 'killer', text: 'Shapes stand up in the shallows: everyone she has taken. They only watch. That is worse.', effects: [{ op: 'horror', n: 2 }] },
    { id: 'twt-saltlungs', name: 'Salt in the Lungs', tone: 'killer', text: 'Every breath tastes of brine. You cough up seawater.', effects: [{ op: 'wound', n: 1 }] },
  ],
  items: [
    { id: 'lore-letter', name: "The Keeper's Last Letter", kind: 'lore', text: 'Lore. Killer armor −1.', onGain: [{ op: 'killerArmor', n: -1 }], lore: '"Hes — if the weather turns, don\'t wait on the dock. Light the lamp and go to bed. I will find my way. I always do. — E."' },
    { id: 'lore-ring', name: 'Wedding Ring in the Weed', kind: 'lore', text: 'Lore. Killer armor −1. Horror −1.', onGain: [{ op: 'killerArmor', n: -1 }, { op: 'horror', n: -1 }], lore: 'Engraved inside: "E & H — till the tide." It was found in the tidepools, a hundred yards from where his boat went down.' },
  ],
};
