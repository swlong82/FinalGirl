import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Four.
export const snowblind: KillerPack = {
  id: 'the-snowblind',
  name: 'The Snowblind',
  epithet: 'Wes Corder, who came down off the mountain',
  art: 'snowblind',
  health: 8,
  armor: 1,
  attackDice: 2,
  attackThreshold: 4,
  speed: 1,
  frenzyAt: 6,
  finaleAt: 12,
  bloodlustMax: 14,
  lore: [
    'Wes Corder spent three days under the Kettle Bowl slide with his eyes open to the snow. When they reached him the cold had taken his sight, and something in him had frozen too.',
    "He still wears his patrol parka and the frosted goggles he had on that morning, the lenses rimed white. He carries his avalanche probe and an ice axe. He can't see you. He listens for you: breathing, footsteps, a heartbeat.",
    'Every time he sounds the siren, someone pays for the run that should have stayed closed.',
  ],
  weakness: { text: 'Find what the lodge buried in 1974. Each lore item strips 1 armor; the truth hurts him more than steel.' },
  finale: {
    name: 'The Slide',
    text: 'The siren sounds three long blasts and the mountain answers. He comes for her through the snow, following her heartbeat.',
    armor: 1,
    attackDice: 3,
    effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'killerHeal', n: 1 }, { op: 'horror', n: 1 }],
    phases: [
      {
        name: 'Snow Blindness',
        text: 'His goggles crack and fall. Behind them his eyes are pure white, and he is still listening.',
        health: 3,
        effects: [{ op: 'horror', n: 1 }],
      },
    ],
  },
  quotes: ['"Run’s closed."', '"I can hear you breathing."', '"Three days. Three days under."', '"Nobody listens."'],
  events: [
    { id: 'sb-siren', name: 'The Avalanche Siren', tone: 'killer', text: 'Three long blasts roll down the mountain, and everyone stops talking.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }] },
    { id: 'sb-whiteout', name: 'Whiteout', tone: 'killer', text: 'The world goes white. When it clears, he is somewhere else.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'sb-listen', name: 'He Listens', tone: 'killer', text: 'Absolute silence. Somewhere close, someone is holding their breath, just as she is.', effects: [{ op: 'if', cond: { c: 'alone' }, then: [{ op: 'horror', n: 1 }], else: [{ op: 'killerMove', toward: 'heroine', steps: 1 }] }] },
    { id: 'sb-probe', name: 'Probe Line', tone: 'killer', text: 'He walks a straight line, stabbing the snow every step.', effects: [{ op: 'bloodlust', n: 2 }] },
    { id: 'sb-axe', name: 'The Ice Axe', tone: 'killer', text: 'Steel scrapes on ice, slowly, as he sharpens it.', effects: [{ op: 'mod', key: 'killerAttackDice', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'sb-patrol', name: 'Back to the Hut', tone: 'killer', text: 'His radio crackles with a patrol call from 1974. He goes to answer it.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'sb-thaw', name: 'Snow in His Ears', tone: 'calm', text: 'He stands still and shakes his head. For now he can’t hear a thing.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  terrorEvery: 4,
  terror: [
    { id: 'sbt-rime', name: 'Frost Rime', tone: 'killer', text: 'Ice builds up over his parka like armor plate.', effects: [{ op: 'killerArmor', n: 1 }] },
    { id: 'sbt-buried', name: 'Buried and Unburied', tone: 'killer', text: 'He walks into a drift and walks out of it whole.', effects: [{ op: 'killerHeal', n: 2 }] },
    { id: 'sbt-drift', name: 'Out of the Drift', tone: 'killer', text: 'The snowbank next to her stands up.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
    { id: 'sbt-hypo', name: 'Hypothermia', tone: 'killer', text: 'Her hands won’t stop shaking. Her lips have gone blue.', effects: [{ op: 'wound', n: 1 }] },
    { id: 'sbt-heartbeat', name: 'He Hears Your Heart', tone: 'killer', text: 'Thump. Thump. She can hear it too now, and so can he.', effects: [{ op: 'horror', n: 2 }] },
  ],
  items: [
    { id: 'lore-patrolreport', name: "Patrol Report, Jan '74", kind: 'lore', text: 'Lore. Killer armor −1.', onGain: [{ op: 'killerArmor', n: -1 }], lore: 'Signed W. Corder: “Kettle Bowl cornice loaded. Recommend closure, NO EXCEPTIONS.” Across it, in red pen, the owner wrote: “Open it.”' },
    { id: 'lore-beacon', name: "Corder's Avalanche Beacon", kind: 'lore', text: 'Lore. Killer armor −1. Thaw out.', onGain: [{ op: 'killerArmor', n: -1 }, { op: 'warm' }], lore: 'Still switched on, still beeping, twelve years later. Scratched into the case: “If you find me, it’s already too late.”' },
  ],
};
