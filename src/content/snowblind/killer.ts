import type { KillerPack } from '../../engine/types';

// Original killer for LAST LIGHT — Feature Four.
export const snowblind: KillerPack = {
  id: 'the-snowblind',
  name: 'The Snowblind',
  epithet: 'Wes Corder, who came down off the mountain',
  art: 'snowblind',
  health: 9,
  horror: 2,
  bloodlust: {
    revealAt: 4,
    levels: [
      { move: 1, attack: 1, name: 'Listening', text: 'He stands in the snow, head tilted.' },
      { move: 2, attack: 1 },
      { move: 2, attack: 1, name: 'Buried and Unburied', text: 'He walks into a drift and walks out of it whole.', effects: [{ op: 'killerHeal', n: 2 }] },
      { move: 2, attack: 1, name: 'He Hears Your Heart', text: 'Thump. Thump. She can hear it too now, and so can he.', effects: [{ op: 'horror', n: 2 }] },
      { move: 2, attack: 2, name: 'The Siren', text: 'His power is revealed.' },
      { move: 3, attack: 2, name: 'Out of the Drift', text: 'The snowbank next to her stands up.', effects: [{ op: 'killerTeleport', to: 'heroine' }, { op: 'horror', n: 1 }] },
      { move: 3, attack: 2, name: 'Hypothermia', text: 'Her hands will not stop shaking.', effects: [{ op: 'wound', n: 1 }] },
      { move: 3, attack: 3, name: 'Avalanche', text: 'The mountain answers him.', effects: [{ op: 'horror', n: 1 }] },
    ],
    max: { text: 'He can hear everything now: he heals 1.', effects: [{ op: 'killerHeal', n: 1 }] },
  },
  behavior: { text: 'He listens for her heartbeat: he hunts her (survivors in his way still die first) and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt' }, { op: 'attack' }] },
  power: { name: 'Frost Rime', text: 'Ice builds up over his parka like armor plate. 4 temporary health.', health: 4 },
  lore: [
    'Wes Corder spent three days under the Kettle Bowl slide with his eyes open to the snow. When they reached him the cold had taken his sight, and something in him had frozen too.',
    "He still wears his patrol parka and the frosted goggles he had on that morning, the lenses rimed white. He carries his avalanche probe and an ice axe. He can't see you. He listens for you: breathing, footsteps, a heartbeat.",
    'Every time he sounds the siren, someone pays for the run that should have stayed closed.',
  ],
  weakness: { text: 'Find what the lodge buried in 1974. Each lore item you find makes your attacks deal +1 damage; the truth hurts him more than steel.' },
  finale: {
    name: 'The Slide',
    text: 'The siren sounds three long blasts and the mountain answers. He heals 2, moves 2 toward her, and hunts her 1 step farther every turn. His attacks deal +1. Every Upkeep in the Finale: bloodlust +1.',
    effects: [{ op: 'killerHeal', n: 2 }, { op: 'horror', n: 1 }, { op: 'killerMove', toward: 'heroine', steps: 2 }],
    behavior: { text: 'He comes through the snow, following her heartbeat: he hunts her, 1 step farther, and attacks.', effects: [{ op: 'target', who: 'heroine' }, { op: 'hunt', extra: 1 }, { op: 'attack' }] },
    attack: 1,
    upkeep: [{ op: 'bloodlust', n: 1 }],
  },
  revive: { name: 'Snow Blindness', text: 'His goggles crack and fall. Behind them his eyes are pure white, and he is still listening.', effects: [{ op: 'horror', n: 1 }] },
  quotes: ['"Run’s closed."', '"I can hear you breathing."', '"Three days. Three days under."', '"Nobody listens."'],
  minions: { name: 'A Buried Skier', plural: 'Buried Skiers', text: 'The ones the 1974 slide took, digging themselves out at last. 2 health, move 1, attack 1. Like him, they listen for her heartbeat, and they act before he does.', health: 2, move: 1, attack: 1, max: 2, who: 'heroine', order: 'before' },
  terror: [
    { id: 'sb-dugout', name: 'They Dig Themselves Out', tone: 'killer', text: 'A gloved hand pushes up through the drift beside him, then a frozen face in 1974 goggles.', effects: [{ op: 'spawnMinion', at: 'nearKiller', n: 1 }, { op: 'minionsAct' }] },
    { id: 'sb-siren', name: 'The Avalanche Siren', tone: 'killer', text: 'Three long blasts roll down the mountain, and everyone stops talking.', effects: [{ op: 'killerMove', toward: 'heroine', steps: 2 }, { op: 'attack' }] },
    { id: 'sb-whiteout', name: 'Whiteout', tone: 'killer', text: 'The world goes white. When it clears, he is somewhere else.', effects: [{ op: 'killerTeleport', to: 'random' }] },
    { id: 'sb-listen', name: 'He Listens', tone: 'killer', text: 'Absolute silence. Somewhere close, someone is holding their breath, just as she is.', effects: [{ op: 'if', cond: { c: 'alone' }, then: [{ op: 'horror', n: 1 }], else: [{ op: 'killerMove', toward: 'heroine', steps: 1 }] }] },
    { id: 'sb-probe', name: 'Probe Line', tone: 'killer', text: 'He walks a straight line, stabbing the snow every step.', effects: [{ op: 'bloodlust', n: 1 }] },
    { id: 'sb-axe', name: 'The Ice Axe', tone: 'killer', text: 'Steel scrapes on ice, slowly, as he sharpens it.', effects: [{ op: 'mod', key: 'killerAttack', n: 1 }, { op: 'bloodlust', n: 1 }] },
    { id: 'sb-patrol', name: 'Back to the Hut', tone: 'killer', text: 'His radio crackles with a patrol call from 1974. He goes to answer it.', effects: [{ op: 'killerTeleport', to: 'lair' }] },
    { id: 'sb-thaw', name: 'Snow in His Ears', tone: 'calm', text: 'He stands still and shakes his head. For now he can’t hear a thing.', effects: [{ op: 'killerStun', n: 1 }] },
  ],
  items: [
    { id: 'lore-patrolreport', name: "Patrol Report, Jan '74", kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him.', lore: 'Signed W. Corder: “Kettle Bowl cornice loaded. Recommend closure, NO EXCEPTIONS.” Across it, in red pen, the owner wrote: “Open it.”' },
    { id: 'lore-beacon', name: "Corder's Avalanche Beacon", kind: 'lore', hands: 0, text: 'Lore. Your attacks that hit deal +1 damage to him. Thaw out.', onGain: [{ op: 'warm' }], lore: 'Still switched on, still beeping, twelve years later. Scratched into the case: “If you find me, it’s already too late.”' },
  ],
};
