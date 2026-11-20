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
  // Round 1: a calm, helpful event. Round 2: another calm one.
  const pull = (deck: string[], id: string) => {
    const i = deck.indexOf(id);
    if (i >= 0) deck.splice(i, 1);
  };
  if (s.currentEvent) s.eventDeck.unshift(s.currentEvent);
  pull(s.eventDeck, 'ev-moon');
  pull(s.eventDeck, 'ev-cartoon');
  s.currentEvent = 'ev-moon';
  s.eventDeck.push('ev-cartoon'); // drawn next (pop from the end)
  // Good first finds.
  for (const id of ['firstaid', 'tire-iron']) {
    pull(s.itemDeck, id);
    s.itemDeck.push(id);
  }
  // Opening hand: Search, Lead, Hide, Catch Your Breath, Fight (drawn from the top = end).
  for (const id of ['ac-fight', 'ac-rest', 'ac-hide', 'ac-lead', 'ac-search']) {
    pull(s.actionDeck, id);
    s.actionDeck.push(id);
  }
  // A survivor right next door, and the killer busy for two rounds.
  s.victims = Object.fromEntries(Object.keys(s.victims).map((k) => [k, 0]));
  s.victims.lotA = 1;
  s.victims.playground = 1;
  s.killer.stunned = 2;
  s.log.push({ round: 1, text: 'The Projectionist is threading the first reel. You have a moment.', tone: 'info' });
  return s;
}
