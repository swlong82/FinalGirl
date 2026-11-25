import type { HeroineDef, RescueSlot } from '../../engine/types';

// Rescue rewards. Each heroine fills her slots in order; once every slot is
// full her ability unlocks, and further rescues give the repeat reward.
const nerve2: RescueSlot = { text: '+2 nerve.', effects: [{ op: 'nerve', n: 2 }] };
const heal1: RescueSlot = { text: 'Heal 1.', effects: [{ op: 'heal', n: 1 }] };
const calm1: RescueSlot = { text: 'Horror −1.', effects: [{ op: 'horror', n: -1 }] };
const calm2: RescueSlot = { text: 'Horror −2.', effects: [{ op: 'horror', n: -2 }] };
const item1: RescueSlot = { text: 'They hand her something: draw 1 item.', effects: [{ op: 'drawItem', n: 1 }] };
const resolve1: RescueSlot = { text: 'Resolve: her attacks roll +1 die for the rest of the night.', effects: [{ op: 'resolve', n: 1 }] };
const nerve1: RescueSlot = { text: '+1 nerve.', effects: [{ op: 'nerve', n: 1 }] };

export const heroines: HeroineDef[] = [
  {
    id: 'rosa',
    name: 'Rosa Ibarra',
    title: 'The Snack-Bar Girl',
    bio: 'Seventeen. Saving for a car. Knows every shortcut between the counter and the back rows.',
    health: 6,
    difficulty: 'Easy',
    passive: { name: 'Quick Feet', text: 'The first move card you play each turn moves 1 extra step.' },
    traits: { moveBonus: 1 },
    rescue: { slots: [resolve1, nerve2, heal1, item1], repeat: nerve1 },
    ability: { name: 'Hot Butter', text: 'Once per turn, killer here: 1 damage to {him}.', when: 'killerHere', effects: [{ op: 'killerDamage', n: 1 }] },
    look: { skin: '#b07a55', hair: '#1a0f0a', hairStyle: 'ponytail', accent: '#ff4d6d', prop: 'apron' },
  },
  {
    id: 'june',
    name: 'June Okafor',
    title: 'The Ticket Taker',
    bio: 'Counts every car that comes through the gate. Notices everything. Hates being right.',
    health: 6,
    difficulty: 'Normal',
    passive: { name: 'Sharp Eyes', text: 'Search cards roll +1 die.' },
    traits: { searchDice: 1 },
    rescue: { slots: [item1, calm1, heal1, resolve1], repeat: calm1 },
    ability: { name: 'Head Count', text: 'Once per turn: +1 nerve and horror −1.', effects: [{ op: 'nerve', n: 1 }, { op: 'horror', n: -1 }] },
    look: { skin: '#5c3a26', hair: '#0e0906', hairStyle: 'curls', accent: '#f9c74f', prop: 'ticket' },
  },
  {
    id: 'margo',
    name: 'Margo Kessler',
    title: 'The Grease Monkey',
    bio: "Fixes the projector's generator for free popcorn. Owns three wrenches and no fear of the dark.",
    health: 8,
    difficulty: 'Normal',
    passive: { name: 'Handy', text: 'Her weapons never wear out. Barricade cards cost 1 less, and her barricades hold 1 more.' },
    traits: { barricadeDiscount: 1, barricadeStrength: 1, durableWeapons: true },
    rescue: { slots: [heal1, nerve2, resolve1, item1], repeat: nerve1 },
    ability: { name: 'Jury-Rig', text: 'Once per turn: barricade here (strength 1, +1 from Handy).', effects: [{ op: 'barricade', at: 'here', strength: 1 }] },
    look: { skin: '#e8c3a0', hair: '#7a2e12', hairStyle: 'bob', accent: '#90be6d', prop: 'wrench' },
  },
  {
    id: 'tess',
    name: 'Tess Lindqvist',
    title: 'The Lifeguard',
    bio: 'Off-season lifeguard at Marrow Lake. Has pulled six people out of the water. Tonight she wants a seventh.',
    health: 7,
    difficulty: 'Easy',
    passive: { name: 'Protector', text: 'Up to 3 survivors follow her when she moves (instead of 2).' },
    traits: { escortCap: 3 },
    rescue: { slots: [calm2, heal1, calm2, resolve1], repeat: calm2 },
    ability: { name: 'Whistle', text: 'Once per turn: up to 2 survivors from next door run to her.', effects: [{ op: 'rally', n: 2 }] },
    look: { skin: '#f1d2b6', hair: '#e9c46a', hairStyle: 'long', accent: '#4cc9f0', prop: 'whistle' },
  },
  {
    id: 'ivy',
    name: 'Ivy Marchetti',
    title: 'The Film Student',
    bio: "Came to film the Holloway's last night for her thesis. Has watched every slasher ever made. Knows the rules.",
    health: 5,
    difficulty: 'Normal',
    passive: { name: 'Knows the Rules', text: 'Ignore the first horror you gain in each Killer phase.' },
    traits: { ignoreFirstHorror: true },
    rescue: { slots: [calm1, nerve1, item1, heal1], repeat: nerve1 },
    ability: { name: 'Never Split Up', text: 'Once per turn. With survivors here: +2 nerve. Otherwise: horror −1.', effects: [{ op: 'if', cond: { c: 'survivorsHere' }, then: [{ op: 'nerve', n: 2 }], else: [{ op: 'horror', n: -1 }] }] },
    look: { skin: '#d9a88a', hair: '#2b1d3a', hairStyle: 'pixie', accent: '#c77dff', prop: 'camera' },
  },
  {
    id: 'sunny',
    name: 'Sunny Halvorsen',
    title: 'The Ski Instructor',
    bio: 'Grew up on the mountain. Teaches six-year-olds to snowplow by day and patrols the bunny hill by night. Cold has never bothered her.',
    health: 7,
    difficulty: 'Normal',
    passive: { name: 'Mountain Born', text: 'Immune to cold. Move and hide cards roll +1 die.' },
    traits: { coldImmune: true, hideDice: 1, moveDice: 1 },
    rescue: { slots: [resolve1, heal1, nerve2, item1], repeat: calm1 },
    ability: { name: 'Traverse', text: 'Once per turn: move 1, then thaw out.', effects: [{ op: 'move', n: 1 }, { op: 'warm' }] },
    look: { skin: '#f0c7a8', hair: '#c9772f', hairStyle: 'long', accent: '#ff9f1c', prop: 'goggles' },
  },
  {
    id: 'dee',
    name: 'Dee Castillo',
    title: 'The Overnight Intern',
    bio: 'Nineteen, unpaid, and the only one who knows how to run the board alone. She can talk anybody down and calm anybody, including herself.',
    health: 7,
    difficulty: 'Normal',
    passive: { name: 'Smooth Voice', text: 'Reaction cards roll +1 die. Answering a ringing phone costs no nerve.' },
    traits: { freeAnswer: true, reactDice: 1 },
    rescue: { slots: [nerve2, calm1, nerve2, resolve1], repeat: nerve2 },
    ability: { name: 'Cue the Jingle', text: 'Once per turn: the killer moves 2 toward {his} lair. Horror −1.', effects: [{ op: 'killerMove', toward: 'lair', steps: 2 }, { op: 'horror', n: -1 }] },
    look: { skin: '#a8714f', hair: '#1c1020', hairStyle: 'ponytail', accent: '#f15bb5', prop: 'headphones' },
  },
];
