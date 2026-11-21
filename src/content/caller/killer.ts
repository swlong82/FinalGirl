import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Five.
export const caller: KillerPack = {
  id: 'the-caller',
  name: 'The Caller',
  epithet: 'Mister Request, who always called at three',
  art: 'caller',
  health: 24,
  horror: 2,
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'On Hold', text: 'Breathing on an open line.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 2, name: 'Collect Call', text: 'He accepts the charges, and his wounds close.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 2, name: 'Party Line', text: 'Every voice he ever recorded talks at once, all of them begging.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'Off the Hook', text: 'His power is revealed.' },
      { move: 3, attack: 3, name: 'Long Distance', text: 'His voice is on the line. And then it is right in her ear.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 3, name: 'Busy Signal', text: 'A droning tone in her skull that will not stop.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'On the Air', text: 'Sixty miles of listeners hear her breathing.', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'Are you still there? He heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'He calls on his listeners first: he goes for the closest survivor (you, if there are none) and attacks.', effects: [{ op: 'target', who: 'npc' }, { op: 'hunt' }, { op: 'attack' }] },
  power: { name: 'Wrapped in Cable', text: 'He winds microphone cable around his chest, layer after layer. 3 temporary health; while it holds, he moves +1.', health: 3, move: 1 },
  lore: [
    'Nobody ever learned his name. For ten years he called the overnight show at exactly 3:00 a.m., polite and soft-spoken, with a perfect memory for every song the station had ever played.',
    'He wears a long rain slicker and a mask made from the chrome grille of an old ribbon microphone, punched with a thousand little holes he breathes through. He has wrapped a coiled phone cord around both fists.',
    'He only wants what he always got: someone on the other end of the line who is listening.',
  ],
  weakness: { text: 'Find out who Mister Request really was. Each lore item you find makes your attacks deal +1 damage; nobody has ever said his name back to him.' },
  finale: {
    name: 'The Last Request',
    text: 'Every speaker in the building goes quiet. Then the phone rings in her hand, and he is standing behind her. From now on he hunts only her; his attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }],
    behavior: { text: 'He has only one listener left: he hunts her and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt' }, { op: 'attack' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Off the Air', text: 'The tower light dies. In the silence his mask whistles with every breath, and he hums the station jingle.', effects: [{ op: 'horror', n: 1 }] },
  quotes: ['"Are you still there?"', '"Long-time listener."', '"Play it for me. Play it for me."', '"Don’t hang up."'],
  terror: [
    { id: 'cl-ring', name: 'It’s For You', tone: 'killer', text: 'A phone rings beside her. When she looks back, the hallway is shorter.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 1 }, { op: 'horror', n: 1 }] },
    { id: 'cl-deadair', name: 'Dead Air', tone: 'killer', text: 'The broadcast cuts to silence. Wherever he was, he isn’t now.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'cl-line', name: 'Breathing on the Line', tone: 'killer', text: 'Slow breathing comes through every speaker in the building, and it is getting closer to the mic.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'cl-dedication', name: 'Long-Time Listener', tone: 'killer', text: 'A tally in grease pencil on the studio glass. He counts his audience.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'cl-cord', name: 'The Coiled Cord', tone: 'killer', text: 'He wraps the cord one more time around his knuckles.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'cl-signal', name: 'Back to the Signal', tone: 'killer', text: 'Static swallows the broadcast. He has climbed back up to the transmitter.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'cl-hold', name: 'Please Hold', tone: 'calm', text: 'Hold music. He waits politely for someone to pick up.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-calllog', name: 'Overnight Call Log', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: 'Ten years of 3:00 a.m. entries in different DJs’ handwriting. The last one, from this June: “M.R. called. Told him the show’s ending. He said: then who will I talk to?”' },
    { id: 'lore-reel', name: 'Unaired Reel-to-Reel', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him. +1 nerve.', onGain: [{ op: 'nerve', n: 1 }], lore: 'Labeled only “M.R. — DO NOT AIR.” A gentle voice: “My mother kept the radio on all night so the house wouldn’t be quiet. After she passed, you were all I had.”' },
  ],
};
