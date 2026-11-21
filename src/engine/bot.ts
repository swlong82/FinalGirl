// A rule-aware heuristic player. Used for balance simulation and fuzzing, and
// as the in-game "hint" provider. It reads cards and items by their tags and
// effect ops, so it works with any content pack without special cases.
import {
  abilityUnlocked,
  actionDef,
  bestWeapon,
  canReach,
  cardCost,
  check,
  distances,
  exits,
  HAND_LIMIT,
  HAND_SLOTS,
  handsUsed,
  isFlooded,
  isSearch,
  itemDef,
  killerAttack,
  neighbors,
  reqCheck,
  totalHealth,
} from './rules';
import type { Action, ActionCardDef, Card, CardTag, Content, Effect, GameState, HeldItem, NodeId } from './types';

const hasOp = (effs: Effect[], op: Effect['op']): boolean =>
  effs.some((e) => e.op === op || (e.op === 'if' && (hasOp(e.then, op) || hasOp(e.else ?? [], op))));
const heals = (effs: Effect[]) => effs.some((e) => e.op === 'heal');
const calms = (effs: Effect[]) => effs.some((e) => e.op === 'horror' && e.n < 0);

/** Distances to `target` that treat the killer's location (and its neighbors) as costly. */
function safeDist(c: Content, s: GameState, target: NodeId, brave = false): Record<NodeId, number> {
  const base = distances(c, target);
  const out: Record<NodeId, number> = {};
  const kn = new Set(neighbors(c, s.killer.loc));
  for (const [n, d] of Object.entries(base))
    out[n] = d + (brave ? 0 : n === s.killer.loc ? 3 : kn.has(n) && s.killer.stunned === 0 ? 0.5 : 0) + (isFlooded(c, s, n) ? 0.6 : 0);
  return out;
}

function nearest(c: Content, from: NodeId, pred: (n: NodeId) => boolean): NodeId | undefined {
  const d = distances(c, from);
  return c.location.nodes
    .map((n) => n.id)
    .filter(pred)
    .sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99) || a.localeCompare(b))[0];
}

const defOf = (c: Content, x: Card) => actionDef(c, x.id);
const tagged = (c: Content, s: GameState, tag: CardTag) => s.heroine.hand.filter((x) => defOf(c, x).tags.includes(tag) && defOf(c, x).kind === 'action');

function armed(c: Content, s: GameState) {
  return !!bestWeapon(c, s, 0) || s.foundLore.length > 0 || s.heroine.resolve > 0;
}

/** Where she wants to be right now. */
export function botGoal(c: Content, s: GameState): { node: NodeId; brave: boolean } {
  const h = s.heroine;
  const k = s.killer;
  const withHer = s.victims[h.loc] ?? 0;
  const ex = exits(c);
  if (withHer > 0 && !ex.includes(h.loc)) {
    const d = safeDist(c, s, h.loc);
    const exit = [...ex].sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99))[0];
    return { node: exit, brave: false };
  }
  const healthy = totalHealth(s) >= 3;
  const hunting = (k.finale || (armed(c, s) && healthy)) && tagged(c, s, 'attack').length > 0;
  const victim = nearest(c, h.loc, (n) => (s.victims[n] ?? 0) > 0 && n !== k.loc && !ex.includes(n));
  if (victim && !(k.finale && hunting)) return { node: victim, brave: false };
  if (hunting) return { node: k.loc, brave: true };
  const pile = nearest(c, h.loc, (n) => isSearch(c, n) && (s.piles[n]?.cards.length ?? 0) > 0 && n !== k.loc);
  if (pile) return { node: pile, brave: false };
  return { node: h.loc, brave: false };
}

function stepFor(c: Content, s: GameState): Action {
  const h = s.heroine;
  const g = botGoal(c, s);
  if (g.node === h.loc) return { type: 'stopMove' };
  const d = safeDist(c, s, g.node, g.brave);
  const raw = distances(c, g.node);
  const opts = neighbors(c, h.loc)
    .filter((n) => (raw[n] ?? 99) < (raw[h.loc] ?? 99))
    .sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99) || a.localeCompare(b));
  // Don't walk survivors (or a weak heroine) into him.
  const next = opts.find((n) => g.brave || n !== s.killer.loc || opts.length === 1);
  if (!next || (next === s.killer.loc && !g.brave && totalHealth(s) <= 2)) return { type: 'stopMove' };
  return { type: 'step', to: next };
}

