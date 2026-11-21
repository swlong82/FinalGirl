import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Three.
export const anesthetist: KillerPack = {
  id: 'the-anesthetist',
  name: 'The Anesthetist',
  epithet: 'Dr. Ambrose Lull, who only wants you to rest',
  art: 'anesthetist',
  health: 24,
  horror: 2,
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'On Rounds', text: 'Footsteps, a clipboard, a soft knock on each door.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 2, name: 'A Second Dose', text: 'He injects himself with something and sighs with relief.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 2, name: 'The Sleepers of Ward C', text: 'Behind the bricked-up wall, eleven people begin to snore.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'Scrubbed In', text: 'His power is revealed.' },
      { move: 3, attack: 3, name: 'Bedside Manner', text: 'She blinks, and he is sitting beside her, holding her hand.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 3, name: 'Just a Little Pinch', text: 'A needle mark on her arm. She does not remember it happening.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'Count Backward', text: 'Ten… nine… eight…', effects: [{ op: 'nerve', n: -1 }, { op: 'horror', n: 1 }] },
    ],
    max: { text: "You're so very tired: −1 nerve.", effects: [{ op: 'nerve', n: -1 }] },
  },
  behavior: { text: 'He makes his rounds: he goes for whoever is closest and attacks.', effects: [{ op: 'target', who: 'any' }, { op: 'hunt' }, { op: 'attack' }] },
  power: { name: 'Rubber Apron', text: 'He ties on a heavy apron and the ether follows him. 3 temporary health; while it holds, she loses 1 nerve every Upkeep.', health: 3, upkeep: [{ op: 'nerve', n: -1 }] },
  lore: [
    'Dr. Ambrose Lull believed that fear was a disease and that sleep was the cure: deep, total, permanent sleep. He never raised his voice. His patients said he had the kindest hands in the hospital.',
    'He wears a surgical mask with a smile painted on it in iodine, round smoked goggles, and a rubber apron. He carries a brown bottle of ether and a folded cloth. He tells you it will only sting for a moment.',
    'He does not chase. He makes rounds.',
  ],
  weakness: { text: 'Uncover what happened in Ward C. Each lore item you find makes your attacks deal +1 damage — the doctor cannot bear to be reminded.' },
  finale: {
    name: 'The Final Procedure',
    text: 'Every light in the wing goes out except the surgical lamp, and it is pointing at her. He heals 2, moves 2 toward her, and from now on hunts only her. His attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerHeal', n: 2 }, { op: 'horror', n: 1 }, { op: 'killerMove', toward: 'heroine', steps: 2 }],
    behavior: { text: 'He comes for her with the needle: he hunts only her and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt' }, { op: 'attack' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Lights Out', text: 'His mask tears away. Under it, he is smiling too. He keeps counting backward.', effects: [{ op: 'horror', n: 1 }, { op: 'nerve', n: -1 }] },
  quotes: ['"Count backward from ten for me."', '"Shh. Shh. It\'s all right."', '"You\'re so very tired."', '"Just a little pinch."'],
  terror: [
    { id: 'an-rounds', name: 'He Makes His Rounds', tone: 'killer', text: 'Footsteps, a clipboard, a soft knock on each door in turn.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'an-countdown', name: 'Count Backward', tone: 'killer', text: 'His voice on the intercom: "Ten… nine… eight…" Her eyelids feel heavy.', effects: [{ op: 'nerve', n: -1 }, { op: 'horror', n: 1 }] },
    { id: 'an-ether', name: 'Ether in the Vents', tone: 'killer', text: 'A sweet chemical smell rolls through the ducts.', effects: [{ op: 'if', cond: { c: 'killerAdjacent' }, then: [{ op: 'horror', n: 2 }], else: [{ op: 'horror', n: 1 }] }] },
    { id: 'an-paged', name: 'Paging the Patient', tone: 'killer', text: 'The intercom calls her name, then her room number. He knows where she is.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'an-tray', name: 'The Instrument Tray', tone: 'killer', text: 'Steel laid out in a careful row, freshly polished.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'an-chart', name: 'He Updates the Chart', tone: 'killer', text: 'Neat handwriting on every clipboard: TIME OF REST.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'an-scrub', name: 'Scrubbing In', tone: 'calm', text: 'Water runs in the scrub room, for a long time. He is very thorough.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-wardlog', name: 'Ward C Patient Log', kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: 'Eleven names, eleven dates. Under each, in the same gentle hand: "Resting comfortably." The last line reads: "Myself — when the work is done."' },
    { id: 'lore-tape', name: "Dr. Lull's Dictaphone", kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him. +1 nerve.', onGain: [{ op: 'nerve', n: 1 }], lore: 'A tired voice: "Mother never slept. She was afraid every night of her life. I will not let anyone be that afraid again. Not anyone."' },
  ],
};
