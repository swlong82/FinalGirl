import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Nine (Season 2).
export const mirrorball: KillerPack = {
  id: 'the-mirrorball',
  name: 'The Mirrorball',
  epithet: 'Lonnie Vale, the King of the Rink',
  art: 'mirrorball',
  health: 9,
  horror: 2,
  gimmick: {
    kind: 'fear',
    name: 'Reflections',
    text: '{He} feeds on her fear. At horror 5 or more {he} moves 1 farther. At horror 6 {he} hits 1 harder, and heals 1 every Upkeep. Keep calm.',
  },
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'Warm-Up Laps', text: 'Slow circles in the dark, the wheels barely whispering.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 1, name: 'Polish', text: 'He buffs a cracked tile until it shines, and his wounds shine with it.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 1, name: 'Hall of Mirrors', text: 'She sees her own terrified face in every tile of his mask, a thousand times over.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'Spotlight Dance', text: 'His power is revealed.' },
      { move: 3, attack: 2, name: 'Spin Move', text: 'A blur of light, and he is right beside her.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 2, name: 'Toe Stop', text: 'A kick with a sharpened toe stop, quick as a wink.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'The Crown', text: 'He is King of the Rink again, and everyone has to watch.', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'Her fear is the brightest light in the room: he heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'He skates for whoever is closest, you or a survivor, and attacks.', effects: [{ op: 'target', who: 'any' }, { op: 'hunt' }, { op: 'attack' }] },
  power: {
    name: 'Spotlight Dance',
    text: 'The spotlight swings to him and his suit blazes. 3 temporary health; while it holds, every Upkeep she spends next to him costs her horror +1.',
    health: 3,
    upkeep: [{ op: 'if', cond: { c: 'killerAdjacent' }, then: [{ op: 'horror', n: 1 }] }],
  },
  lore: [
    'Lonnie Vale grew up two blocks from the seawall and skated every day the Rollerdrome was open. In 1977, at seventeen, he won the Gulf Coast Roller Disco Championship and they put a silver crown on his head.',
    'He wears a helmet covered in mirror tiles, with no eyeholes anyone can find, a silver satin jacket split down the back, and white skates with toe stops filed to points. When he moves, light comes off him in a thousand pieces.',
    'He doesn’t look at you. He looks at himself in your eyes, and he likes it best when you are afraid.',
  ],
  weakness: { text: 'Find out who loosened the rig. Each lore item you find makes your attacks deal +1 damage; he has never seen himself the way the crowd saw him that night.' },
  finale: {
    name: 'The Last Dance',
    text: 'The mirror ball drops to the floor and shatters. He glides 2 toward her through the glitter, hunts only her, and his attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'horror', n: 2 }],
    behavior: { text: 'It’s the last song, and she is his partner: he hunts her and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt' }, { op: 'attack' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Encore', text: 'The crowd that isn’t there starts clapping. He rises on his skates, bows, and holds out a hand to her.', effects: [{ op: 'horror', n: 1 }] },
  quotes: ['"Couples only."', '"May I have this dance?"', '"Look at me. LOOK at me."', '"Long live the King."'],
  minions: { name: 'A Rink Rat', plural: 'Rink Rats', text: 'Kids in mirror-tile masks who skate with him now. 1 health, move 2, attack 1. They go for her and act before he does.', health: 1, move: 2, attack: 1, max: 2, who: 'heroine', order: 'before' },
  terror: [
    { id: 'mb-rats', name: 'Rink Rats', tone: 'killer', text: 'A pack of skaters in mirror masks swoops out of the fog, all moving together.', effects: [{ op: 'spawnMinion', at: 'random', n: 1 }, { op: 'minionsAct' }] },
    { id: 'mb-spotlight', name: 'The Spotlight', tone: 'killer', text: 'A spotlight snaps on and pins her. Something glitters, coming toward the light.', effects: [{ op: 'horror', n: 1 }, { op: 'killerMove', toward: 'heroine', steps: 1 }] },
    { id: 'mb-glide', name: 'Glide', tone: 'killer', text: 'The whisper of wheels on maple, faster, faster.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'mb-crown', name: 'King of the Rink', tone: 'killer', text: 'He straightens a silver paper crown on his mirrored head.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'mb-toestops', name: 'Filed Toe Stops', tone: 'killer', text: 'Grinding, in the dark: metal on a whetstone, in time with the beat.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'mb-blackout', name: 'Lights Out', tone: 'killer', text: 'Every light dies. When the rig comes back, he is somewhere else.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'mb-rig', name: 'Back to the Rig', tone: 'killer', text: 'The catwalk creaks overhead. He is up there again, watching.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'mb-laces', name: 'Tangled Laces', tone: 'calm', text: 'He catches a wheel on a cord and goes down hard, and lies there, glittering.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-sash', name: 'King of the Rink Sash', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: 'Silver lamé, 1977. Pinned to it, a newspaper photo: Lonnie, beaming, with his crown, and behind him in the crowd three boys looking up at the light rig.' },
    { id: 'lore-polaroid', name: 'Contest Polaroid', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him. Horror −1.', onGain: [{ op: 'horror', n: -1 }], lore: 'A boy on skates, mid-spin, arms out, so happy he is blurred. On the white strip: “Lonnie, 1978 final. Before.”' },
  ],
};