function cardValue(c: Content, s: GameState, x: Card): number {
  const d = defOf(c, x);
  const dupes = s.heroine.hand.filter((y) => y.id === x.id).length;
  let v = d.cost * 2 + (d.kind === 'reaction' ? 3 : 0) + (d.tags.includes('attack') ? 3 : 0) + (d.tags.includes('move') ? 2 : 0);
  if (dupes > 1) v -= 2;
  return v;
}

function cheapest(c: Content, s: GameState, n: number, exclude: number[] = []): number[] {
  return s.heroine.hand
    .filter((x) => !exclude.includes(x.uid))
    .sort((a, b) => cardValue(c, s, a) - cardValue(c, s, b))
    .slice(0, n)
    .map((x) => x.uid);
}

function itemScore(c: Content, s: GameState, id: string): number {
  const d = itemDef(c, id);
  const hurt = s.heroine.maxHealth - s.heroine.health;
  if (d.kind === 'lore') return 9;
  if (d.damage) return 4 + d.damage * 2 + ((d.range ?? [0]).length > 1 ? 1 : 0);
  if (d.use && hasOp(d.use.effects, 'killerDamage')) return 7;
  if (d.use && heals(d.use.effects)) return 4 + hurt;
  if (d.use && hasOp(d.use.effects, 'killerStun')) return 5;
  if (d.use && hasOp(d.use.effects, 'teleportHeroine')) return 5;
  if (d.searchDice) return 3;
  return 2;
}

/** Keep the best hand items in hand. */
function rearrange(c: Content, s: GameState): Action | null {
  const h = s.heroine;
  const best = h.pack
    .filter((p) => itemDef(c, p.id).hands > 0)
    .sort((a, b) => itemScore(c, s, b.id) - itemScore(c, s, a.id))[0];
  if (!best) return null;
  const need = itemDef(c, best.id).hands;
  if (handsUsed(c, h.items) + need <= HAND_SLOTS) return { type: 'ready', uid: best.uid };
  const worst = [...h.items].sort((a, b) => itemScore(c, s, a.id) - itemScore(c, s, b.id));
  const out: HeldItem[] = [];
  let freed = HAND_SLOTS - handsUsed(c, h.items);
  for (const w of worst) {
    if (freed >= need) break;
    out.push(w);
    freed += itemDef(c, w.id).hands;
  }
  const outScore = out.reduce((n, w) => n + itemScore(c, s, w.id), 0);
  if (itemScore(c, s, best.id) <= outScore) return null;
  return { type: 'ready', uid: best.uid, swapOut: out.map((w) => w.uid) };
}

function buy(c: Content, s: GameState): Action {
  const h = s.heroine;
  if (h.hand.length >= HAND_LIMIT) return { type: 'endPlanning' };
  const count = (tag: CardTag) => h.hand.filter((x) => defOf(c, x).tags.includes(tag)).length;
  const reactions = h.hand.filter((x) => defOf(c, x).kind === 'reaction').length;
  const hurt = h.health < h.maxHealth || h.token === null;
  const npcs = Object.values(s.victims).some((n) => n > 0);
  const piles = Object.values(s.piles).some((p) => p.cards.length > 0);
  const want = (d: ActionCardDef): number => {
    let v = 0;
    if (d.tags.includes('move')) v += 6 - count('move') * 2 + (d.always ? 1 : 0);
    if (d.tags.includes('search')) v += piles ? 5 - count('search') * 3 : -5;
    if (d.tags.includes('attack') && d.kind === 'action') v += (s.killer.finale || armed(c, s) ? 7 : 4) - count('attack') * 2 + d.cost;
    if (d.kind === 'reaction') v += 5 - reactions * 2;
    if (d.tags.includes('heal')) v += hurt ? 5 - count('heal') * 3 : -3;
    if (d.tags.includes('calm')) v += h.horror >= 3 ? 4 - count('calm') * 2 : -2;
    if (d.tags.includes('rally')) v += npcs ? 2 - count('rally') * 3 : -3;
    if (d.tags.includes('focus')) v += 1 - count('focus') * 2;
    if (d.tags.includes('hide')) v += 1 - count('hide') * 2;
    if (d.tags.includes('barricade')) v -= 1;
    if (d.tags.includes('lure') || d.tags.includes('nerve')) v -= 1;
    if (d.cost === 0) v += 1; // free cards are also fuel for dice conversions
    return v;
  };
  const opts = c.actions
    .filter((d) => check(c, s, { type: 'buy', id: d.id }).ok)
    .map((d) => ({ d, v: want(d) }))
    .filter((x) => x.v > 0 || (x.d.cost === 0 && h.hand.length < 7))
    .sort((a, b) => b.v - a.v || b.d.cost - a.d.cost);
  return opts[0] ? { type: 'buy', id: opts[0].d.id } : { type: 'endPlanning' };
}

