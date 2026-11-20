import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature One.
export const projectionist: KillerPack = {
  id: 'the-projectionist',
  name: 'The Projectionist',
  epithet: 'Orrin Vale, who never left the booth',
  health: 10,
  armor: 1,
  attackDice: 2,
  attackThreshold: 4,
  speed: 1,
  frenzyAt: 6,
  finaleAt: 12,
  bloodlustMax: 14,
  lore: [
    'Orrin Vale ran the Holloway projectors for nineteen years. He spliced every reel by hand, kept a logbook of every audience, and believed — truly believed — that a film only lived while someone was watching it.',
    'When the booth burned in 1979, the crowd honked their horns at the flames. Orrin heard them through the smoke. He has been waiting five years to give them an encore.',
    'He wears a mask hammered from an empty film canister, the sprocket holes punched out for eyes. He carries his splicing shears. He hums the countdown leader — 8… 7… 6… — as he walks.',
  ],
  weakness: {
    text: "Find the pieces of Orrin's past. Each lore item you uncover strips 1 armor — he remembers what he was, and hesitates.",
  },
  finale: {
    name: 'The Last Reel',
    text: 'The screen goes white. Every speaker counts down. He comes for her, and only her: armor resets (minus lore found), attack dice 3, and he appears at her side.',
    armor: 1,
    attackDice: 3,
    effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'killerHeal', n: 1 }, { op: 'horror', n: 1 }],
    phases: [
      {
        name: 'Burn Out',
        text: 'His canister mask splits down the middle. Burning film trails behind him. One more reel.',
        health: 3,
        effects: [{ op: 'horror', n: 1 }],
      },
    ],
  },
  art: 'projectionist',
  terrorEvery: 4,
  terror: [
    { id: 'pt-sprocket', name: 'Sprocket Tear', tone: 'killer', text: 'The film snaps and whips loose. He splices it back with his teeth — and smiles.', effects: [{ op: 'killerHeal', n: 2 }, { op: 'horror', n: 1 }] },
    { id: 'pt-wrapped', name: 'Wrapped in Celluloid', tone: 'killer', text: 'He winds strips of film around his arms like bandages. Blades skid off them.', effects: [{ op: 'killerArmor', n: 1 }] },
    { id: 'pt-remembers', name: 'The Reel Remembers', tone: 'killer', text: 'Every frame he ever spliced shows him where she is.', effects: [{ op: 'killerTeleport', to: 'heroine' }] },
    { id: 'pt-flare', name: 'Projector Flare', tone: 'killer', text: 'The beam swings off the screen and floods the lot with white.', effects: [{ op: 'if', cond: { c: 'horrorAtLeast', n: 3 }, then: [{ op: 'horror', n: 2 }], else: [{ op: 'horror', n: 1 }, { op: 'wound', n: 1 }] }] },
    { id: 'pt-fullhouse', name: 'Full House', tone: 'killer', text: 'Headlights. A whole carload pulls in right next to him, laughing. He turns toward them.', effects: [{ op: 'spawn', at: 'nearKiller', n: 2 }] },
  ],
  quotes: [
    '"Eight… seven… six…"',
    '"Eyes on the screen."',
    '"Nobody leaves before the credits."',
    '"The show must be watched."',
  ],
  events: [
    { id: 'kv-reelchange', name: 'Reel Change', tone: 'killer', text: 'A cigarette burn flickers in the corner of the screen. He is back in the booth — threading the next reel.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'kv-countdown', name: 'The Countdown Leader', tone: 'killer', text: 'Every speaker on the lot: 8… 7… 6… The numbers burn white on the screen.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 1 }, { op: 'horror', n: 1 }] },
    { id: 'kv-splice', name: 'Fresh Splice', tone: 'killer', text: 'He wipes the shears on his apron. Snip. Snip.', effects: [{ op: 'mod', key: 'killerAttackDice', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'kv-onscreen', name: 'Her Face on the Screen', tone: 'killer', text: "The projector shows live footage — of her, right now, from somewhere close.", effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }] },
    { id: 'kv-burn', name: 'Nitrate Smoke', tone: 'dread', text: 'The smell of burning film. Eyes water. Lungs ache.', effects: [{ op: 'if', cond: { c: 'killerAdjacent' }, then: [{ op: 'horror', n: 2 }], else: [{ op: 'horror', n: 1 }] }] },
    { id: 'kv-logbook', name: 'He Counts the Audience', tone: 'killer', text: 'Somewhere a pencil scratches a tally. He knows exactly how many are left.', effects: [{ op: 'bloodlust', n: 2 }] },
    { id: 'kv-silence', name: 'Dead Air', tone: 'calm', text: 'The projector stops. The silence is worse — but at least he is busy.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-logbook', name: "Orrin's Logbook", kind: 'lore', text: 'Lore. Killer armor −1.', onGain: [{ op: 'killerArmor', n: -1 }], lore: "Every show since 1960, every car counted. The last entry, 10/31/79, reads: 'Full house. They'll finally see it.'" },
    { id: 'lore-reel', name: 'The Unfinished Reel', kind: 'lore', text: 'Lore. Killer armor −1. Fight +1 die (as a weapon).', fightDice: 1, onGain: [{ op: 'killerArmor', n: -1 }], lore: "Hand-labeled VALE — ORIGINAL. A film he shot himself, never screened. Twelve minutes of an empty lot, waiting for an audience." },
  ],
};
