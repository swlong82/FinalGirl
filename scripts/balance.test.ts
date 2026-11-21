// Balance report (not part of CI): `SCRIPTS=1 N=30 npx vitest run balance`
import { it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { dispatch, newGame } from '../src/engine/rules';
import { setBotStyle, simulate, type BotStyle } from '../src/engine/bot';
import type { Difficulty } from '../src/engine/types';

const N = Number(process.env.N ?? 30);
const D = (process.env.D ?? 'standard') as Difficulty;
setBotStyle((process.env.STYLE ?? 'balanced') as BotStyle); // STYLE=rush: ignore survivors, go for him

it('balance report', () => {
  const pct = (a: number, t: number) => `${Math.round((a / t) * 100)}%`;
  const rows: Record<string, { games: number; won: number; turns: number; saved: number; slain: number; bl: number; finale: number; hRevive: number; kRevive: number }> = {};
  const add = (key: string, s: ReturnType<typeof newGame>) => {
    const r = (rows[key] ??= { games: 0, won: 0, turns: 0, saved: 0, slain: 0, bl: 0, finale: 0, hRevive: 0, kRevive: 0 });
    r.games++;
    if (s.outcome === 'slain') r.won++;
    r.turns += s.round;
    r.saved += s.saved;
    r.slain += s.slain;
    r.bl += s.killer.bloodlust;
    if (s.killer.finale) r.finale++;
    if (s.heroine.token === null) r.hRevive++;
    if (s.killer.token === null) r.kRevive++;
  };
  for (const l of LOCATIONS)
    for (const k of KILLERS)
      for (const h of HEROINES)
        for (let i = 1; i <= N; i++) {
          const c = buildContent(l.id, k.id, h.id);
          const s = simulate(c, newGame(c, i * 7919 + l.id.length * 31 + k.id.length, D), dispatch);
          add(`L ${l.id}`, s);
          add(`K ${k.id}`, s);
          add(`H ${h.id}`, s);
          add('ALL', s);
        }
  const out: Record<string, Record<string, string>> = {};
  for (const [key, r] of Object.entries(rows))
    out[key] = {
      win: pct(r.won, r.games),
      turns: (r.turns / r.games).toFixed(1),
      saved: (r.saved / r.games).toFixed(1),
      slain: (r.slain / r.games).toFixed(1),
      bloodlust: (r.bl / r.games).toFixed(1),
      finale: pct(r.finale, r.games),
      'her token used': pct(r.hRevive, r.games),
      'his token used': pct(r.kRevive, r.games),
    };
  console.table(out);
}, 900000);
