// First-night tutorial scenario. Builds on a normal game but stacks the
// opening so every lesson happens on cue, then plays on as a real game:
//   Turn 1: search the Concession Stand (a Tire Iron on top), walk the survivor
//           in Rows A out through the Ticket Booth, buy an attack card.
//   His turn: he waits in the Groundskeeper's Shed, next to the exit, so he
//           steps in and attacks her (Duck it), then a calm Terror card flips.
//   Turn 2: he's standing right there: hit him.
import { newGame } from './rules';
import type { Content, GameState } from './types';

export const TUTORIAL = {
  location: 'holloway-drive-in',
  killer: 'the-projectionist',
  heroine: 'rosa',
  seed: 24, // on the scripted path: the search finds two, Duck blocks, Full Swing lands for 4
};

export function tutorialGame(c: Content): GameState {
  const s = newGame(c, TUTORIAL.seed, 'story');
  s.staged = true;
  s.heroine.loc = 'concession';
  s.killer.loc = 'shed';
  s.killer.stunned = 0;
  for (const k of Object.keys(s.victims)) s.victims[k] = 0;
  s.victims.lotA = 1; // next door, one step from the exit
  s.victims.junkyard = 1; // far from him: the next rescue once the lesson is over
  s.victimPool = 10;
  s.heroine.horror = 1;
  // A gentle ongoing event, and a calm start to the Terror deck.
  s.events = ['ev-moon'];
  const calm = ['ev-intermission', 'ev-headlights'];
  s.terrorDeck = [...calm, ...s.terrorDeck.filter((id) => !calm.includes(id))].slice(0, 10);
  // Good first finds on top of the Concession pile: the weapon first.
  const pile = s.piles.concession;
  for (const id of ['firstaid', 'tire-iron']) {
    for (const p of Object.values(s.piles)) {
      const i = p.cards.indexOf(id);
      if (i >= 0) p.cards.splice(i, 1);
    }
    pile.cards.unshift(id);
  }
  pile.up = true;
  // The setup log described the normal opening; tell the staged one instead.
  s.log = [
    { round: 1, text: `The feature begins. ${c.heroine.name} is at the Concession Stand. ${c.killer.name} lurks in the Groundskeeper's Shed, by the exit.`, tone: 'info' },
    { round: 1, text: 'EVENT: Harvest Moon. The clouds part. Silver light over every row.', tone: 'info' },
  ];
  return s;
}
