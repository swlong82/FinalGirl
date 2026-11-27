// Tuning harness: compact win rates per killer, location and heroine. `SCRIPTS=1 N=3 npx vitest run tune`
import { it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { dispatch, newGame } from '../src/engine/rules';
import { simulate } from '../src/engine/bot';
import type { Difficulty } from '../src/engine/types';

/** FNV-1a: every (location, killer, heroine, run) gets its own independent seed. */
const hash = (str: string) => {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619);
  return x >>> 0;
};

it('tune', () => {
  const N = Number(process.env.N ?? 3);
  const D = (process.env.D ?? 'standard') as Difficulty;
  const off = Number(process.env.SEED ?? 0);
  const w: Record<string, [number, number]> = {};
  const add = (k: string, won: boolean) => {
    const r = (w[k] ??= [0, 0]);
    r[0] += won ? 1 : 0;
    r[1]++;
  };
  for (const l of LOCATIONS)
    for (const k of KILLERS)
      for (const h of HEROINES)
        for (let i = 1; i <= N; i++) {
          const c = buildContent(l.id, k.id, h.id);
          const s = simulate(c, newGame(c, hash(`${l.id}|${k.id}|${h.id}|${i + off}`), D), dispatch);
          const won = s.outcome === 'slain';
          add('ALL', won);
          add(`K ${k.id.replace('the-', '')}`, won);
          add(`L ${l.id.split('-')[0]}`, won);
          add(`H ${h.id}`, won);
        }
  const pct = (k: string) => Math.round((w[k][0] / w[k][1]) * 100);
  const line = (p: string) => Object.keys(w).filter((k) => k.startsWith(p)).map((k) => `${k.slice(2)} ${pct(k)}`).join(' · ');
  console.log(`\nALL ${pct('ALL')}% (${w.ALL[1]} games)\nK: ${line('K ')}\nL: ${line('L ')}\nH: ${line('H ')}`);
}, 1800000);
