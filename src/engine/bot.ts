// A rule-aware heuristic player. Used for balance simulation and fuzzing, and
// as the in-game "hint" provider. It reads cards and items by their tags and
// effect ops, so it works with any content pack without special cases.
import {
  abilityUnlocked,
  actionDef,
  bestWeapon,
  buyUpMatters,
  canReach,
  cardCost,
  check,
  distances,
  exitOpen,
  exits,
  HAND_LIMIT,
  handSlots,
  handsUsed,
  hasTag,
  haven,
  isFlooded,
  isSearch,
  itemDef,
  killerAttack,
  killerSeen,
  minionsAt,
  neighbors,
  npcAt,
  npcNodes,
  reqCheck,
  totalHealth,
  walkDistances,
  walkNeighbors,
} from './rules';
import type { Action, ActionCardDef, Card, CardTag, Content, Effect, GameState, HeldItem, NodeId } from './types';

const hasOp = (effs: Effect[], op: Effect['op']): boolean =>
  effs.some((e) => e.op === op || (e.op === 'if' && (hasOp(e.then, op) || hasOp(e.else ?? [], op))));
const heals = (effs: Effect[]) => effs.some((e) => e.op === 'heal');
const calms = (effs: Effect[]) => effs.some((e) => e.op === 'horror' && e.n < 0);

/** What stepping into a location costs her on top of the step: danger, floods, traps, his next scene. */
function danger(c: Content, s: GameState, brave: boolean): (n: NodeId) => number {
  const kn = new Set(neighbors(c, s.killer.loc));
  const mins = new Set(s.minions.map((m) => m.loc));
  const traps = c.heroine.traits.trapSense ? new Set<NodeId>() : new Set(s.traps ?? []);
  return (n) =>
    (brave ? 0 : n === s.killer.loc ? 3 : kn.has(n) && s.killer.stunned === 0 && !haven(c, s, n) ? 0.5 : 0) +
    (mins.has(n) ? 1.5 : 0) +
    (isFlooded(c, s, n) ? 0.6 : 0) +
    (traps.has(n) ? 2 : 0) +
    (!brave && s.killer.posed === n ? 2 : 0);
}

/**
 * Route cost from every location to `target` on foot (around closed shutters): each step costs 1
 * plus the danger of the location stepped into. A weighted search, so she detours around him.
 */
function costTo(c: Content, s: GameState, target: NodeId, brave = false): Record<NodeId, number> {
  const pen = danger(c, s, brave);
  const d: Record<NodeId, number> = { [target]: 0 };
  const open = new Set<NodeId>([target]);
  const done = new Set<NodeId>();
  while (open.size) {
    let u = '';
    for (const n of open) if (!u || d[n] < d[u] || (d[n] === d[u] && n < u)) u = n;
    open.delete(u);
    done.add(u);
    for (const v of walkNeighbors(c, s, u)) {
      if (done.has(v)) continue;
      const nd = d[u] + 1 + pen(u);
      if (d[v] === undefined || nd < d[v]) {
        d[v] = nd;
        open.add(v);
      }
    }
  }
  return d;
}

/** Exits she could lead survivors to: open now, or the bus shelter when the bus comes next turn. */
function usableExits(c: Content, s: GameState): NodeId[] {
  const r = c.location.rule;
  const busNext = r.kind === 'bus' && (s.round + 1) % (r.period ?? 3) === 0;
  return exits(c).filter((e) => exitOpen(c, s, e) || (busNext && hasTag(c, e, 'bus')));
}

