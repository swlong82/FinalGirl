// Balance report (not part of CI): `SCRIPTS=1 N=30 npx vitest run balance`
import { it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { dispatch, newGame } from '../src/engine/rules';
import { simulate } from '../src/engine/bot';

const N = Number(process.env.N ?? 30);

it('balance report', () => {
  const pct = (a: number, t: number) => `${Math.round((a / t) * 100)}%`;
  const byLoc: Record<string, number[]> = {};
  const byKiller: Record<string, number[]> = {};
  const byHeroine: Record<string, number[]> = {};
  const add = (m: Record<string, number[]>, k: string, o: string) => {
    m[k] ??= [0, 0, 0];
    m[k][o === 'slain' ? 0 : o === 'escaped' ? 1 : 2]++;
  };
  for (const l of LOCATIONS)
    for (const k of KILLERS)
      for (const h of HEROINES)
        for (let i = 1; i <= N; i++) {
          const c = buildContent(l.id, k.id, h.id);
          const s = simulate(c, newGame(c, i * 7919 + l.id.length * 31), dispatch);
          add(byLoc, l.id, s.outcome!);
          add(byKiller, k.id, s.outcome!);
          add(byHeroine, h.id, s.outcome!);
        }
  const fmt = (m: Record<string, number[]>) =>
    Object.fromEntries(Object.entries(m).map(([k, [a, b, d]]) => [k, { slain: pct(a, a + b + d), escaped: pct(b, a + b + d), died: pct(d, a + b + d) }]));
  console.table(fmt(byLoc));
  console.table(fmt(byKiller));
  console.table(fmt(byHeroine));
}, 600000);
