import { describe, expect, it } from 'vitest';
import { buildContent, LOCATIONS } from '../src/content/registry';
import { check, dispatch, exitOpen, gateDown, haven, killerMoveValue, killerAttack, killerSeen, killerShownAt, newGame, rollPool, walkDistances, walkNeighbors } from '../src/engine/rules';
import type { Action, Content, GameState } from '../src/engine/types';

// Season 2: one test block per location rule, killer gimmick, and new heroine trait.
const C = (h: string, l: string, k: string) => buildContent(l, k, h);

function act(c: Content, s: GameState, a: Action): GameState {
  const n = dispatch(c, s, a);
  expect(n, `illegal: ${JSON.stringify(a)} (${check(c, s, a).why})`).not.toBe(s);
  return n;
}

/** No survivors, no queue, no events, killer parked at `k`, her at `h`. */
function setup(c: Content, h: string, k: string, seed = 1): GameState {
  const s = newGame(c, seed);
  for (const n of Object.keys(s.victims)) s.victims[n] = 0;
  s.queue = [];
  s.pending = undefined;
  s.events = [];
  s.specials = [];
  s.minions = [];
  s.victimPool = 0;
  s.heroine.loc = h;
  s.killer.loc = k;
  s.heroine.hand = [];
  s.env.seen = k;
  return s;
}
const give = (s: GameState, id: string) => {
  const card = { uid: s.uid++, id };
  s.heroine.hand.push(card);
  return card.uid;
};
/** End her turn and run his, with a harmless Terror card on top. */
function hisTurn(c: Content, s: GameState, calm: string): GameState {
  s = act(c, s, { type: 'endAction' });
  s.terrorDeck = [calm, ...s.terrorDeck];
  return act(c, s, { type: 'endPlanning' });
}

describe('The Campfire (Camp Tamarack)', () => {
  const c = C('june', 'camp-tamarack', 'the-projectionist');
  it('a lit fire is a haven no killer can enter; it burns down each Upkeep and can be stoked', () => {
    let s = setup(c, 'fire', 'cabins');
    s.killer.bloodlust = 3;
    expect(haven(c, s, 'fire')).toBe(true);
    s = hisTurn(c, s, 'kv-silence');
    expect(s.killer.loc).not.toBe('fire');
    expect(s.heroine.health).toBe(s.heroine.maxHealth);
    expect(s.env.fuel).toBe(2);
    s = act(c, s, { type: 'endUpkeep' });
    s = act(c, s, { type: 'ruleAct' });
    expect(s.env.fuel).toBe(3);
    expect(check(c, s, { type: 'ruleAct' }).ok).toBe(false); // once a turn
  });
  it('an unlit fire, or the Finale, gives no shelter', () => {
    const s = setup(c, 'fire', 'cabins');
    s.env.fuel = 0;
    expect(haven(c, s, 'fire')).toBe(false);
    s.env.fuel = 3;
    s.killer.finale = true;
    expect(haven(c, s, 'fire')).toBe(false);
  });
});

describe('Security Shutters (Starlite Galleria)', () => {
  const c = C('june', 'starlite-galleria', 'the-projectionist');
  it('either set of shutters leaves every location reachable on foot', () => {
    for (const gate of [0, 1]) {
      const s = setup(c, 'lot', 'storeroom');
      s.env.gate = gate;
      expect(Object.keys(walkDistances(c, s, 'lot')).length).toBe(c.location.nodes.length);
    }
  });
  it('a closed shutter blocks her step; the sets swap each Upkeep; the Security Office overrides them', () => {
    let s = setup(c, 'food', 'storeroom');
    s.env.gate = 0; // food–fountain is red
    expect(gateDown(c, s, 'food', 'fountain')).toBe(true);
    give(s, 'ac-walk');
    s = act(c, s, { type: 'playCard', uid: s.heroine.hand[0].uid });
    expect(check(c, s, { type: 'step', to: 'fountain' }).ok).toBe(false);
    s = act(c, s, { type: 'stopMove' });
    s = hisTurn(c, s, 'kv-silence');
    expect(s.env.gate).toBe(1);
    s.heroine.loc = 'security';
    s = act(c, s, { type: 'endUpkeep' });
    s = act(c, s, { type: 'ruleAct' });
    expect(s.env.gate).toBe(0);
  });
  it('Master Keys walk through any shutter', () => {
    const b = C('bea', 'starlite-galleria', 'the-projectionist');
    const s = setup(b, 'food', 'storeroom');
    s.env.gate = 0;
    expect(walkNeighbors(b, s, 'food')).toContain('fountain');
  });
});

