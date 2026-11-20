// Tension metrics (not CI): `SCRIPTS=1 npx vitest run tension`
import { it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { dispatch, newGame, neighbors } from '../src/engine/rules';
import { botAction } from '../src/engine/bot';
import type { GameState } from '../src/engine/types';

it('tension report', () => {
  const m = { games: 0, rounds: 0, nerveGiven: 0, nerveUnused: 0, killerAdjRounds: 0, killerSameRounds: 0, attacks: 0, wounds: 0, minHealthSum: 0, nearDeath: 0,
    quietRounds: 0, maxHorrorSum: 0, endTurnsWithNerve: 0, deaths: 0, victimsSlain: 0, victimsSaved: 0, lengthSum: 0, roundsHorror4plus: 0 };
  for (const l of LOCATIONS) for (const k of KILLERS) for (const h of HEROINES) for (let i = 1; i <= 12; i++) {
    const c = buildContent(l.id, k.id, h.id);
    let s: GameState = newGame(c, i * 104729 + l.id.length);
    let minH = s.heroine.health, maxHor = 0, roundStartNerve = 0, roundEvent = false;
    let lastRound = 0;
    for (let step = 0; step < 3000 && !s.outcome; step++) {
      if (s.phase === 'action' && s.round !== lastRound) {
        lastRound = s.round; roundStartNerve = s.heroine.nerve; m.nerveGiven += roundStartNerve; m.rounds++;
        const adj = neighbors(c, s.heroine.loc).includes(s.killer.loc);
        if (s.killer.loc === s.heroine.loc) m.killerSameRounds++; else if (adj) m.killerAdjRounds++;
        if (s.heroine.horror >= 4) m.roundsHorror4plus++;
        roundEvent = false;
      }
      const a = botAction(c, s);
      if (a.type === 'endTurn' && s.phase === 'action') { m.nerveUnused += s.heroine.nerve; if (s.heroine.nerve > 0) m.endTurnsWithNerve++; }
      const prevH = s.heroine.health, prevSlain = s.slain, prevHor = s.heroine.horror, prevLog = s.log.length;
      let next = dispatch(c, s, a);
      if (next === s) next = dispatch(c, s, { type: 'endTurn' });
      if (next.lastRoll && next.lastRoll !== s.lastRoll && next.lastRoll.label.includes('attacks')) m.attacks++;
      if (next.heroine.health < prevH) { m.wounds += prevH - next.heroine.health; roundEvent = true; }
      if (next.slain > prevSlain) roundEvent = true;
      if (next.heroine.horror > prevHor) roundEvent = true;
      if (next.log.slice(prevLog).some((l) => /panics and bolts|Too loud/.test(l.text))) roundEvent = true;
      if (neighbors(c, next.heroine.loc).includes(next.killer.loc)) roundEvent = true;
      if (s.phase === 'killer' && next.phase !== 'killer' && !roundEvent && s.killer.loc !== s.heroine.loc) m.quietRounds++;
      s = next;
      minH = Math.min(minH, s.heroine.health); maxHor = Math.max(maxHor, s.heroine.horror);
    }
    m.games++; m.minHealthSum += minH; if (minH <= 1) m.nearDeath++; m.maxHorrorSum += maxHor;
    if (s.outcome === 'died') m.deaths++; m.victimsSlain += s.slain; m.victimsSaved += s.saved; m.lengthSum += Math.min(s.round, s.dawnAt);
  }
  const g = m.games, r = m.rounds;
  console.table({
    'games': g,
    'avg rounds': (m.lengthSum / g).toFixed(1),
    'nerve unused at end of turn (% of nerve given)': `${Math.round((m.nerveUnused / m.nerveGiven) * 100)}%`,
    'turns ended with nerve left over': `${Math.round((m.endTurnsWithNerve / r) * 100)}%`,
    'rounds starting with killer in same room': `${Math.round((m.killerSameRounds / r) * 100)}%`,
    'rounds starting with killer adjacent': `${Math.round((m.killerAdjRounds / r) * 100)}%`,
    'killer attacks per game': (m.attacks / g).toFixed(2),
    'wounds taken per game': (m.wounds / g).toFixed(2),
    'avg lowest health reached': (m.minHealthSum / g).toFixed(2),
    'games reaching 1 health or death': `${Math.round((m.nearDeath / g) * 100)}%`,
    'rounds at horror 4+': `${Math.round((m.roundsHorror4plus / r) * 100)}%`,
    'avg peak horror (of 6)': (m.maxHorrorSum / g).toFixed(2),
    'quiet rounds (no wound/kill/horror/panic, killer not near)': `${Math.round((m.quietRounds / r) * 100)}%`,
    'survivors saved / slain per game': `${(m.victimsSaved / g).toFixed(1)} / ${(m.victimsSlain / g).toFixed(1)}`,
    'death rate': `${Math.round((m.deaths / g) * 100)}%`,
  });
}, 600000);
