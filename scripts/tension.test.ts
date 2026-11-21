// Tension metrics (not CI): `SCRIPTS=1 npx vitest run tension`
import { it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { dispatch, newGame, neighbors, totalHealth } from '../src/engine/rules';
import { botAction } from '../src/engine/bot';
import type { GameState } from '../src/engine/types';

it('tension report', () => {
  const m = { games: 0, turns: 0, nerveLeft: 0, debtTurns: 0, killerNearTurns: 0, attacksOnHer: 0, reactions: 0, conversions: 0, rolls: 0, minHealthSum: 0, nearDeath: 0, maxHorrorSum: 0, finales: 0, deaths: 0, saved: 0, slain: 0, buys: 0 };
  for (const l of LOCATIONS)
    for (const k of KILLERS)
      for (const h of HEROINES)
        for (let i = 1; i <= 6; i++) {
          const c = buildContent(l.id, k.id, h.id);
          let s: GameState = newGame(c, i * 104729 + l.id.length);
          let minH = totalHealth(s);
          let maxHor = 0;
          for (let step = 0; step < 6000 && !s.outcome; step++) {
            const a = botAction(c, s);
            if (a.type === 'endAction') {
              m.turns++;
              m.nerveLeft += Math.max(0, s.heroine.nerve);
              if (neighbors(c, s.heroine.loc).includes(s.killer.loc) || s.killer.loc === s.heroine.loc) m.killerNearTurns++;
            }
            if (a.type === 'convert') m.conversions++;
            if (a.type === 'react') m.reactions++;
            if (a.type === 'buy') m.buys++;
            const prevRoll = s.lastRoll?.id;
            let next = dispatch(c, s, a);
            if (next === s) next = dispatch(c, s, { type: s.phase === 'planning' ? 'endPlanning' : s.phase === 'upkeep' ? 'endUpkeep' : 'endAction' });
            if (next.lastRoll && next.lastRoll.id !== prevRoll) m.rolls++;
            if (next.pending?.kind === 'reaction' && s.pending?.kind !== 'reaction') m.attacksOnHer++;
            if (s.phase === 'action' && next.phase === 'planning' && next.heroine.nerve < 0) m.debtTurns++;
            s = next;
            minH = Math.min(minH, totalHealth(s));
            maxHor = Math.max(maxHor, s.heroine.horror);
          }
          m.games++;
          m.minHealthSum += minH;
          if (minH <= 1) m.nearDeath++;
          m.maxHorrorSum += maxHor;
          if (s.killer.finale) m.finales++;
          if (s.outcome === 'died') m.deaths++;
          m.saved += s.saved;
          m.slain += s.slain;
        }
  const g = m.games;
  const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;
  console.table({
    games: g,
    'avg turns': (m.turns / g).toFixed(1),
    'nerve left at end of Action (avg)': (m.nerveLeft / m.turns).toFixed(2),
    'turns ending in nerve debt': pct(m.debtTurns, m.turns),
    'turns ending with him within 1': pct(m.killerNearTurns, m.turns),
    'attacks on her with a reaction in hand / game': (m.attacksOnHer / g).toFixed(2),
    'reactions played / game': (m.reactions / g).toFixed(2),
    'partials bought up / roll': (m.conversions / Math.max(1, m.rolls)).toFixed(2),
    'cards bought / turn': (m.buys / m.turns).toFixed(2),
    'avg lowest health': (m.minHealthSum / g).toFixed(2),
    'games reaching 1 health or death': pct(m.nearDeath, g),
    'avg peak horror (of 6)': (m.maxHorrorSum / g).toFixed(2),
    'games reaching the Finale': pct(m.finales, g),
    'survivors saved / slain per game': `${(m.saved / g).toFixed(1)} / ${(m.slain / g).toFixed(1)}`,
    'death rate': pct(m.deaths, g),
  });
}, 900000);