describe('The Last Bus (Paloma Motor Court)', () => {
  const c = C('june', 'paloma-motor-court', 'the-projectionist');
  it('the shelter is only an exit while the bus waits; it leaves with everyone waiting there', () => {
    let s = setup(c, 'office', 'bungalow');
    expect(exitOpen(c, s, 'shelter')).toBe(false);
    expect(exitOpen(c, s, 'highway')).toBe(true);
    s.victims.shelter = 2;
    s = hisTurn(c, s, 'kv-silence'); // turn 1 → bus comes on turn 3
    s = act(c, s, { type: 'endUpkeep' });
    s = hisTurn(c, s, 'kv-silence');
    expect(s.env.bus).toBe(true);
    s = act(c, s, { type: 'endUpkeep' });
    expect(s.round).toBe(3);
    expect(s.victims.shelter).toBe(2); // she isn't there
    s = act(c, s, { type: 'endAction' });
    expect(s.saved).toBe(2); // they caught the bus without her
    expect(s.victims.shelter).toBe(0);
    expect(s.env.bus).toBe(false);
  });
});

describe('The DJ’s Set (Rollerdrome)', () => {
  const c = C('june', 'rollerdrome-skateland', 'the-projectionist');
  it('fast song: +1 move for both; couples skate: hide +1, search −1, he −1; strobe: attack +1 die, he hits +1', () => {
    const s = setup(c, 'rink', 'catwalk');
    const base = { ...s, env: { ...s.env, song: undefined } };
    const hide = c.actions.find((a) => a.id === 'ac-hide')!;
    const search = c.actions.find((a) => a.id === 'ac-search')!;
    const swing = c.actions.find((a) => a.id === 'ac-fullswing')!;
    const ref = buildContent('holloway-drive-in', 'the-projectionist', 'june');
    s.env.song = 0;
    expect(killerMoveValue(c, s)).toBe(killerMoveValue(ref, base) + 1);
    s.env.song = 1;
    expect(killerMoveValue(c, s)).toBe(killerMoveValue(ref, base) - 1);
    expect(rollPool(c, s, hide)).toBe(rollPool(ref, base, hide) + 1);
    expect(rollPool(c, s, search)).toBe(rollPool(ref, base, search) - 1);
    s.env.song = 2;
    expect(rollPool(c, s, swing)).toBe(rollPool(ref, base, swing) + 1);
    expect(killerAttack(c, s)).toBe(killerAttack(ref, base) + 1);
  });
  it('the song changes every Upkeep and can be skipped at the booth', () => {
    let s = setup(c, 'booth', 'catwalk');
    expect(s.env.song).toBe(0);
    s = act(c, s, { type: 'ruleAct' });
    expect(s.env.song).toBe(1);
    s = hisTurn(c, s, 'kv-silence');
    expect(s.env.song).toBe(2);
  });
});

describe('The Corn (Harrow Farm)', () => {
  const c = C('june', 'harrow-farm', 'the-projectionist');
  it('he is hidden in the corn more than a step away; the map shows where she last saw him', () => {
    const s = setup(c, 'road', 'crossroads');
    s.env.seen = 'cellar';
    expect(killerSeen(c, s)).toBe(false);
    expect(killerShownAt(c, s)).toBe('cellar');
    s.killer.loc = 'entrance';
    s.heroine.loc = 'stand'; // next door
    expect(killerSeen(c, s)).toBe(true);
  });
  it('the silo look-out shows him until the turn ends; Mae always sees him', () => {
    let s = setup(c, 'silo', 'deadend');
    expect(killerSeen(c, s)).toBe(false);
    s = act(c, s, { type: 'ruleAct' });
    expect(killerSeen(c, s)).toBe(true);
    expect(s.env.seen).toBe('deadend');
    const m = C('mae', 'harrow-farm', 'the-projectionist');
    expect(killerSeen(m, setup(m, 'road', 'deadend'))).toBe(true);
  });
});

