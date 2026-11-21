import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature One.
export const projectionist: KillerPack = {
  id: 'the-projectionist',
  name: 'The Projectionist',
  epithet: 'Orrin Vale, who never left the booth',
  health: 9,
  horror: 2,
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'Threading the Reel', text: 'He waits in the booth.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 1, name: 'Sprocket Tear', text: 'He splices himself back together with his teeth.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 1, name: 'Projector Flare', text: 'The beam swings off the screen and floods the lot.', effects: [{ op: 'if', cond: { c: 'horrorAtLeast', n: 3 }, then: [{ op: 'horror', n: 2 }], else: [{ op: 'horror', n: 1 }] }] },
      { move: 2, attack: 2, name: 'The Reel Turns', text: 'His power is revealed.' },
      { move: 3, attack: 2, name: 'The Reel Remembers', text: 'Every frame he ever spliced shows him where she is.', effects: [{ op: 'killerTeleport', to: 'heroine' }] },
      { move: 3, attack: 2, name: 'Full House', text: 'Headlights: a carload pulls in right next to him.', effects: [{ op: 'spawn', at: 'nearKiller', n: 1 }] },
      { move: 3, attack: 3, name: 'Final Countdown', text: '8… 7… 6…', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'Every speaker counts down, and he splices himself back together: he heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'He goes for whoever is closest, a survivor or you, and attacks.', effects: [{ op: 'target', who: 'any' }, { op: 'hunt' }, { op: 'attack' }] },
  power: { name: 'Wrapped in Celluloid', text: 'He winds strips of film around his arms like bandages. 3 temporary health; while it holds, his attacks deal +1.', health: 3, attack: 1 },
  lore: [
    'Orrin Vale ran the Holloway projectors for nineteen years. He spliced every reel by hand, kept a logbook of every audience, and believed — truly believed — that a film only lived while someone was watching it.',
    'When the booth burned in 1979, the crowd honked their horns at the flames. Orrin heard them through the smoke. He has been waiting five years to give them an encore.',
    'He wears a mask hammered from an empty film canister, the sprocket holes punched out for eyes. He carries his splicing shears. He hums the countdown leader — 8… 7… 6… — as he walks.',
  ],
  weakness: {
    text: "Find the pieces of Orrin's past. Each lore item you find makes your attacks deal +1 damage — he remembers what he was, and hesitates.",
  },
  finale: {
    name: 'The Last Reel',
    text: 'The screen goes white. Every speaker counts down. He heals 2, moves 2 toward her, and from now on hunts only her. His attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerHeal', n: 2 }, { op: 'horror', n: 1 }, { op: 'killerMove', toward: 'heroine', steps: 2 }],
    behavior: { text: 'He comes for her and only her, and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt' }, { op: 'attack' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Burn Out', text: 'His canister mask splits down the middle. Burning film trails behind him.', effects: [{ op: 'horror', n: 1 }] },
  art: 'projectionist',
  quotes: [
    '"Eight… seven… six…"',
    '"Eyes on the screen."',
    '"Nobody leaves before the credits."',
    '"The show must be watched."',
  ],
  minions: { name: 'A Charred Patron', plural: 'Charred Patrons', text: 'The audience from the 1979 fire, still in their seats, still watching. 2 health, move 1, attack 1. They go for whoever is closest and act after he does.', health: 2, move: 1, attack: 1, max: 2, who: 'any', order: 'after' },
  terror: [
    { id: 'kv-frontrow', name: 'Reserved Seating', tone: 'killer', text: 'Someone is sitting in the front row of the burned-out booth. It turns its head toward her. It is still smoking.', effects: [{ op: 'spawnMinion', at: 'lair', n: 1 }, { op: 'minionsAct' }] },
    { id: 'kv-reelchange', name: 'Reel Change', tone: 'killer', text: 'A cigarette burn flickers in the corner of the screen. He is back in the booth — threading the next reel.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'kv-countdown', name: 'The Countdown Leader', tone: 'killer', text: 'Every speaker on the lot: 8… 7… 6… The numbers burn white on the screen.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 1 }, { op: 'horror', n: 1 }] },
    { id: 'kv-splice', name: 'Fresh Splice', tone: 'killer', text: 'He wipes the shears on his apron. Snip. Snip.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'kv-onscreen', name: 'Her Face on the Screen', tone: 'killer', text: "The projector shows live footage — of her, right now, from somewhere close.", effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'kv-burn', name: 'Nitrate Smoke', tone: 'dread', text: 'The smell of burning film. Eyes water. Lungs ache.', effects: [{ op: 'if', cond: { c: 'killerAdjacent' }, then: [{ op: 'horror', n: 2 }], else: [{ op: 'horror', n: 1 }] }] },
    { id: 'kv-logbook', name: 'He Counts the Audience', tone: 'killer', text: 'Somewhere a pencil scratches a tally. He knows exactly how many are left.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'kv-silence', name: 'Dead Air', tone: 'calm', text: 'The projector stops. The silence is worse — but at least he is busy.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-logbook', name: "Orrin's Logbook", kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: "Every show since 1960, every car counted. The last entry, 10/31/79, reads: 'Full house. They'll finally see it.'" },
    { id: 'lore-reel', name: 'The Unfinished Reel', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: "Hand-labeled VALE — ORIGINAL. A film he shot himself, never screened. Twelve minutes of an empty lot, waiting for an audience." },
  ],
};