function nearest(c: Content, s: GameState, from: NodeId, pred: (n: NodeId) => boolean): NodeId | undefined {
  const d = walkDistances(c, s, from);
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

/**
 * Play style for the balance sim. 'balanced' saves people and fights once armed;
 * 'rush' ignores survivors and goes straight for him (the all-in combat line a
 * human can take), so we can check that rushing isn't the dominant strategy.
 */
export type BotStyle = 'balanced' | 'rush';
let style: BotStyle = 'balanced';
export function setBotStyle(x: BotStyle) {
  style = x;
}

/** He's low enough that one or two good hits end it, and she can deliver them. */
export function finishing(c: Content, s: GameState): boolean {
  return s.killer.health <= 3 && tagged(c, s, 'attack').length > 0 && totalHealth(s) >= 2;
}

/** Where she believes he is (the corn can hide him): the coach and the hunt use this. */
function seenAt(c: Content, s: GameState): NodeId {
  return killerSeen(c, s) ? s.killer.loc : s.env.seen ?? s.killer.loc;
}

/** Where she wants to be right now. */
export function botGoal(c: Content, s: GameState): { node: NodeId; brave: boolean } {
  const h = s.heroine;
  const k = s.killer;
  const kAt = seenAt(c, s);
  const withHer = npcAt(s, h.loc);
  const ex = usableExits(c, s);
  if (style === 'rush' && tagged(c, s, 'attack').length > 0 && totalHealth(s) >= 2 && (armed(c, s) || s.round >= 3 || k.finale)) return { node: kAt, brave: true };
  if (withHer > 0 && !ex.includes(h.loc)) {
    const exit = [...ex].sort((a, b) => (costTo(c, s, a)[h.loc] ?? 99) - (costTo(c, s, b)[h.loc] ?? 99) || a.localeCompare(b))[0];
    if (exit) return { node: exit, brave: false };
  }
  const healthy = totalHealth(s) >= 3;
  const hunting = (k.finale || (armed(c, s) && healthy)) && tagged(c, s, 'attack').length > 0;
  // He's nearly done: finish him before anything else.
  if (finishing(c, s)) return { node: kAt, brave: true };
  // Room 13: captives die soon. Go and cut them loose (if he isn't standing guard).
  const lair = c.location.lair;
  if ((s.captives?.length ?? 0) > 0 && h.loc !== lair && (k.loc !== lair || hunting)) return { node: lair, brave: k.loc === lair };
  const victim = nearest(c, s, h.loc, (n) => npcAt(s, n) > 0 && n !== k.loc && !exits(c).includes(n));
  if (victim && !(k.finale && hunting)) return { node: victim, brave: false };
  if (hunting) return { node: kAt, brave: true };
  const pile = nearest(c, s, h.loc, (n) => isSearch(c, n) && (s.piles[n]?.cards.length ?? 0) > 0 && n !== k.loc);
  if (pile) return { node: pile, brave: false };
  return { node: h.loc, brave: false };
}

function stepFor(c: Content, s: GameState): Action {
  const h = s.heroine;
  const g = botGoal(c, s);
  if (g.node === h.loc) return { type: 'stopMove' };
  const d = costTo(c, s, g.node, g.brave);
  const pen = danger(c, s, g.brave);
  const opts = walkNeighbors(c, s, h.loc)
    .filter((n) => d[n] !== undefined)
    .sort((a, b) => 1 + pen(a) + d[a] - (1 + pen(b) + d[b]) || a.localeCompare(b));
  const next = opts[0];
  // Don't walk survivors (or a weak heroine) into him.
  if (!next || (next === s.killer.loc && !g.brave && (totalHealth(s) <= 2 || npcAt(s, h.loc) > 0))) return { type: 'stopMove' };
  return { type: 'step', to: next };
}

function cardValue(c: Content, s: GameState, x: Card): number {
  const d = defOf(c, x);
  const dupes = s.heroine.hand.filter((y) => y.id === x.id).length;
  let v = d.cost * 2 + (d.kind === 'reaction' ? 3 : 0) + (d.tags.includes('attack') ? 3 : 0) + (d.tags.includes('move') ? 2 : 0);
  if (dupes > 1) v -= 2;
  return v;
}

/** The n least useful cards in her hand (bot heuristics; the UI pre-picks these for a buy-up). */
export function cheapest(c: Content, s: GameState, n: number, exclude: number[] = []): number[] {
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
  if (handsUsed(c, h.items) + need <= handSlots(c)) return { type: 'ready', uid: best.uid };
  const worst = [...h.items].sort((a, b) => itemScore(c, s, a.id) - itemScore(c, s, b.id));
  const out: HeldItem[] = [];
  let freed = handSlots(c) - handsUsed(c, h.items);
  for (const w of worst) {
    if (freed >= need) break;
    out.push(w);
    freed += itemDef(c, w.id).hands;
  }
  const outScore = out.reduce((n, w) => n + itemScore(c, s, w.id), 0);
  if (itemScore(c, s, best.id) <= outScore) return null;
  return { type: 'ready', uid: best.uid, swapOut: out.map((w) => w.uid) };
}

export type BuyNeed = CardTag | 'react';

/** What her hand is short of for next turn (shared by the bot's buys and the shop's goal line). */
export function buyDeficits(c: Content, s: GameState): { deficit: Partial<Record<BuyNeed, number>>; priority: Partial<Record<BuyNeed, number>> } {
  const h = s.heroine;
  const count = (pred: (d: ActionCardDef) => boolean) => h.hand.filter((x) => pred(defOf(c, x))).length;
  // Shove's break-away only works next to him, so it doesn't count as getting around.
  const has = (tag: CardTag) => count((d) => d.tags.includes(tag) && d.kind === 'action' && !(tag === 'move' && d.req === 'reach'));
  const gear = armed(c, s);
  const fight = s.killer.finale || gear;
  const piles = Object.values(s.piles).some((p) => p.cards.length > 0);
  const deficit: Partial<Record<CardTag | 'react', number>> = {
    attack: (fight || style === 'rush' ? 3 : 2) - has('attack'),
    move: 2 - has('move'),
    react: (s.killer.finale ? 2 : 1) - count((d) => d.kind === 'reaction'),
    search: piles && !s.killer.finale ? 1 - has('search') : 0,
    heal: h.health < h.maxHealth ? 1 - has('heal') : 0,
    calm: h.horror >= 3 ? 1 - has('calm') : 0,
    rally: npcNodes(s).length ? 1 - has('rally') : 0,
  };
  const priority: Partial<Record<CardTag | 'react', number>> = { attack: fight || style === 'rush' ? 9 : 6, move: 6, react: 5, search: 4, heal: 4, calm: 3, rally: 2 };
  return { deficit, priority };
}

function buy(c: Content, s: GameState): Action {
  const h = s.heroine;
  if (h.hand.length >= HAND_LIMIT) return { type: 'endPlanning' };
  // Buys are scarce: fill what the hand is missing, strongest affordable card first.
  const { deficit, priority } = buyDeficits(c, s);
  const gear = armed(c, s);
  const value = (d: ActionCardDef): number => {
    let v = 0;
    const tags: (CardTag | 'react')[] = d.kind === 'reaction' ? ['react'] : d.tags;
    for (const t of tags) if ((deficit[t] ?? 0) > 0) v += priority[t] ?? 0;
    if (v === 0) return 0;
    v += d.cost * 1.2; // the strongest card that fills the gap
    if (d.light && gear) v -= 4; // a weapon does nothing for a light attack
    return v;
  };
  const opts = c.actions
    .filter((d) => check(c, s, { type: 'buy', id: d.id }).ok)
    .map((d) => ({ d, v: value(d) }))
    .filter((x) => x.v > 1)
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
    const important = r.reaction || d.tags.includes('attack') || d.tags.includes('search') || (d.tags.includes('move') && (npcAt(s, h.loc)) > 0);
    if (partial >= 0 && succ < 2 && important && h.hand.length >= 4 && buyUpMatters(c, s)) {
      const [x, y] = cheapest(c, s, 2);
      const a: Action = { type: 'convert', die: partial, discard: [x, y] };
      if (ok(a)) return a;
    }
    return { type: 'resolveRoll' };
  }
  if (p?.kind === 'aim') {
    // Go for him when he's close to finished or it's the Finale; otherwise clear the minions off her.
    const finishing = k.health + (k.token !== null ? 2 : 0) <= p.base + 3;
    return { type: 'aim', at: p.killer && (k.finale || finishing) ? 'killer' : 'minions' };
  }
  if (p?.kind === 'search') {
    const order = p.drawn.map((id, i) => ({ i, v: itemScore(c, s, id) })).sort((a, b) => b.v - a.v);
    return { type: 'keep', picks: order.slice(0, p.keep).map((x) => x.i) };
  }
  if (p?.kind === 'move') {
    // A break-away move (Shove) mid-fight: stay and keep swinging if she means to fight.
    if (k.loc === h.loc && npcAt(s, h.loc) === 0 && (k.finale || armed(c, s) || k.health <= 2) && totalHealth(s) > killerAttack(c, s) + 1) {
      const more = h.hand.some((x) => defOf(c, x).tags.includes('attack') && defOf(c, x).kind === 'action' && h.nerve - cardCost(c, defOf(c, x)) >= 0);
      if (more) return { type: 'stopMove' };
    }
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
  const withHer = npcAt(s, h.loc);
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
    if (hasOp(e, 'fuel') && (s.env.fuel ?? 0) <= 1 && !k.finale) return a;
    if (hasOp(e, 'gates') && gatesHelp(c, s)) return a;
    if (hasOp(e, 'bus') && !s.env.bus && withHer > 0 && exits(c).some((x) => hasTag(c, x, 'bus') && (distances(c, h.loc)[x] ?? 9) <= 1)) return a;
    if (hasOp(e, 'reveal') && !killerSeen(c, s) && !hasOp(e, 'killerMove')) return a;
    if (hasOp(e, 'barricade') && killerNear && !killerHere) return a;
    if (hasOp(e, 'killerMove') && killerNear && !e.some((x) => x.op === 'killerMove' && x.toward === 'heroine')) return a;
    if (e.some((x) => x.op === 'nerve' && x.n > 0) && nerve <= 0) return a;
  }

  // ── Ability ──
  if (abilityUnlocked(c, s) && ok({ type: 'useAbility' })) {
    const e = c.heroine.ability.effects;
    const useful =
      hasOp(e, 'killerDamage') ||
      (hasOp(e, 'killerMove') && killerNear && !botGoal(c, s).brave) || // don't push him off when she wants the fight
      (hasOp(e, 'barricade') && killerNear && !killerHere && !botGoal(c, s).brave) ||
      (hasOp(e, 'hide') && killerNear && !botGoal(c, s).brave && !h.hidden) ||
      (hasOp(e, 'rally') && neighbors(c, h.loc).some((n) => npcAt(s, n) > 0)) ||
      (calms(e) && h.horror >= 2) ||
      (hasOp(e, 'nerve') && !hasOp(e, 'killerMove')) ||
      hasOp(e, 'move');
    if (useful) return { type: 'useAbility' };
  }

  if (ok({ type: 'answer' })) return { type: 'answer' };
  // The location's own action: stoke a dying fire, flip the shutters when it shortens the way, look out over the corn.
  if (ok({ type: 'ruleAct' })) {
    const kind = c.location.rule.kind;
    if (kind === 'campfire' && (s.env.fuel ?? 0) <= 1 && nerve >= 2) return { type: 'ruleAct' };
    if (kind === 'shutters' && gatesHelp(c, s) && nerve >= 2) return { type: 'ruleAct' };
    if (kind === 'corn') return { type: 'ruleAct' };
  }

  // ── He's here, or in range ──
  // ── Minions in her location and no killer: clear them ──
  if (!killerHere && minionsAt(s, h.loc).length) {
    const atk = playable('attack', true);
    if (atk) return atk;
  }
  if (canReach(c, s) && k.stunned === 0 || killerHere) {
    const theirHit = killerAttack(c, s);
    const brave = style === 'rush' || k.finale || armed(c, s) || totalHealth(s) > theirHit + 1 || k.health <= 2;
    const atk = playable('attack', true, false);
    if (atk && brave && (nerve >= 0)) return atk;
    if (killerHere && (withHer > 0 || !brave)) {
      const mv = playable('move', false, false);
      if (mv) return mv;
    }
    if (atk) return atk;
  }

  // ── Survivors ──
  if (withHer > 0 && !exitOpen(c, s, h.loc)) {
    const mv = playable('move', true, false);
    if (mv) return mv;
  }
  const adjNpcs = neighbors(c, h.loc).some((n) => npcAt(s, n) > 0 && n !== k.loc);
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

/** Would swapping the shutters shorten her way to where she's going? */
function gatesHelp(c: Content, s: GameState): boolean {
  if (c.location.rule.kind !== 'shutters' || c.heroine.traits.gateKeys) return false;
  const g = botGoal(c, s);
  if (g.node === s.heroine.loc) return false;
  const now = costTo(c, s, g.node, g.brave)[s.heroine.loc] ?? 99;
  const flipped: GameState = { ...s, env: { ...s.env, gate: ((s.env.gate ?? 0) + 1) % (c.location.rule.gates?.length || 2) } };
  return (costTo(c, flipped, g.node, g.brave)[s.heroine.loc] ?? 99) + 1 < now;
}

/** Something always legal, so a simulation can never stall. */
function fallback(s: GameState): Action[] {
  const p = s.pending;
  if (p?.kind === 'move') return [{ type: 'stopMove' }];
  if (p?.kind === 'roll') return [{ type: 'resolveRoll' }];
  if (p?.kind === 'search') return [{ type: 'keep', picks: [] }];
  if (p?.kind === 'reaction') return [{ type: 'takeHit' }];
  if (p?.kind === 'aim') return [{ type: 'aim', at: 'minions' }];
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