describe('The Trapper', () => {
  const c = C('june', 'holloway-drive-in', 'the-trapper');
  it('leaves a trap where he was each time he moves; stepping in hurts and ends her move', () => {
    let s = setup(c, 'booth', 'junkyard');
    const start = s.killer.loc;
    s = hisTurn(c, s, 'tr-notches');
    expect(s.killer.loc).not.toBe(start);
    expect(s.traps).toContain(start);
    s = act(c, s, { type: 'endUpkeep' });
    const t = setup(c, 'booth', 'junkyard');
    const next = walkNeighbors(c, t, 'booth')[0];
    t.traps = [next];
    give(t, 'ac-sprint');
    let u = act(c, t, { type: 'playCard', uid: t.heroine.hand[0].uid });
    const hp = u.heroine.health;
    u = act(c, u, { type: 'step', to: next });
    expect(u.heroine.health).toBe(hp - 1);
    expect(u.pending).toBeUndefined(); // the trap ends the move
    expect(u.traps).toEqual([]);
  });
  it('Trail Sense springs traps safely', () => {
    const n = C('nora', 'holloway-drive-in', 'the-trapper');
    const t = setup(n, 'booth', 'junkyard');
    const next = walkNeighbors(n, t, 'booth')[0];
    t.traps = [next];
    give(t, 'ac-sprint');
    let u = act(n, t, { type: 'playCard', uid: t.heroine.hand[0].uid });
    const hp = u.heroine.health;
    u = act(n, u, { type: 'step', to: next });
    expect(u.heroine.health).toBe(hp);
    expect(u.pending?.kind).toBe('move');
  });
});

describe('The Window Dresser', () => {
  const c = C('june', 'holloway-drive-in', 'the-window-dresser');
  it('poses a mannequin, then appears there next turn and attacks', () => {
    let s = setup(c, 'booth', 'junkyard');
    s.victims.screen = 1;
    s = hisTurn(c, s, 'wd-count');
    const posed = s.killer.posed!;
    expect(posed).toBeDefined();
    s = act(c, s, { type: 'endUpkeep' });
    s.victims[posed] = 1;
    s = hisTurn(c, s, 'wd-count');
    expect(s.killer.loc).toBe(posed);
  });
  it('a barricade on the posed location holds him out; a lure knocks the mannequin over', () => {
    let s = setup(c, 'booth', 'junkyard');
    s.killer.posed = 'screen';
    s.barricades.screen = 1;
    s = hisTurn(c, s, 'wd-count');
    expect(s.killer.loc).toBe('junkyard');
    expect(s.barricades.screen).toBe(0);
    const t = setup(c, 'booth', 'junkyard');
    t.killer.posed = 'screen';
    t.queue = [{ op: 'killerMove', toward: 'lair', steps: 1 }];
    const u = dispatch(c, t, { type: 'endAction' });
    expect(u.killer.posed).toBeUndefined();
  });
});

describe('The Night Manager', () => {
  const c = C('june', 'holloway-drive-in', 'the-night-manager');
  it('takes survivors to her lair alive; she can free them there; otherwise they die when time runs out', () => {
    let s = setup(c, 'gate', 'junkyard');
    s.victims.junkyard = 1;
    s = hisTurn(c, s, 'nm-ledger');
    expect(s.slain).toBe(0);
    expect(s.captives?.length).toBe(1);
    expect(s.killer.bloodlust).toBe(2); // taking a captive feeds her, and so does the Ledger card
    // Let the clock run out.
    let t = s;
    for (let i = 0; i < 2; i++) {
      t = act(c, t, { type: 'endUpkeep' });
      t = hisTurn(c, t, 'nm-ledger');
    }
    expect(t.captives?.length).toBe(0);
    expect(t.slain).toBe(1);
    // Or walk into the lair in time.
    s = act(c, s, { type: 'endUpkeep' });
    s.heroine.loc = c.location.lair;
    s.killer.loc = 'gate';
    s = act(c, s, { type: 'discardForNerve', uid: give(s, 'ac-walk') });
    expect(s.captives?.length).toBe(0);
    expect(s.victims[c.location.lair]).toBe(1);
  });
});

describe('The Mirrorball', () => {
  const c = C('june', 'holloway-drive-in', 'the-mirrorball');
  it('her fear speeds him up, sharpens his hits, and heals him', () => {
    let s = setup(c, 'booth', 'junkyard');
    s.heroine.horror = 2;
    const mv = killerMoveValue(c, s);
    const at = killerAttack(c, s);
    s.heroine.horror = 4;
    expect(killerMoveValue(c, s)).toBe(mv);
    s.heroine.horror = 5;
    expect(killerMoveValue(c, s)).toBe(mv + 1);
    s.heroine.horror = 6;
    expect(killerAttack(c, s)).toBe(at + 1);
    s.killer.health -= 3;
    const hp = s.killer.health;
    s = hisTurn(c, s, 'mb-crown');
    expect(s.killer.health).toBeGreaterThan(hp);
  });
});

describe('The Harvestman', () => {
  const c = C('june', 'holloway-drive-in', 'the-harvestman');
  it('moves exactly as far as she walked this turn (at least 1)', () => {
    let s = setup(c, 'booth', 'junkyard');
    expect(killerMoveValue(c, s)).toBe(1);
    give(s, 'ac-sprint');
    s = act(c, s, { type: 'playCard', uid: s.heroine.hand[0].uid });
    s = act(c, s, { type: 'step', to: walkNeighbors(c, s, 'booth')[0] });
    s = act(c, s, { type: 'step', to: walkNeighbors(c, s, s.heroine.loc).find((n) => n !== 'booth')! });
    expect(killerMoveValue(c, s)).toBe(2);
  });
});

