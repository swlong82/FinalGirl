import { describe, expect, it } from 'vitest';
import { buildContent, HEROINES } from '../src/content/registry';
import { check, dispatch, newGame, neighbors, distances, itemDef } from '../src/engine/rules';
import type { Action, Content, GameState } from '../src/engine/types';

/** A simple heuristic bot — used to fuzz the engine and eyeball balance. */
function botAction(c: Content, s: GameState): Action {
  if (s.phase === 'event') return { type: 'resolveEvent' };
  if (s.phase === 'killer') return { type: 'resolveKiller' };
  const h = s.heroine;
  const ok = (a: Action) => check(c, s, a).ok;
  const killerHere = s.killer.loc === h.loc;
  for (const it of h.items) {
    const d = itemDef(c, it.id);
    if (!d.use) continue;
    const a: Action = { type: 'useItem', uid: it.uid };
    if (!ok(a)) continue;
    if (d.use.when === 'killerHere') return a;
    if (d.id.startsWith('keys') && h.escorting > 0) return a;
    if (d.id === 'firstaid' && h.health <= h.maxHealth - 2) return a;
    if (d.id === 'aspirin' && h.horror >= 3) return a;
  }
  for (const card of h.hand) if (h.nerve <= 1 && ok({ type: 'playInstinct', uid: card.uid })) return { type: 'playInstinct', uid: card.uid };
  if (killerHere && (s.killer.finale || h.health > 2) && ok({ type: 'fight' })) return { type: 'fight' };
  if (ok({ type: 'lead' })) return { type: 'lead' };
  const toward = (target: string): Action | null => {
    const d = distances(c, target);
    const step = neighbors(c, h.loc).sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99))[0];
    const a: Action = { type: 'move', to: step };
    return step && ok(a) && (d[step] ?? 99) < (d[h.loc] ?? 99) ? a : null;
  };
  if (h.escorting > 0) {
    const a = toward(c.location.exit);
    if (a) return a;
  }
  if (ok({ type: 'search' }) && h.items.length < 4) return { type: 'search' };
  const victimNode = Object.entries(s.victims).find(([, n]) => n > 0)?.[0];
  if (victimNode) {
    const a = toward(victimNode);
    if (a) return a;
  }
  if (ok({ type: 'rest' })) return { type: 'rest' };
  if (s.killer.loc === h.loc && ok({ type: 'hide' })) return { type: 'hide' };
  return { type: 'endTurn' };
}

function play(heroine: string, seed: number) {
  const c = buildContent('holloway-drive-in', 'the-projectionist', heroine);
  let s = newGame(c, seed);
  for (let i = 0; i < 2000 && !s.outcome; i++) {
    const a = botAction(c, s);
    const next = dispatch(c, s, a);
    if (next === s) s = dispatch(c, s, { type: 'endTurn' });
    else s = next;
  }
  return s;
}

describe('engine', () => {
  it('is deterministic for a seed', () => {
    const a = play('rosa', 42);
    const b = play('rosa', 42);
    expect(a.log).toEqual(b.log);
  });

  it('every game terminates, for every heroine', () => {
    const tally: Record<string, Record<string, number>> = {};
    for (const h of HEROINES) {
      tally[h.id] = { slain: 0, survived: 0, died: 0 };
      for (let seed = 1; seed <= 150; seed++) {
        const s = play(h.id, seed * 7919);
        expect(s.outcome).toBeDefined();
        expect(s.heroine.health).toBeGreaterThanOrEqual(0);
        tally[h.id][s.outcome!]++;
      }
    }
    console.table(tally);
  });

  it('rejects illegal actions without mutating', () => {
    const c = buildContent('holloway-drive-in', 'the-projectionist', 'june');
    const s = newGame(c, 1);
    expect(dispatch(c, s, { type: 'fight' })).toBe(s);
  });
});
