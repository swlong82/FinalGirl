import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Five.
export const caller: KillerPack = {
  id: 'the-caller',
  name: 'The Caller',
  epithet: 'Mister Request, who always called at three',
  art: 'caller',
  health: 8,
  armor: 1,
  attackDice: 2,
  attackThreshold: 4,
  speed: 1,
  frenzyAt: 6,
  finaleAt: 12,
  bloodlustMax: 14,
  lore: [
    'Nobody ever learned his name. For ten years he called the overnight show at exactly 3:00 a.m., polite and soft-spoken, with a perfect memory for every song the station had ever played.',
    'He wears a long rain slicker and a mask made from the chrome grille of an old ribbon microphone, punched with a thousand little holes he breathes through. He has wrapped a coiled phone cord around both fists.',
    'He only wants what he always got: someone on the other end of the line who is listening.',
  ],
  weakness: { text: 'Find out who Mister Request really was. Each lore item strips 1 armor; nobody has ever said his name back to him.' },
  finale: {
    name: 'The Last Request',
    text: 'Every speaker in the building goes quiet. Then the phone rings in her hand, and he is standing behind her.',
    armor: 1,
    attackDice: 3,
    effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'killerHeal', n: 1 }, { op: 'horror', n: 1 }],
    phases: [
      {
        name: 'Off the Air',
        text: 'The tower light dies. In the silence his mask whistles with every breath, and he hums the station jingle.',
        health: 3,
        effects: [{ op: 'horror', n: 1 }],
      },
    ],
  },
  quotes: ['"Are you still there?"', '"Long-time listener."', '"Play it for me. Play it for me."', '"Don’t hang up."'],
  events: [
    { id: 'cl-ring', name: 'It’s For You', tone: 'killer', text: 'A phone rings beside her. When she looks back, the hallway is shorter.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 1 }, { op: 'horror', n: 1 }] },
    { id: 'cl-deadair', name: 'Dead Air', tone: 'killer', text: 'The broadcast cuts to silence. Wherever he was, he isn’t now.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'cl-line', name: 'Breathing on the Line', tone: 'killer', text: 'Slow breathing comes through every speaker in the building, and it is getting closer to the mic.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }] },
    { id: 'cl-dedication', name: 'Long-Time Listener', tone: 'killer', text: 'A tally in grease pencil on the studio glass. He counts his audience.', effects: [{ op: 'bloodlust', n: 2 }] },
    { id: 'cl-cord', name: 'The Coiled Cord', tone: 'killer', text: 'He wraps the cord one more time around his knuckles.', effects: [{ op: 'mod', key: 'killerAttackDice', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'cl-signal', name: 'Back to the Signal', tone: 'killer', text: 'Static swallows the broadcast. He has climbed back up to the transmitter.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'cl-hold', name: 'Please Hold', tone: 'calm', text: 'Hold music. He waits politely for someone to pick up.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  terrorEvery: 4,
  terror: [
    { id: 'clt-longdistance', name: 'Long Distance', tone: 'killer', text: 'His voice is on the line. And then it is right in her ear.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
    { id: 'clt-party', name: 'Party Line', tone: 'killer', text: 'Every voice he ever recorded talks at once, all of them begging.', effects: [{ op: 'horror', n: 2 }] },
    { id: 'clt-wrapped', name: 'Wrapped in Cable', tone: 'killer', text: 'He winds microphone cable around his chest, layer after layer.', effects: [{ op: 'killerArmor', n: 1 }] },
    { id: 'clt-collect', name: 'Collect Call', tone: 'killer', text: 'He accepts the charges, and his wounds close.', effects: [{ op: 'killerHeal', n: 2 }] },
    { id: 'clt-busy', name: 'Busy Signal', tone: 'killer', text: 'A droning tone in her skull that will not stop. Her nose starts to bleed.', effects: [{ op: 'wound', n: 1 }] },
  ],
  items: [
    { id: 'lore-calllog', name: 'Overnight Call Log', kind: 'lore', text: 'Lore. Killer armor −1.', onGain: [{ op: 'killerArmor', n: -1 }], lore: 'Ten years of 3:00 a.m. entries in different DJs’ handwriting. The last one, from this June: “M.R. called. Told him the show’s ending. He said: then who will I talk to?”' },
    { id: 'lore-reel', name: 'Unaired Reel-to-Reel', kind: 'lore', text: 'Lore. Killer armor −1. +1 nerve.', onGain: [{ op: 'killerArmor', n: -1 }, { op: 'nerve', n: 1 }], lore: 'Labeled only “M.R. — DO NOT AIR.” A gentle voice: “My mother kept the radio on all night so the house wouldn’t be quiet. After she passed, you were all I had.”' },
  ],
};
