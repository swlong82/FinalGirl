import { describe, expect, it } from 'vitest';
import { buildContent, HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
import { buyUpMatters, check, DIFFICULTY, dispatch, distances, HAND_LIMIT, isExit, neighbors, newGame, panicTable, SETUP_SURVIVORS, TERROR_DEAL } from '../src/engine/rules';
import { botAction, simulate } from '../src/engine/bot';
import { advise, currentGoal } from '../src/engine/coach';
import { TUTORIAL, tutorialGame } from '../src/engine/tutorial';
import type { Action, Content, GameState } from '../src/engine/types';

const C = (h = 'june', l = 'holloway-drive-in', k = 'the-projectionist') => buildContent(l, k, h);

function play(heroine: string, seed: number, loc = 'holloway-drive-in', killer = 'the-projectionist') {
  const c = C(heroine, loc, killer);
  return simulate(c, newGame(c, seed), dispatch);
}

/** Dispatch and insist the action was legal. */
function act(c: Content, s: GameState, a: Action): GameState {
  const n = dispatch(c, s, a);
  expect(n, `illegal: ${JSON.stringify(a)}`).not.toBe(s);
  return n;
}

/** A calm, controlled board: no survivors, killer parked far away. */
function quiet(c: Content, seed = 1): GameState {
  const s = newGame(c, seed);
  for (const k of Object.keys(s.victims)) s.victims[k] = 0;
  s.queue = [];
  s.pending = undefined;
  s.events = [];
  const d = distances(c, s.heroine.loc);
  s.killer.loc = Object.keys(d).sort((a, b) => d[b] - d[a])[0];
  return s;
}

const giveCard = (s: GameState, id: string) => {
  const card = { uid: s.uid++, id };
  s.heroine.hand.push(card);
  return card.uid;
};

describe('engine', () => {
  it('is deterministic for a seed', () => {
    expect(play('rosa', 42).log).toEqual(play('rosa', 42).log);
  });

  it('every game terminates, for every heroine', () => {
    for (const h of HEROINES)
      for (let seed = 1; seed <= 40; seed++) {
        const s = play(h.id, seed * 7919);
        expect(s.outcome).toBeDefined();
        expect(s.heroine.health).toBeGreaterThanOrEqual(0);
      }
  });

  it('every killer × location pairing plays to completion', () => {
    for (const l of LOCATIONS)
      for (const k of KILLERS)
        for (const h of HEROINES)
          for (let seed = 1; seed <= 3; seed++) expect(play(h.id, seed * 104729, l.id, k.id).outcome).toBeDefined();
  });

  it('content references are valid', () => {
    for (const l of LOCATIONS) {
      const ids = new Set(l.nodes.map((n) => n.id));
      for (const [a, b] of l.edges) expect(ids.has(a) && ids.has(b), `${l.id} edge ${a}-${b}`).toBe(true);
      expect(ids.has(l.lair)).toBe(true);
      expect(l.nodes.some((n) => n.exit), `${l.id} needs an exit`).toBe(true);
      expect(l.nodes.some((n) => n.search), `${l.id} needs a search location`).toBe(true);
      expect(l.events.length).toBeGreaterThan(0);
      for (const st of l.setups) for (const id of [st.heroine, st.killer, ...st.npcs]) expect(ids.has(id), `${l.id} setup ${id}`).toBe(true);
      const json = JSON.stringify([l.terror, l.events, l.items]);
      for (const m of json.matchAll(/"(?:at|node|toward|to)":"([a-zA-Z]+)"/g))
        if (!['random', 'farFromKiller', 'nearKiller', 'heroine', 'lair', 'here', 'exit'].includes(m[1])) expect(ids.has(m[1]), `${l.id} ref ${m[1]}`).toBe(true);
      for (const n of l.nodes) for (const t of n.panic ?? []) if (t) expect(ids.has(t)).toBe(true);
    }
  });

  it('killer packs never reference location-specific nodes', () => {
    const generic = ['random', 'farFromKiller', 'nearKiller', 'heroine', 'lair', 'here', 'exit'];
    for (const k of KILLERS) {
      const json = JSON.stringify([k.terror, k.items, k.finale, k.bloodlust, k.power, k.behavior, k.revive]);
      for (const m of json.matchAll(/"(?:at|node|toward|to)":"([a-zA-Z]+)"/g)) expect(generic, `${k.id} refs ${m[1]}`).toContain(m[1]);
    }
  });

  it('rejects illegal actions without mutating', () => {
    const c = C();
    const s = newGame(c, 1);
    expect(dispatch(c, s, { type: 'playCard', uid: -1 })).toBe(s);
    expect(dispatch(c, s, { type: 'buy', id: 'ac-run' })).toBe(s); // not in Planning
  });
});

describe('setup', () => {
  it('deals six starters, 10 terror cards, one ongoing event, and per-location item piles', () => {
    const c = C();
    const s = newGame(c, 5);
    expect(s.heroine.hand.length).toBe(c.actions.filter((a) => a.starter).length);
    expect(s.heroine.hand.length).toBe(6);
    expect(s.terrorDeck.length).toBe(TERROR_DEAL);
    expect(s.events.length).toBe(1);
    for (const n of c.location.nodes.filter((x) => x.search)) expect(s.piles[n.id].cards.length).toBe(4);
    const dealt = Object.values(s.piles).flatMap((p) => p.cards);
    for (const lore of c.killer.items) expect(dealt).toContain(lore.id);
    expect(s.heroine.nerve).toBe(DIFFICULTY.standard.nerve);
    expect(s.heroine.token).not.toBeUndefined();
  });

  it('only the three basics are free; the other starters cost nerve', () => {
    const c = C();
    expect(c.actions.filter((a) => a.cost === 0).map((a) => a.id).sort()).toEqual(['ac-duck', 'ac-look', 'ac-walk']);
    expect(c.actions.filter((a) => a.starter && a.cost > 0).length).toBe(3);
  });

  it('a survivor wanders in every Upkeep, at least 2 steps from him, until the supply runs out', () => {
    const c = C();
    let s = quiet(c);
    const count = (x: GameState) => Object.values(x.victims).reduce((n, v) => n + v, 0);
    s = act(c, s, { type: 'endAction' });
    s = act(c, s, { type: 'endPlanning' });
    for (let i = 0; i < 20 && s.phase !== 'upkeep'; i++) s = dispatch(c, s, s.pending?.kind === 'reaction' ? { type: 'takeHit' } : { type: 'endUpkeep' });
    expect(s.phase).toBe('upkeep');
    const d = distances(c, s.killer.loc);
    const placed = Object.entries(s.victims).filter(([, v]) => v > 0);
    expect(count(s)).toBeGreaterThanOrEqual(1);
    for (const [at] of placed) expect(d[at]).toBeGreaterThanOrEqual(1);
    // With the supply empty, nobody new arrives.
    let e = quiet(c);
    e.victimPool = 0;
    e = act(c, e, { type: 'endAction' });
    e = act(c, e, { type: 'endPlanning' });
    for (let i = 0; i < 20 && e.phase !== 'upkeep'; i++) e = dispatch(c, e, e.pending?.kind === 'reaction' ? { type: 'takeHit' } : { type: 'endUpkeep' });
    expect(count(e)).toBe(0);
  });

  it('places two survivors on every setup-card spot', () => {
    for (const l of LOCATIONS) {
      const c = buildContent(l.id, 'the-projectionist', 'june');
      const s = newGame(c, 3);
      const spots = new Set(c.location.setups.flatMap((x) => x.npcs));
      const placed = Object.entries(s.victims).filter(([at]) => spots.has(at));
      expect(placed.reduce((n, [, v]) => n + v, 0), l.id).toBeGreaterThanOrEqual(3 * SETUP_SURVIVORS);
    }
  });
});

describe('Horror Rolls', () => {
  it('3–4 is a partial; discarding 2 cards turns it into a success', () => {
    const c = C();
    let s = quiet(c);
    const swing = giveCard(s, 'ac-steady');
    s.heroine.horror = 4;
    s.rolling = { uid: swing, dice: [3, 1, 2], converted: [], card: 'ac-steady', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-steady', reaction: false };
    s.heroine.hand = s.heroine.hand.filter((x) => x.uid !== swing);
    const [a, b] = s.heroine.hand.slice(0, 2).map((x) => x.uid);
    const handBefore = s.heroine.hand.length;
    s = act(c, s, { type: 'convert', die: 0, discard: [a, b] });
    expect(s.heroine.hand.length).toBe(handBefore - 2);
    expect(s.lastRoll?.successes).toBe(1);
    expect(s.lastRoll?.band).toBe('good');
    expect(s.heroine.horror).toBe(3); // Steady Yourself, one success: horror −1
    expect(s.discard.length).toBe(2);
  });

  it('only one partial per roll can be bought up', () => {
    const c = C();
    let s = quiet(c);
    const uid = giveCard(s, 'ac-steady');
    s.rolling = { uid, dice: [3, 4, 1], converted: [], card: 'ac-steady', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-steady', reaction: false };
    s.heroine.hand = s.heroine.hand.filter((x) => x.uid !== uid);
    const [a, b, x, y] = s.heroine.hand.slice(0, 4).map((q) => q.uid);
    s = act(c, s, { type: 'convert', die: 0, discard: [a, b] });
    // One buy-up resolves the roll at once: the second partial stays a partial.
    expect(s.pending?.kind).not.toBe('roll');
    expect(s.lastRoll?.successes).toBe(1);
    expect(check(c, s, { type: 'convert', die: 1, discard: [x, y] }).ok).toBe(false);
  });

  it('a 1 or 2 cannot be bought up', () => {
    const c = C();
    const s = quiet(c);
    s.rolling = { uid: 0, dice: [2, 6], converted: [], card: 'ac-steady', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-steady', reaction: false };
    const [a, b] = s.heroine.hand.map((x) => x.uid);
    expect(dispatch(c, s, { type: 'convert', die: 0, discard: [a, b] })).toBe(s);
  });
});

describe('nerve & the action-card economy', () => {
  it('going below zero ends the Action phase and nerve cannot climb back above zero', () => {
    const c = C();
    let s = quiet(c);
    s.heroine.nerve = 0;
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-sprint'); // cost 2, no roll: move 2
    s = act(c, s, { type: 'playCard', uid });
    expect(s.heroine.nerve).toBe(-2);
    s = act(c, s, { type: 'stopMove' });
    expect(s.phase).toBe('planning');
  });

  it('a card played this turn cannot be bought back until after Planning', () => {
    const c = C();
    let s = quiet(c);
    s.tableau['ac-run'] = 1;
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-run');
    s.tableau['ac-run'] = 0;
    s = act(c, s, { type: 'playCard', uid });
    while (s.pending) s = act(c, s, s.pending.kind === 'move' ? { type: 'stopMove' } : { type: 'resolveRoll' });
    s = act(c, s, { type: 'endAction' });
    expect(dispatch(c, s, { type: 'buy', id: 'ac-run' })).toBe(s);
    s = act(c, s, { type: 'endPlanning' });
    expect(s.tableau['ac-run']).toBe(1);
    expect(s.heroine.nerve).toBe(DIFFICULTY.standard.nerve);
  });

  it('zero-cost cards can be bought at negative nerve; costed ones cannot; hand limit 10', () => {
    const c = C();
    let s = quiet(c);
    s.phase = 'planning';
    s.heroine.nerve = -1;
    s.heroine.hand = [];
    expect(dispatch(c, s, { type: 'buy', id: 'ac-run' })).toBe(s);
    s = act(c, s, { type: 'buy', id: 'ac-walk' });
    for (let i = s.heroine.hand.length; i < HAND_LIMIT; i++) giveCard(s, 'ac-walk');
    s.tableau['ac-adrenaline'] = 2;
    expect(dispatch(c, s, { type: 'buy', id: 'ac-adrenaline' })).toBe(s);
  });

  it('there is no cap on buys: only nerve and the hand limit', () => {
    const c = C();
    let s = quiet(c);
    s.phase = 'planning';
    s.heroine.nerve = 9;
    s.heroine.hand = [];
    for (const id of ['ac-search', 'ac-swing', 'ac-swing', 'ac-hide', 'ac-psych', 'ac-overhere', 'ac-brace', 'ac-slip', 'ac-steadyhands']) s = act(c, s, { type: 'buy', id });
    expect(s.heroine.hand.length).toBe(9);
    expect(s.heroine.nerve).toBe(0);
    s = act(c, s, { type: 'buy', id: 'ac-walk' }); // free basics still fit at 0 nerve
    expect(s.heroine.hand.length).toBe(HAND_LIMIT);
  });

  it('discarding a card in the Action phase gives +1 nerve', () => {
    const c = C();
    let s = quiet(c);
    const before = s.heroine.nerve;
    s = act(c, s, { type: 'discardForNerve', uid: s.heroine.hand[0].uid });
    expect(s.heroine.nerve).toBe(before + 1);
  });
});

describe('the killer', () => {
  it('attacks survivors before her, and each kill feeds bloodlust', () => {
    const c = C();
    let s = quiet(c);
    s.killer.loc = s.heroine.loc;
    s.victims[s.heroine.loc] = 2;
    s.heroine.hand = [];
    s = act(c, s, { type: 'endAction' });
    s.terrorDeck = ['kv-silence', ...s.terrorDeck]; // a quiet terror card
    const hp = s.heroine.health;
    s = act(c, s, { type: 'endPlanning' });
    expect(s.slain).toBe(1);
    expect(s.killer.bloodlust).toBe(1);
    expect(s.heroine.health).toBe(hp);
  });

  it('a reaction can cancel one attack', () => {
    const c = C();
    let s = quiet(c);
    s.killer.loc = s.heroine.loc;
    s.heroine.hand = [];
    giveCard(s, 'ac-dodge');
    s = act(c, s, { type: 'endAction' });
    s.terrorDeck = ['kv-silence', ...s.terrorDeck];
    s = act(c, s, { type: 'endPlanning' });
    expect(s.pending?.kind).toBe('reaction');
    const hp = s.heroine.health;
    s = act(c, s, { type: 'react', uid: s.heroine.hand[0].uid });
    expect(s.heroine.health).toBe(hp);
    expect(s.heroine.nerve).toBe(DIFFICULTY.standard.nerve - 2); // Dodge costs 2 of next turn's nerve
    expect(s.phase).toBe('upkeep');
  });

  it('the Finale is revealed in Upkeep once the Terror deck is empty, and no Terror is drawn after', () => {
    const c = C();
    let s = quiet(c);
    s.terrorDeck = ['kv-silence'];
    s = act(c, s, { type: 'endAction' });
    s = act(c, s, { type: 'endPlanning' });
    expect(s.killer.finale).toBe(true);
    expect(s.killer.power).not.toBe('hidden');
    s.terrorDeck = ['kv-burn'];
    s = act(c, s, { type: 'endUpkeep' });
    s = act(c, s, { type: 'endAction' });
    s = act(c, s, { type: 'endPlanning' });
    expect(s.terrorDeck).toEqual(['kv-burn']);
  });

  it('horror past the top feeds bloodlust; below zero gives nerve', () => {
    const c = C('june');
    let s = quiet(c);
    s.heroine.horror = 6;
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-adrenaline'); // +2 nerve, +1 horror
    s = act(c, s, { type: 'playCard', uid });
    expect(s.heroine.horror).toBe(6);
    expect(s.killer.bloodlust).toBe(1);
    // A second spill-over in the same turn doesn't feed him again.
    const uid3 = giveCard(s, 'ac-adrenaline');
    s = act(c, s, { type: 'playCard', uid: uid3 });
    expect(s.killer.bloodlust).toBe(1);
    s.heroine.horror = 0;
    const n = s.heroine.nerve;
    s.pending = undefined;
    const uid2 = giveCard(s, 'ac-deepbreath');
    s.rolling = undefined;
    s = act(c, s, { type: 'playCard', uid: uid2 });
    while (s.pending?.kind === 'roll') s = act(c, s, { type: 'resolveRoll' });
    expect(s.heroine.nerve).toBeGreaterThanOrEqual(n - 1 + 1);
  });
});

describe('health & final-health tokens', () => {
  it('a token with a number revives her and ends the phase; a blank one kills', () => {
    const c = C();
    let s = quiet(c);
    s.heroine.health = 1;
    s.heroine.token = 2;
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-desperate');
    s.killer.loc = s.heroine.loc;
    s.rolling = { uid, dice: [1], converted: [], card: 'ac-desperate', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-desperate', reaction: false };
    s.heroine.horror = 0;
    // Fail band: lose 1 health. 1 → 0 (token still hidden).
    s = act(c, s, { type: 'resolveRoll' });
    expect(s.heroine.health).toBe(0);
    expect(s.heroine.token).toBe(2);
    expect(s.phase).toBe('action');
    // Any more damage reveals the token.
    const uid2 = giveCard(s, 'ac-desperate');
    s.rolling = { uid: uid2, dice: [1], converted: [], card: 'ac-desperate', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-desperate', reaction: false };
    s = act(c, s, { type: 'resolveRoll' });
    expect(s.heroine.token).toBe(null);
    expect(s.heroine.health).toBe(2);
    expect(s.phase).toBe('planning');
    expect(s.outcome).toBeUndefined();

    let t = quiet(c);
    t.heroine.health = 0;
    t.heroine.token = 0;
    t.killer.loc = t.heroine.loc;
    const u = giveCard(t, 'ac-desperate');
    t.rolling = { uid: u, dice: [1], converted: [], card: 'ac-desperate', reaction: false, range: 0 };
    t.pending = { kind: 'roll', card: 'ac-desperate', reaction: false };
    t = act(c, t, { type: 'resolveRoll' });
    expect(t.outcome).toBe('died');
  });

  it('if both fall in the same resolution, she wins', () => {
    const c = C();
    let s = quiet(c);
    s.killer.loc = s.heroine.loc;
    s.killer.health = 0;
    s.killer.token = null;
    s.heroine.health = 0;
    s.heroine.token = null;
    // One resolution that hurts her, then him.
    s.queue = [{ op: 'wound', n: 1 }, { op: 'killerDamage', n: 1 }];
    s.pending = undefined;
    s = act(c, s, { type: 'discardForNerve', uid: s.heroine.hand[0].uid });
    expect(s.outcome).toBe('slain');
  });
});

describe('survivors', () => {
  it('up to 2 follow her, never into his location, and an exit rescues them', () => {
    const c = C('june');
    let s = quiet(c);
    const exit = c.location.nodes.find((n) => n.exit)!.id;
    const from = neighbors(c, exit).find((n) => !isExit(c, n))!;
    s.heroine.loc = from;
    s.victims[from] = 3;
    s.killer.loc = Object.keys(distances(c, exit)).sort((a, b) => distances(c, exit)[b] - distances(c, exit)[a])[0];
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-walk');
    s = act(c, s, { type: 'playCard', uid });
    s = act(c, s, { type: 'step', to: exit });
    expect(s.saved).toBe(2);
    expect(s.victims[from]).toBe(1);
    expect(s.heroine.rescued).toBe(2);

    let t = quiet(c);
    const next = neighbors(c, t.heroine.loc)[0];
    t.victims[t.heroine.loc] = 2;
    t.killer.loc = next;
    const u = giveCard(t, 'ac-walk');
    t = act(c, t, { type: 'playCard', uid: u });
    t = act(c, t, { type: 'step', to: next });
    expect(t.victims[next]).toBe(0);
  });

  it('filling every rescue slot unlocks her ability', () => {
    const c = C('tess');
    let s = quiet(c);
    const exit = c.location.nodes.find((n) => n.exit)!.id;
    s.heroine.loc = exit;
    s.victims[exit] = 4;
    s = act(c, s, { type: 'discardForNerve', uid: s.heroine.hand[0].uid }); // any action triggers the exit check
    expect(s.heroine.rescued).toBe(4);
    expect(dispatch(c, s, { type: 'useAbility' })).not.toBe(s);
  });

  it('survivors with him panic only if someone died this turn', () => {
    const c = C();
    const s = quiet(c);
    const t = panicTable(c, s.killer.loc);
    expect(t).toHaveLength(6);
    expect(t[0]).toBeNull();
    for (const n of t) if (n) expect(neighbors(c, s.killer.loc)).toContain(n);
  });
});

describe('items & searching', () => {
  it('searching draws from the pile, keeps some and puts the rest back face up', () => {
    const c = C();
    let s = quiet(c);
    const node = c.location.nodes.find((n) => n.search)!.id;
    s.heroine.loc = node;
    s.killer.loc = Object.keys(distances(c, node)).sort((a, b) => distances(c, node)[b] - distances(c, node)[a])[0];
    s.piles[node] = { cards: ['tire-iron', 'firstaid', 'candy', 'aspirin'], up: true };
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-search');
    s.heroine.horror = 0;
    s.rolling = undefined;
    s = act(c, s, { type: 'playCard', uid });
    while (s.pending?.kind === 'roll') s = act(c, s, { type: 'resolveRoll' });
    if (s.pending?.kind === 'search') {
      const p = s.pending;
      s = act(c, s, { type: 'keep', picks: [0] });
      expect(s.heroine.items.length + s.heroine.pack.length).toBe(1);
      expect(s.piles[node].cards.length).toBe(4 - 1);
      expect(s.piles[node].cards[0]).toBe(p.drawn.length > 1 ? p.drawn[1] : 'firstaid');
      expect(s.rearrange).toBe(true);
    }
  });

  it('two hand slots: a two-handed item fills both, and swaps only happen on gain or in Upkeep', () => {
    const c = C();
    const s = quiet(c);
    s.heroine.items = [{ uid: 900, id: 'tire-iron' }];
    s.heroine.pack = [{ uid: 901, id: 'shears' }];
    s.rearrange = false;
    expect(dispatch(c, s, { type: 'ready', uid: 901, swapOut: [900] })).toBe(s);
    s.rearrange = true;
    expect(dispatch(c, s, { type: 'ready', uid: 901 })).toBe(s); // needs both hands
    const n = dispatch(c, s, { type: 'ready', uid: 901, swapOut: [900] });
    expect(n.heroine.items.map((i) => i.id)).toEqual(['shears']);
  });
});

describe('tie-break policies', () => {
  // Projectionist at the Concession Stand; one survivor each in Rows A and the Restrooms (both 1 step away);
  // she is at the Ticket Booth, 2 away. A genuine tie between Rows A (next to her) and the Restrooms.
  const tie = (policy: 'adverse' | 'plausible' | 'comedic' | 'random', prev?: string) => {
    const c = C();
    let s = quiet(c);
    s.tiebreak = policy;
    s.heroine.loc = 'gate';
    s.killer.loc = 'concession';
    s.killer.target = prev;
    s.victims.lotA = 1;
    s.victims.restrooms = 1;
    s.heroine.hand = [];
    s = act(c, s, { type: 'endAction' });
    s.terrorDeck = ['kv-silence', ...s.terrorDeck];
    s = act(c, s, { type: 'endPlanning' });
    return s;
  };
  it('player-adverse goes for the group next to her', () => {
    const s = tie('adverse');
    expect(s.killer.target).toBe('lotA');
    expect(s.log.some((l) => l.text.startsWith('Tie-break (player-adverse)'))).toBe(true);
  });
  it('most plausible keeps after his previous target', () => {
    expect(tie('plausible', 'restrooms').killer.target).toBe('restrooms');
  });
  it('comedic wanders after the farther option and logs a pratfall', () => {
    const s = tie('comedic');
    expect(s.killer.target).toBe('restrooms');
    expect(s.log.some((l) => l.text.startsWith('Tie-break (comedic)') && l.text.length > 60)).toBe(true);
  });
  it('random is seeded and replayable', () => {
    expect(tie('random').killer.target).toBe(tie('random').killer.target);
  });
});

describe('named survivors', () => {
  it('a heavy survivor counts as 2 when following; rescue pays the slot and their own reward', () => {
    const c = C('june', 'gullhaven-tide-cabins');
    let s = quiet(c);
    s.heroine.loc = 'office';
    s.killer.loc = 'light';
    s.specials = [{ id: 'sp-gilley', at: 'office' }];
    s.victims.office = 1;
    s.heroine.hand = [];
    s.heroine.health = 1;
    const uid = giveCard(s, 'ac-walk');
    s = act(c, s, { type: 'playCard', uid });
    s = act(c, s, { type: 'step', to: 'causeway' });
    expect(s.victims.office).toBe(1); // Gilley used both places
    expect(s.saved).toBe(1);
    expect(s.specialsGone).toEqual([{ id: 'sp-gilley', how: 'rescued' }]);
    expect(s.heroine.rescued).toBe(1);
    expect(s.heroine.health).toBe(2); // Gilley's flask: heal 1
  });

  it('under player-adverse he reaches the named survivor first, and their death costs extra', () => {
    const c = C('june', 'gullhaven-tide-cabins');
    let s = quiet(c);
    s.killer.loc = 'beach';
    s.specials = [{ id: 'sp-gilley', at: 'beach' }];
    s.victims.beach = 1;
    s.heroine.hand = [];
    s = act(c, s, { type: 'endAction' });
    s.terrorDeck = ['kv-silence', ...s.terrorDeck];
    s = act(c, s, { type: 'endPlanning' });
    expect(s.specialsGone).toEqual([{ id: 'sp-gilley', how: 'dead' }]);
    expect(s.killer.bloodlust).toBe(2); // the kill, plus Gilley's death
  });

  it('a still survivor never panics; a toExit one walks for the exit in Upkeep', () => {
    const c = C('june', 'saint-agatha-west-wing');
    let s = quiet(c);
    s.killer.loc = 'chapel';
    s.specials = [{ id: 'sp-ruiz', at: 'chapel' }];
    s.victims.chapel = 1;
    s.tiebreak = 'plausible'; // the crowd first
    s.heroine.hand = [];
    s = act(c, s, { type: 'endAction' });
    s.terrorDeck = ['kv-silence', ...s.terrorDeck];
    s = act(c, s, { type: 'endPlanning' });
    expect(s.slain).toBe(1);
    expect(s.specials).toEqual([{ id: 'sp-ruiz', at: 'chapel' }]);

    const d = C('june');
    let t = quiet(d);
    t.specials = [{ id: 'sp-usher', at: 'restrooms' }];
    t.killer.loc = 'junkyard';
    t.heroine.loc = 'booth';
    t.heroine.hand = [];
    t = act(d, t, { type: 'endAction' });
    t.terrorDeck = ['kv-silence', ...t.terrorDeck];
    t = act(d, t, { type: 'endPlanning' });
    expect(['shed', 'lotA', 'playground']).toContain(t.specials[0].at);
  });
});

describe('minions', () => {
  const tide = () => C('june', 'gullhaven-tide-cabins', 'the-tidewife');
  it('spawns stop at the token limit', () => {
    const c = tide();
    let s = quiet(c);
    s.queue = [{ op: 'spawnMinion', at: 'lair', n: 5 }];
    s = act(c, s, { type: 'discardForNerve', uid: s.heroine.hand[0].uid });
    expect(s.minions.length).toBe(c.killer.minions!.max);
  });

  it('she must choose: him or the minions; damage on minions is split, excess lost, lore does not apply', () => {
    const c = tide();
    let s = quiet(c);
    s.killer.loc = s.heroine.loc;
    s.minions = [
      { uid: 801, loc: s.heroine.loc, health: 1 },
      { uid: 802, loc: s.heroine.loc, health: 1 },
    ];
    s.foundLore = ['lore-letter'];
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-fullswing');
    s.rolling = { uid, dice: [6, 6], converted: [], card: 'ac-fullswing', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-fullswing', reaction: false };
    s = act(c, s, { type: 'resolveRoll' });
    expect(s.pending?.kind).toBe('aim');
    const hp = s.killer.health;
    s = act(c, s, { type: 'aim', at: 'minions' });
    expect(s.minions.length).toBe(0);
    expect(s.killer.health).toBe(hp);
  });

  it('minions attack survivors first, then her (reactions allowed), and act before the Tidewife', () => {
    const c = tide();
    let s = quiet(c);
    const next = neighbors(c, s.heroine.loc).find((n) => n !== s.killer.loc)!;
    s.minions = [{ uid: 900, loc: next, health: 1 }];
    s.victims[next] = 1;
    s.heroine.hand = [];
    s = act(c, s, { type: 'endAction' });
    s.terrorDeck = ['tw-weeping', ...s.terrorDeck];
    s = act(c, s, { type: 'endPlanning' });
    expect(s.slain).toBe(1);
    const i = s.log.findIndex((l) => l.text.includes('kills a survivor'));
    const j = s.log.findIndex((l, k) => k > 0 && l.text.includes(`${c.killer.name} prowls`));
    expect(s.log[i].text.startsWith(c.killer.minions!.name)).toBe(true);
    if (j >= 0) expect(i).toBeLessThan(j);
  });

  it('survivors follow her into a minion location, but not into his', () => {
    const c = tide();
    let s = quiet(c);
    const next = neighbors(c, s.heroine.loc).find((n) => n !== s.killer.loc)!;
    s.minions = [{ uid: 901, loc: next, health: 1 }];
    s.victims[s.heroine.loc] = 1;
    const uid = giveCard(s, 'ac-walk');
    s = act(c, s, { type: 'playCard', uid });
    s = act(c, s, { type: 'step', to: next });
    expect(s.victims[next]).toBe(1);
  });
});

describe('authored panic tables', () => {
  it('every built-in location has a written d6 table pointing at its neighbors', () => {
    for (const l of LOCATIONS) {
      const c = buildContent(l.id, 'the-projectionist', 'june');
      for (const n of l.nodes) {
        expect(n.panic, `${l.id}/${n.id}`).toHaveLength(6);
        expect(n.panic!.some(Boolean), `${l.id}/${n.id} never moves`).toBe(true);
        for (const t of n.panic!) if (t) expect(neighbors(c, n.id), `${l.id}/${n.id} → ${t}`).toContain(t);
      }
    }
  });
});

describe('v0.9 saves', () => {
  it('convert into a playable v1.0 game', async () => {
    const { migrateSave } = await import('../src/engine/migrate');
    const c = C('rosa');
    const old = {
      version: 1 as const,
      seed: 4242,
      difficulty: 'standard',
      round: 6,
      dawnAt: 14,
      heroine: { loc: 'lotB', health: 3, maxHealth: 5, horror: 4, items: [{ id: 'tire-iron' }], pack: [{ id: 'lore-logbook' }], escorting: 2 },
      killer: { loc: 'booth', health: 4, maxHealth: 6, bloodlust: 7, stunned: 0, finale: false },
      victims: { lotA: 1 },
      barricades: { shed: 1 },
      saved: 3,
      slain: 2,
      victimPool: 5,
      foundLore: ['lore-logbook'],
      log: [{ round: 6, text: 'Old line.' }],
    };
    const s = migrateSave(c, old)!;
    expect(s.version).toBe(2);
    expect(s.round).toBe(6);
    expect(s.terrorDeck.length).toBe(TERROR_DEAL - 5);
    expect(s.victims.lotB).toBe(2);
    expect(s.heroine.items.map((i) => i.id)).toEqual(['tire-iron']);
    expect(s.foundLore).toEqual(['lore-logbook']);
    expect(s.heroine.rescued).toBe(3);
    expect(s.killer.bloodlust).toBe(3);
    expect(simulate(c, s, dispatch).outcome).toBeDefined();
  });
});

describe('player choices: followers and damage split', () => {
  it('she can ask a named survivor to stay put', () => {
    const c = C('june', 'gullhaven-tide-cabins');
    let s = quiet(c);
    s.heroine.loc = 'office';
    s.killer.loc = 'light';
    s.specials = [{ id: 'sp-gilley', at: 'office' }];
    s.victims.office = 2;
    s = act(c, s, { type: 'toggleFollow', id: 'sp-gilley' });
    const uid = giveCard(s, 'ac-walk');
    s = act(c, s, { type: 'playCard', uid });
    s = act(c, s, { type: 'step', to: 'north' });
    expect(s.specials[0].at).toBe('office');
    expect(s.victims.north).toBe(2);
  });

  it('she divides damage between minions; unassigned damage is lost', () => {
    const c = C('june', 'holloway-drive-in', 'the-projectionist');
    let s = quiet(c);
    s.minions = [
      { uid: 701, loc: s.heroine.loc, health: 2 },
      { uid: 702, loc: s.heroine.loc, health: 2 },
    ];
    s.heroine.hand = [];
    const uid = giveCard(s, 'ac-fullswing');
    s.rolling = { uid, dice: [6, 6], converted: [], card: 'ac-fullswing', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-fullswing', reaction: false };
    s = act(c, s, { type: 'resolveRoll' }); // 3 damage vs 2 + 2 health: she must split
    expect(s.pending).toMatchObject({ kind: 'aim', killer: false });
    expect(dispatch(c, s, { type: 'aim', at: 'killer' })).toBe(s);
    expect(dispatch(c, s, { type: 'aim', at: 'minions', split: { 701: 2, 702: 2 } })).toBe(s); // 4 > 3
    s = act(c, s, { type: 'aim', at: 'minions', split: { 701: 1, 702: 1 } });
    expect(s.minions.map((m) => m.health)).toEqual([1, 1]);
  });
});

describe('light attacks', () => {
  it('Swing takes no weapon or lore bonus; Full Swing takes both', () => {
    const c = C();
    const hit = (card: string) => {
      let s = quiet(c);
      s.killer.loc = s.heroine.loc;
      s.heroine.items = [{ uid: 990, id: 'tire-iron' }];
      s.foundLore = ['lore-logbook'];
      const uid = giveCard(s, card);
      s.rolling = { uid, dice: [6, 6], converted: [], card, reaction: false, range: 0 };
      s.pending = { kind: 'roll', card, reaction: false };
      const hp = s.killer.health;
      s = act(c, s, { type: 'resolveRoll' });
      return hp - s.killer.health;
    };
    expect(hit('ac-swing')).toBe(2); // 2 flat
    expect(hit('ac-fullswing')).toBe(5); // 3 + tire iron 1 + lore 1
  });

  it('a heavy hit reports where each point came from', () => {
    const c = C();
    let s = quiet(c);
    s.killer.loc = s.heroine.loc;
    s.heroine.items = [{ uid: 990, id: 'tire-iron' }];
    s.foundLore = ['lore-logbook'];
    s.mods.damage = 2;
    const uid = giveCard(s, 'ac-fullswing');
    s.rolling = { uid, dice: [6, 6], converted: [], card: 'ac-fullswing', reaction: false, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-fullswing', reaction: false };
    s = act(c, s, { type: 'resolveRoll' });
    expect(s.log.some((l) => l.text === 'Damage 7 = Full Swing 3 + Tire Iron 1 + lore item 1 + Psych Up 2.')).toBe(true);
    expect(s.mods.damage).toBe(0);
  });
});

describe('tutorial and coach', () => {
  it('the tutorial plays out as staged: search, rescue, a dodged attack, then a big hit', () => {
    const c = C(TUTORIAL.heroine, TUTORIAL.location, TUTORIAL.killer);
    let s = tutorialGame(c);
    const uid = (id: string) => s.heroine.hand.find((x) => x.id === id)!.uid;
    expect(currentGoal(c, s)).toMatchObject({ kind: 'rescue', node: 'lotA' });
    s = act(c, s, { type: 'playCard', uid: uid('ac-look') });
    s = act(c, s, { type: 'resolveRoll' });
    expect(s.pending?.kind).toBe('search');
    const drawn = (s.pending as { drawn: string[] }).drawn;
    s = act(c, s, { type: 'keep', picks: [drawn.indexOf('tire-iron')] });
    s = act(c, s, { type: 'playCard', uid: uid('ac-walk') });
    s = act(c, s, { type: 'step', to: 'lotA' });
    expect(currentGoal(c, s)).toMatchObject({ kind: 'escort', node: 'gate' });
    s = act(c, s, { type: 'step', to: 'gate' });
    expect(s.saved).toBe(1);
    s = act(c, s, { type: 'endAction' });
    s = act(c, s, { type: 'buy', id: 'ac-fullswing' });
    s = act(c, s, { type: 'endPlanning' });
    expect(s.pending?.kind).toBe('reaction'); // he steps out of the shed and swings
    s = act(c, s, { type: 'react', uid: uid('ac-duck') });
    if (s.pending?.kind === 'roll') s = act(c, s, { type: 'resolveRoll' });
    expect(s.heroine.health).toBe(s.heroine.maxHealth); // Duck blocks it
    s = act(c, s, { type: 'endUpkeep' });
    expect(s.round).toBe(2);
    expect(s.killer.loc).toBe(s.heroine.loc);
    expect(currentGoal(c, s).kind).toBe('fight');
    s = act(c, s, { type: 'playCard', uid: uid('ac-fullswing') });
    s = act(c, s, { type: 'resolveRoll' });
    expect(s.killer.maxHealth - s.killer.health).toBe(4); // Full Swing 3 + Tire Iron 1
  });

  it('the coach always has a goal and a reason, on every map', () => {
    for (const l of LOCATIONS)
      for (const k of KILLERS) {
        const c = C('june', l.id, k.id);
        let s = newGame(c, 11);
        for (let i = 0; i < 600 && !s.outcome; i++) {
          if (s.phase === 'action' || s.phase === 'planning') {
            expect(currentGoal(c, s).title.length).toBeGreaterThan(0);
            expect(advise(c, s).why.length).toBeGreaterThan(0);
          }
          s = dispatch(c, s, botAction(c, s));
        }
      }
  });

  it('no buy-up is offered when the current row already blocks the whole hit', () => {
    const c = C('rosa');
    const s = newGame(c, 3);
    const duck = s.heroine.hand.find((x) => x.id === 'ac-duck')!;
    s.rolling = { uid: duck.uid, dice: [5, 3, 1], converted: [], card: 'ac-duck', reaction: true, range: 0 };
    s.pending = { kind: 'roll', card: 'ac-duck', reaction: true };
    s.attack = { damage: 1 };
    expect(buyUpMatters(c, s)).toBe(false); // block 1 covers 1 damage
    s.attack = { damage: 2 };
    expect(buyUpMatters(c, s)).toBe(true); // block 2 would save a point
  });
});

describe('lessons', async () => {
  const { LESSONS, STEPS, teachContent } = await import('../src/ui/tutorial');
  const words = (html: string) => html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  it('every lesson trigger and text works on real game states, in 22 words or fewer', () => {
    const seen = new Set<string>();
    for (const l of LOCATIONS.slice(0, 3))
      for (const k of KILLERS.slice(0, 3)) {
        const c = buildContent(l.id, k.id, HEROINES[0].id);
        teachContent(c);
        let s = newGame(c, 5 + l.id.length, 'standard');
        for (let i = 0; i < 600 && !s.outcome; i++) {
          for (const x of LESSONS) {
            if (!x.trigger!(s)) continue;
            seen.add(x.id!);
            const text = typeof x.text === 'function' ? x.text(s) : x.text;
            expect(words(text), `${x.id}: ${text}`).toBeLessThanOrEqual(22);
            if (typeof x.target === 'function') x.target(s);
          }
          s = dispatch(c, s, botAction(c, s));
        }
      }
    // The everyday moments all come up in ordinary play.
    for (const id of ['roll', 'search', 'react', 'histurn', 'shop', 'goal', 'escort', 'rescued', 'clock']) expect(seen, id).toContain(id);
  });
  it('the core tutorial is short and covers what it promises', () => {
    expect(STEPS.length).toBeLessThanOrEqual(7);
    const taught = STEPS.flatMap((x) => x.teaches ?? []);
    for (const id of taught) expect(LESSONS.map((x) => x.id)).toContain(id);
  });
});