export function botAction(c: Content, s: GameState): Action {
  const h = s.heroine;
  const k = s.killer;
  const p = s.pending;
  const ok = (a: Action) => check(c, s, a).ok;

  if (s.phase === 'planning') return buy(c, s);
  if (p?.kind === 'reaction') {
    const lethal = (s.attack?.damage ?? 0) >= totalHealth(s);
    const r = h.hand
      .filter((x) => defOf(c, x).kind === 'reaction' && ok({ type: 'react', uid: x.uid }))
      .sort((a, b) => cardValue(c, s, b) - cardValue(c, s, a));
    const pickR = r.find((x) => lethal || cardCost(c, defOf(c, x)) <= 2 || (s.attack?.damage ?? 0) >= 2);
    return pickR ? { type: 'react', uid: pickR.uid } : { type: 'takeHit' };
  }
  if (p?.kind === 'roll' && s.rolling) {
    const r = s.rolling;
    const succ = r.dice.filter((d) => d >= 5).length + r.converted.length;
    const partial = r.dice.findIndex((d, i) => d >= 3 && d <= 4 && !r.converted.includes(i));
    const d = actionDef(c, r.card);
    const important = r.reaction || d.tags.includes('attack') || d.tags.includes('search') || (d.tags.includes('move') && (s.victims[h.loc] ?? 0) > 0);
    if (partial >= 0 && succ < 2 && important && h.hand.length >= 4) {
      const [x, y] = cheapest(c, s, 2);
      const a: Action = { type: 'convert', die: partial, discard: [x, y] };
      if (ok(a)) return a;
    }
    return { type: 'resolveRoll' };
  }
  if (p?.kind === 'search') {
    const order = p.drawn.map((id, i) => ({ i, v: itemScore(c, s, id) })).sort((a, b) => b.v - a.v);
    return { type: 'keep', picks: order.slice(0, p.keep).map((x) => x.i) };
  }
  if (p?.kind === 'move') {
    const want = Math.min(2, (c.heroine.traits.escortCap ?? 2));
    if (h.bring !== want) return { type: 'setBring', n: want };
    return stepFor(c, s);
  }
  if (s.phase === 'upkeep') return rearrange(c, s) ?? { type: 'endUpkeep' };
  if (s.phase !== 'action') return { type: 'endAction' };
  if (s.rearrange) {
    const r = rearrange(c, s);
    if (r && ok(r)) return r;
  }

  const killerHere = k.loc === h.loc;
  const killerNear = killerHere || neighbors(c, h.loc).includes(k.loc);
  const hurt = h.maxHealth - h.health;
  const withHer = s.victims[h.loc] ?? 0;
  const nerve = h.nerve;
  /** Best playable card with a tag, cheapest first unless strongest is asked. */
  const playable = (tag: CardTag, strongest = false, afford = true): Action | null => {
    const opts = h.hand
      .map((x) => ({ x, d: defOf(c, x) }))
      .filter(({ x, d }) => d.kind === 'action' && d.tags.includes(tag) && ok({ type: 'playCard', uid: x.uid }) && (!afford || nerve - cardCost(c, d) >= 0))
      .sort((a, b) => (strongest ? b.d.cost - a.d.cost : a.d.cost - b.d.cost) || Number(!!b.d.always) - Number(!!a.d.always));
    return opts[0] ? { type: 'playCard', uid: opts[0].x.uid } : null;
  };

  // ── Items ──
  for (const it of [...h.items, ...h.pack]) {
    const d = itemDef(c, it.id);
    if (!d.use) continue;
    const a: Action = { type: 'useItem', uid: it.uid };
    if (!ok(a)) continue;
    const e = d.use.effects;
    if (hasOp(e, 'killerDamage') || (hasOp(e, 'killerStun') && killerHere)) return a;
    if (hasOp(e, 'teleportHeroine') && withHer > 0) return a;
    if (heals(e) && (hurt >= 2 || totalHealth(s) <= 2)) return a;
    if (calms(e) && h.horror >= 4) return a;
    if (hasOp(e, 'warm') && s.env.cold >= 2) return a;
    if (hasOp(e, 'barricade') && killerNear && !killerHere) return a;
    if (hasOp(e, 'killerMove') && killerNear && !e.some((x) => x.op === 'killerMove' && x.toward === 'heroine')) return a;
    if (e.some((x) => x.op === 'nerve' && x.n > 0) && nerve <= 0) return a;
  }

  // ── Ability ──
  if (abilityUnlocked(c, s) && ok({ type: 'useAbility' })) {
    const e = c.heroine.ability.effects;
    const useful =
      hasOp(e, 'killerDamage') ||
      (hasOp(e, 'killerMove') && killerNear) ||
      (hasOp(e, 'barricade') && killerNear && !killerHere) ||
      (hasOp(e, 'rally') && neighbors(c, h.loc).some((n) => (s.victims[n] ?? 0) > 0)) ||
      (calms(e) && h.horror >= 2) ||
      (hasOp(e, 'nerve') && !hasOp(e, 'killerMove')) ||
      hasOp(e, 'move');
    if (useful) return { type: 'useAbility' };
  }

  if (ok({ type: 'answer' })) return { type: 'answer' };

  // ── He's here, or in range ──
  if (canReach(c, s) && k.stunned === 0 || killerHere) {
    const theirHit = killerAttack(c, s);
    const brave = k.finale || armed(c, s) || totalHealth(s) > theirHit + 1 || k.health <= 2;
    const atk = playable('attack', true, false);
    if (atk && brave && (nerve >= 0)) return atk;
    if (killerHere && (withHer > 0 || !brave)) {
      const mv = playable('move', false, false);
      if (mv) return mv;
    }
    if (atk) return atk;
  }

  // ── Survivors ──
  if (withHer > 0 && !exits(c).includes(h.loc)) {
    const mv = playable('move', true, false);
    if (mv) return mv;
  }
  const adjNpcs = neighbors(c, h.loc).some((n) => (s.victims[n] ?? 0) > 0 && n !== k.loc);
  if (adjNpcs && !killerHere) {
    const r = playable('rally');
    if (r) return r;
  }

  // ── Search ──
  if (isSearch(c, h.loc) && !killerHere && reqCheck(c, s, { req: 'searchSpace' } as ActionCardDef).ok) {
    const sc = playable('search', true);
    if (sc) return sc;
  }

  // ── Recover ──
  if (!killerNear && hurt > 0) {
    const r = playable('heal');
    if (r) return r;
  }
  if (h.horror >= 3) {
    const r = playable('calm');
    if (r) return r;
  }
  if (killerNear && !killerHere && !h.hidden && totalHealth(s) <= 3) {
    const r = playable('hide') ?? playable('barricade');
    if (r) return r;
  }

  // ── Go somewhere ──
  const g = botGoal(c, s);
  if (g.node !== h.loc) {
    const mv = playable('move', distances(c, h.loc)[g.node] > 1);
    if (mv) return mv;
  }
  if (k.finale && !killerHere) {
    const r = playable('focus');
    if (r && tagged(c, s, 'attack').length) return r;
  }
  return { type: 'endAction' };
}

/** Something always legal, so a simulation can never stall. */
function fallback(s: GameState): Action[] {
  const p = s.pending;
  if (p?.kind === 'move') return [{ type: 'stopMove' }];
  if (p?.kind === 'roll') return [{ type: 'resolveRoll' }];
  if (p?.kind === 'search') return [{ type: 'keep', picks: [] }];
  if (p?.kind === 'reaction') return [{ type: 'takeHit' }];
  if (s.phase === 'planning') return [{ type: 'endPlanning' }];
  if (s.phase === 'upkeep') return [{ type: 'endUpkeep' }];
  return [{ type: 'endAction' }];
}

/** Play one full game with the bot. */
export function simulate(c: Content, s: GameState, dispatch: (c: Content, s: GameState, a: Action) => GameState, maxSteps = 6000): GameState {
  for (let i = 0; i < maxSteps && !s.outcome; i++) {
    const a = botAction(c, s);
    let next = dispatch(c, s, a);
    if (next === s) for (const f of fallback(s)) if ((next = dispatch(c, s, f)) !== s) break;
    if (next === s) throw new Error(`Stalled: phase ${s.phase}, pending ${s.pending?.kind}, action ${a.type}`);
    s = next;
  }
  return s;
}