describe('Season 2 heroines and named survivors', () => {
  it('Lou has three hand slots; Roxy’s light hits deal +1; Nora’s calls bring 1 more', () => {
    const lou = C('lou', 'holloway-drive-in', 'the-projectionist');
    const s = setup(lou, 'booth', 'junkyard');
    s.heroine.items = [{ uid: 900, id: 'tire-iron' }, { uid: 901, id: 'tire-iron' }];
    s.heroine.pack = [{ uid: 902, id: 'tire-iron' }];
    s.rearrange = true;
    expect(check(lou, s, { type: 'ready', uid: 902 }).ok).toBe(true);

    const rox = C('roxy', 'holloway-drive-in', 'the-projectionist');
    let r = setup(rox, 'booth', 'booth');
    give(r, 'ac-swing');
    r = act(rox, r, { type: 'playCard', uid: r.heroine.hand[0].uid });
    if (r.pending?.kind === 'roll') r = act(rox, r, { type: 'resolveRoll' });
    const dealt = r.killer.maxHealth - r.killer.health;
    expect(dealt === 0 || dealt === 2 || dealt === 3).toBe(true); // Swing 1–2, +1 Hip Check

    const nora = C('nora', 'holloway-drive-in', 'the-projectionist');
    let n = setup(nora, 'booth', 'junkyard');
    for (const x of walkNeighbors(nora, n, 'booth')) n.victims[x] = 3;
    n.queue = [{ op: 'rally', n: 1 }];
    n = dispatch(nora, n, { type: 'discardForNerve', uid: give(n, 'ac-walk') });
    expect(n.victims.booth).toBe(2);
  });
  it('Bea’s Lockdown barricades every location next door; Mae’s Hayloft hides her with him in the room', () => {
    const bea = C('bea', 'holloway-drive-in', 'the-projectionist');
    let b = setup(bea, 'booth', 'junkyard');
    b.heroine.rescued = 99;
    b = act(bea, b, { type: 'useAbility' });
    const around = walkNeighbors(bea, b, 'booth').filter((n) => !bea.location.nodes.find((q) => q.id === n)!.exit && n !== b.killer.loc);
    expect(around.length).toBeGreaterThan(0);
    for (const x of around) expect(b.barricades[x]).toBe(2);
    const mae = C('mae', 'holloway-drive-in', 'the-projectionist');
    let m = setup(mae, 'booth', 'booth');
    m.heroine.rescued = 99;
    m = act(mae, m, { type: 'useAbility' });
    expect(m.heroine.hidden).toBe(true);
  });
  it('Nurse Opal heals her each Upkeep; Gus swings first', () => {
    const camp = C('june', 'camp-tamarack', 'the-projectionist');
    let s = setup(camp, 'mess', 'shed');
    s.specials = [{ id: 'sp-opal', at: 'mess' }];
    s.heroine.health -= 2;
    const hp = s.heroine.health;
    s = hisTurn(camp, s, 'kv-silence');
    expect(s.heroine.health).toBe(hp + 1);

    const mall = C('june', 'starlite-galleria', 'the-projectionist');
    let t = setup(mall, 'lot', 'santa');
    t.specials = [{ id: 'sp-gus', at: 'santa' }];
    const khp = t.killer.health;
    t = hisTurn(mall, t, 'kv-silence');
    expect(t.killer.health).toBe(khp - 1);
  });
});

describe('Season 2 maps', () => {
  it('every Season 2 location has two exits, four item piles, a lair and its rule’s tagged spots', () => {
    const want: Record<string, string> = { campfire: 'fire', shutters: 'switch', bus: 'bus', dj: 'booth', corn: 'lookout' };
    for (const l of LOCATIONS.slice(5)) {
      expect(l.nodes.filter((n) => n.exit).length, l.id).toBe(2);
      expect(l.nodes.filter((n) => n.search).length, l.id).toBe(4);
      expect(l.nodes.some((n) => n.tags?.includes(want[l.rule.kind] as never)), l.id).toBe(true);
      const ids = new Set(l.nodes.map((n) => n.id));
      for (const set of l.rule.gates ?? []) for (const [a, b] of set) expect(l.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a)), `${l.id} gate ${a}-${b}`).toBe(true);
      expect(ids.has(l.lair)).toBe(true);
    }
  });
});
