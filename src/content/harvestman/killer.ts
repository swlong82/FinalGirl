import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Ten (Season 2).
export const harvestman: KillerPack = {
  id: 'the-harvestman',
  name: 'The Harvestman',
  epithet: 'Abel Harrow, who was sent out to stand in the field',
  art: 'harvestman',
  health: 10,
  horror: 2,
  gimmick: {
    kind: 'stalk',
    name: 'Only When You Move',
    text: '{He} moves only when you do: on {his} turn {he} moves exactly as far as you walked that turn (at least 1, at most 4), whatever {his} bloodlust says. Stand still, and {he} only creeps.',
    max: 4,
  },
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'On His Pole', text: 'Straw rustles. Something tall in the field has turned its head.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 1, name: 'Restitched', text: 'He pulls fresh straw from a bale and stuffs it into his wounds.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 1, name: 'Burlap Smile', text: 'The stitched mouth on his sack face has been pulled wider since she last saw it.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'Stuffed with Straw', text: 'His power is revealed.' },
      { move: 3, attack: 2, name: 'Right Behind You', text: 'She stops to listen. When she turns, he is standing in the row behind her.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 2, name: 'Corn Hook', text: 'A curved blade flicks out of the stalks and is gone.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'Harvest', text: 'The field is ready. So is he.', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'There is always more straw: he heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'He goes for whoever is closest, you or a survivor, moving only as far as you walked this turn, and attacks.', effects: [{ op: 'target', who: 'any' }, { op: 'hunt' }, { op: 'attack' }] },
  power: { name: 'Stuffed with Straw', text: 'Blades go in and come out clean. 4 temporary health.', health: 4 },
  lore: [
    'In October 1958, Abel Harrow, fifteen, was caught setting fire to the hay barn. His father walked him out to the middle of the maze, stood him beside the scarecrow’s pole, and told him he could come in when he had learned to stand still.',
    'He wears the old scarecrow’s clothes: a farmer’s coat stiff with dirt, a flat hat, and a burlap sack for a face, the eyes and mouth stitched in black twine. Straw sticks out at his cuffs and collar. He carries a hooked corn knife with a hand-worn grip.',
    'He learned to stand still. He stands still until you move, and then he moves exactly as much as you did.',
  ],
  weakness: { text: 'Find out what happened the night Abel went out to the field. Each lore item you find makes your attacks deal +1 damage; nobody ever came out to cut him down.' },
  finale: {
    name: 'The Reaping',
    text: 'Every scarecrow in the county is gone from its pole. He comes 2 toward her and hunts only her from now on, 1 step farther every turn. His attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'horror', n: 1 }],
    behavior: { text: 'Harvest time: he hunts her, 1 step farther than she walked, and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt', extra: 1 }, { op: 'attack' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Restuffed', text: 'He lies still in the furrow, and straw creeps back in at his cuffs and collar. Then he sits up.', effects: [{ op: 'horror', n: 1 }] },
  quotes: ['"Stand still."', '"I stood still. I stood still all night."', '"Nobody came to get me."', '"Don’t you move."'],
  minions: { name: 'A Scarecrow', plural: 'Scarecrows', text: 'Scarecrows from the neighbors’ fields, climbed down off their poles. 2 health, move 1, attack 1. They go for the closest survivor and act after he does.', health: 2, move: 1, attack: 1, max: 2, who: 'npc', order: 'after' },
  terror: [
    { id: 'hm-poles', name: 'Off Their Poles', tone: 'killer', text: 'At the edge of the field, a scarecrow climbs down off its pole.', effects: [{ op: 'spawnMinion', at: 'nearKiller', n: 1 }, { op: 'minionsAct' }] },
    { id: 'hm-rustle', name: 'Something in the Rows', tone: 'killer', text: 'A rustle racing along the next row over, keeping pace with her.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'hm-whet', name: 'Whetted Hook', tone: 'killer', text: 'A file rasping on a curved blade, out in the dark.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'hm-notches', name: 'Notches on the Pole', tone: 'killer', text: 'Fresh notches in the scarecrow’s pole, one under another.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'hm-rows', name: 'Into the Rows', tone: 'killer', text: 'The corn closes behind him like water. He could be anywhere now.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'hm-pole', name: 'Back on His Pole', tone: 'killer', text: 'He goes home to stand where he was put, and to wait.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'hm-freeze', name: 'Don’t Move', tone: 'killer', text: 'Every instinct she has says freeze. Something close by is waiting for her to twitch.', effects: [{ op: 'if', cond: { c: 'alone' }, then: [{ op: 'horror', n: 1 }], else: [{ op: 'killerMove', toward: 'heroine', steps: 1 }] }] },
    { id: 'hm-wind', name: 'Straw in the Wind', tone: 'calm', text: 'A gust tears straw out of his coat, and he stops to gather every piece.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-almanac', name: 'Farmer’s Almanac, 1958', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: 'In the margin of October, in a father’s hard pencil: “Sent A. out to the field. Let him learn.” Under it, a week later, in another hand: “He’s still out there. Go GET him.” Nobody went.' },
    { id: 'lore-photo', name: 'Family Photograph', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him. +1 nerve.', onGain: [{ op: 'nerve', n: 1 }], lore: 'The Harrows on the porch, autumn 1958: mother, father, three girls. Someone has cut out the space at the end of the row where a tall boy would have stood.' },
  ],
};
