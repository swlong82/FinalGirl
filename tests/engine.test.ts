import { describe, expect, it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { dispatch, newGame } from '../src/engine/rules';
import { simulate } from '../src/engine/bot';

function play(heroine: string, seed: number, loc = 'holloway-drive-in', killer = 'the-projectionist') {
  const c = buildContent(loc, killer, heroine);
  return simulate(c, newGame(c, seed), dispatch);
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
      tally[h.id] = { slain: 0, escaped: 0, died: 0 };
      for (let seed = 1; seed <= 150; seed++) {
        const s = play(h.id, seed * 7919);
        expect(s.outcome).toBeDefined();
        expect(s.heroine.health).toBeGreaterThanOrEqual(0);
        tally[h.id][s.outcome!]++;
      }
    }
    console.table(tally);
  });

  it('every killer × location pairing plays to completion', () => {
    const tally: Record<string, Record<string, number>> = {};
    for (const l of LOCATIONS)
      for (const k of KILLERS) {
        const key = `${k.id} @ ${l.id}`;
        tally[key] = { slain: 0, escaped: 0, died: 0 };
        for (const h of HEROINES)
          for (let seed = 1; seed <= 12; seed++) {
            const s = play(h.id, seed * 104729, l.id, k.id);
            expect(s.outcome).toBeDefined();
            tally[key][s.outcome!]++;
          }
      }
    console.table(tally);
  });

  it('content references are valid', () => {
    for (const l of LOCATIONS) {
      const ids = new Set(l.nodes.map((n) => n.id));
      for (const [a, b] of l.edges) expect(ids.has(a) && ids.has(b), `${l.id} edge ${a}-${b}`).toBe(true);
      for (const id of [l.exit, l.lair, l.heroineStart, ...l.setupVictims]) expect(ids.has(id), `${l.id} ${id}`).toBe(true);
      const json = JSON.stringify([l.events, l.items]);
      for (const m of json.matchAll(/"(?:at|node|toward|to)":"([a-zA-Z]+)"/g))
        if (!['random', 'farFromKiller', 'nearKiller', 'heroine', 'lair', 'here'].includes(m[1])) expect(ids.has(m[1]), `${l.id} ref ${m[1]}`).toBe(true);
    }
  });

  it('killer packs never reference location-specific nodes', () => {
    const generic = ['random', 'farFromKiller', 'nearKiller', 'heroine', 'lair', 'here'];
    for (const k of KILLERS) {
      const json = JSON.stringify([k.events, k.terror, k.items, k.finale]);
      for (const m of json.matchAll(/"(?:at|node|toward|to)":"([a-zA-Z]+)"/g)) expect(generic, `${k.id} refs ${m[1]}`).toContain(m[1]);
    }
  });

  it('rejects illegal actions without mutating', () => {
    const c = buildContent('holloway-drive-in', 'the-projectionist', 'june');
    const s = newGame(c, 1);
    expect(dispatch(c, s, { type: 'playCard', uid: -1 })).toBe(s);
  });
});
