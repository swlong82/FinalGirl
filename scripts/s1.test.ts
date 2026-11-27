// Season 1 only, for comparing against the documented v1.0.18 numbers: `SCRIPTS=1 N=4 npx vitest run s1`
import { it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { dispatch, newGame } from '../src/engine/rules';
import { simulate } from '../src/engine/bot';

it('season 1 report', () => {
  const N = Number(process.env.N ?? 4);
  let won = 0;
  let games = 0;
  for (const l of LOCATIONS.slice(0, 5))
    for (const k of KILLERS.slice(0, 5))
      for (const h of HEROINES.slice(0, 7))
        for (let i = 1; i <= N; i++) {
          const c = buildContent(l.id, k.id, h.id);
          const s = simulate(c, newGame(c, i * 7919 + l.id.length * 31 + k.id.length), dispatch);
          games++;
          if (s.outcome === 'slain') won++;
        }
  console.log(`Season 1 only: ${Math.round((won / games) * 100)}% of ${games}`);
}, 900000);
