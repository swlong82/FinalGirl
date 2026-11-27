import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Seven (Season 2).
export const windowDresser: KillerPack = {
  id: 'the-window-dresser',
  name: 'The Window Dresser',
  epithet: 'Mr. Ambrose, who dressed the windows for thirty-one Christmases',
  art: 'dresser',
  health: 10,
  horror: 2,
  gimmick: {
    kind: 'pose',
    name: 'The Display',
    text: '{He} sets the scene before {he} strikes. At the end of {his} turn {he} poses a mannequin where the nearest people are; on {his} next turn {he} appears beside it, wherever {he} was, and attacks. If nobody is there, {he} goes after the closest instead (1 step less than {his} move). A barricade there holds {him} out. A lure that moves {him} knocks the mannequin over.',
  },
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'Window Shopping', text: 'He drifts from display to display, adjusting a sleeve, a collar.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 1, name: 'Touch-Up', text: 'A dab of paint, a little putty, and his cracks are gone.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 1, name: 'The Family at the Table', text: 'She sees the window display, and she recognizes the faces.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'Under Glass', text: 'His power is revealed.' },
      { move: 3, attack: 2, name: 'Posed', text: 'A mannequin is standing right where she is. She did not see anyone put it there.', effects: [{ op: 'pose', who: 'heroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 2, name: 'Pinned', text: 'A dressmaker’s pin, slid in so gently she barely feels it.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'The Grand Opening', text: 'Every window in the mall lights up at once, and every display faces her.', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'He steps back to admire his work: he heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'He strikes where his mannequin stands, then poses a new one by whoever is closest. With no mannequin out, he goes for whoever is closest and attacks.', effects: [{ op: 'strikePose' }, { op: 'pose', who: 'any' }] },
  power: { name: 'Under Glass', text: 'He steps inside a display case and comes out glazed, hard as porcelain. 4 temporary health.', health: 4 },
  lore: [
    'Mr. Ambrose dressed the Brandt & Co. windows from 1955 to 1985. He never married, never took a vacation, and never let anyone see a window before it was finished. People said his mannequins looked like they were holding their breath.',
    'He wears a smooth porcelain mannequin face with painted eyebrows and nothing behind the eyes, a three-piece suit with a tape measure around the neck, and spotless white cotton gloves. He carries long pinking shears and a pincushion strapped to his wrist.',
    'He doesn’t chase anyone. He decides where they will be, and he waits for them there.',
  ],
  weakness: { text: 'Find out what happened to Mr. Ambrose’s last window. Each lore item you find makes your attacks deal +1 damage; he has never been able to stand being seen unfinished.' },
  finale: {
    name: 'The Christmas Window',
    text: 'Every display in the building turns its head toward her. He appears beside her, poses his last mannequin where she stands every turn, and his attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }],
    behavior: { text: 'She is the centerpiece now: he strikes at his mannequin, then poses the next one where she stands.', effects: [{ op: 'strikePose' }, { op: 'pose', who: 'heroine' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Recast', text: 'His porcelain face cracks and falls away. Underneath is another porcelain face.', effects: [{ op: 'horror', n: 1 }] },
  quotes: ['"Hold that pose."', '"Chin up. A little to the left."', '"You’ll look lovely in the window."', '"Don’t move. Don’t ever move."'],
  minions: { name: 'A Mannequin', plural: 'Mannequins', text: 'His display mannequins, which only move when nobody is looking: one in your location or next to it can’t move or attack. 2 health, move 2, attack 1. They go for whoever is closest and act before he does.', health: 2, move: 2, attack: 1, max: 2, who: 'any', order: 'before', frozenWhenSeen: true },
  terror: [
    { id: 'wd-stock', name: 'New Stock', tone: 'killer', text: 'A delivery of mannequins arrives in the night. None of them are wrapped.', effects: [{ op: 'spawnMinion', at: 'random', n: 1 }, { op: 'minionsAct' }] },
    { id: 'wd-pose', name: 'The Pose', tone: 'killer', text: 'She turns around. A mannequin stands exactly where she was a second ago, arms open.', effects: [{ op: 'pose', who: 'heroine' }] },
    { id: 'wd-shears', name: 'Pinking Shears', tone: 'killer', text: 'Snip. Snip. Snip. Somewhere in the dark, he is trimming something.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'wd-count', name: 'Window Count', tone: 'killer', text: 'He adds a figure to his sketch of the Christmas window.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'wd-change', name: 'Display Change', tone: 'killer', text: 'The lights flicker. When they steady, the whole scene has been rearranged.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'wd-inventory', name: 'Inventory', tone: 'killer', text: 'He retires to the back to count heads. Mannequin heads, she hopes.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'wd-browsing', name: 'Just Browsing', tone: 'killer', text: 'A figure between the racks, gliding closer without seeming to move its feet.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'wd-shattered', name: 'Shattered Pose', tone: 'calm', text: 'A mannequin topples and breaks. He stops, appalled, and kneels to gather the pieces.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-pinkslip', name: 'Pink Slip, January 1986', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: '“Position eliminated. Display work to be handled by outside vendor.” Under the signature, a small, neat pencil sketch of the man who signed it, sitting very still at a dinner table.' },
    { id: 'lore-sketchbook', name: 'Window Sketchbook', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him. +1 nerve.', onGain: [{ op: 'nerve', n: 1 }], lore: 'Thirty-one Christmas windows, one per page. The last page is this year’s: a whole mall, viewed from above, and a small figure in the middle labeled “the girl.”' },
  ],
};
