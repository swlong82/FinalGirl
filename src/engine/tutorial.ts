// First-night tutorial scenario. Builds on a normal game but stacks the
// opening so every lesson happens on cue, then plays on as a real game.
import { newGame } from './rules';
import type { Content, GameState } from './types';

export const TUTORIAL = {
  location: 'holloway-drive-in',
  killer: 'the-projectionist',
  heroine: 'rosa',
  seed: 1984,
};

export function tutorialGame(c: Content): GameState {
  const s = newGame(c, TUTORIAL.seed, 'story');
  // Rosa at the Concession Stand (an item pile), one survivor next door in
  // Rows A, which is next to the Ticket Booth exit. He is far off and dazed.
  s.heroine.loc = 'concession';
  s.killer.loc = 'woods';
  s.killer.stunned = 1;
  for (const k of Object.keys(s.victims)) s.victims[k] = 0;
  s.victims.lotA = 1;
  s.victims.restrooms = 1;
  s.victimPool = 10;
  s.heroine.horror = 1;
  // A gentle ongoing event, and a calm start to the Terror deck.
  s.events = ['ev-moon'];
  const calm = ['ev-intermission', 'ev-headlights'];
  s.terrorDeck = [...calm, ...s.terrorDeck.filter((id) => !calm.includes(id))].slice(0, 10);
  // Good first finds on top of the Concession pile.
  const pile = s.piles.concession;
  for (const id of ['firstaid', 'tire-iron']) {
    for (const p of Object.values(s.piles)) {
      const i = p.cards.indexOf(id);
      if (i >= 0) p.cards.splice(i, 1);
    }
    pile.cards.unshift(id);
  }
  pile.up = true;
  s.log.push({ round: 1, text: 'The Projectionist is threading the first reel. You have a moment.', tone: 'info' });
  return s;
}
