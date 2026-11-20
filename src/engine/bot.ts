// A rule-aware heuristic player. Used for balance simulation and fuzzing, and
// reusable as an in-game "hint" provider. It reads cards and items by their
// effect ops, so it works with any content pack without special cases.
import { actionDef, cardCost, check, distances, fightDice, hasTag, instinctDef, isFlooded, itemDef, killerAttackDice, moveCost, neighbors } from './rules';
import type { Action, ActionCardDef, Content, Effect, GameState, NodeId } from './types';

const hasOp = (effs: Effect[], op: Effect['op']): boolean =>
  effs.some((e) => e.op === op || (e.op === 'if' && (hasOp(e.then, op) || hasOp(e.else ?? [], op))));
const modKey = (effs: Effect[], key: string) => effs.some((e) => e.op === 'mod' && e.key === key);
const heals = (effs: Effect[]) => effs.some((e) => e.op === 'heal');
const calms = (effs: Effect[]) => effs.some((e) => e.op === 'horror' && e.n < 0);
const adds = (effs: Effect[]) => effs.some((e) => e.op === 'nerve' && e.n > 0) || modKey(effs, 'nerve');

/** Distances that treat the killer's node (and its neighbors) as costly. */
function safeDist(c: Content, s: GameState, target: NodeId): Record<NodeId, number> {
  const base = distances(c, target);
  const out: Record<NodeId, number> = {};
  const kn = new Set([s.killer.loc, ...neighbors(c, s.killer.loc)]);
  for (const [n, d] of Object.entries(base)) out[n] = d + (n === s.killer.loc ? 3 : kn.has(n) && s.killer.stunned === 0 ? 0.5 : 0) + (isFlooded(c, s, n) ? 0.6 : 0);
  return out;
}

function stepToward(c: Content, s: GameState, target: NodeId): Action | null {
  const h = s.heroine;
  if (h.loc === target) return null;
  const d = safeDist(c, s, target);
  const raw = distances(c, target);
  const opts = neighbors(c, h.loc)
    .filter((n) => (raw[n] ?? 99) < (raw[h.loc] ?? 99))
    .sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99) || moveCost(c, s, a) - moveCost(c, s, b));
  for (const n of opts) {
    const a: Action = { type: 'move', to: n };
    if (check(c, s, a).ok) return a;
  }
  return null;
}

function nearest(c: Content, s: GameState, pred: (n: NodeId) => boolean): NodeId | undefined {
  const d = distances(c, s.heroine.loc);
  return c.location.nodes
    .map((n) => n.id)
    .filter(pred)
    .sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99))[0];
}

export function botAction(c: Content, s: GameState): Action {
  if (s.phase === 'event') return { type: 'resolveEvent' };
  if (s.phase === 'killer') return { type: 'resolveKiller' };
  const h = s.heroine;
  const k = s.killer;
  const ok = (a: Action) => check(c, s, a).ok;
  /** Best playable card for an action type (most dice, then cheapest). */
  const card = (base: ActionCardDef['base']): Action | null => {
    const opts = s.actionHand
      .map((x) => ({ x, d: actionDef(c, x.id) }))
      .filter(({ x, d }) => d.base === base && check(c, s, { type: 'playCard', uid: x.uid }).ok)
      .sort((p, q) => (q.d.dice ?? 0) + (q.d.auto ? 3 : 0) - ((p.d.dice ?? 0) + (p.d.auto ? 3 : 0)) || cardCost(c, p.d) - cardCost(c, q.d));
    return opts[0] ? { type: 'playCard', uid: opts[0].x.uid } : null;
  };
  const killerHere = k.loc === h.loc && k.stunned === 0;
  const killerNear = killerHere || (neighbors(c, h.loc).includes(k.loc) && k.stunned === 0);
  const rule = c.location.rule.kind;
  const cold = rule === 'cold' && !c.heroine.traits.coldImmune ? s.env.cold : 0;
  const wounded = h.maxHealth - h.health;

  // ── Backpack: keep the best tools in hand ──
  {
    const score = (id: string) => {
      const d = itemDef(c, id);
      if (d.use?.when === 'killerHere') return 6;
      if (d.fightDice) return 3 + d.fightDice;
      if (d.use && heals(d.use.effects) && wounded >= 2) return 5;
      if (d.searchDice) return 2;
      if (d.use && hasOp(d.use.effects, 'teleportHeroine') && h.escorting > 0) return 7;
      return 1;
    };
    const best = h.pack.filter((p) => itemDef(c, p.id).kind !== 'lore' || itemDef(c, p.id).fightDice).sort((p, q) => score(q.id) - score(p.id))[0];
    if (best) {
      const worst = [...h.items].sort((p, q) => score(p.id) - score(q.id))[0];
      const free = s.pendingFind === best.uid;
      const gain = score(best.id) - (worst ? score(worst.id) : 0);
      const a: Action = { type: 'ready', uid: best.uid, swapOut: h.items.length >= 3 ? worst?.uid : undefined };
      if ((free ? gain > 0 : gain >= 3 && h.nerve >= 3) && check(c, s, a).ok) return a;
    }
  }

  // ── Items ──
  for (const it of h.items) {
    const d = itemDef(c, it.id);
    if (!d.use) continue;
    const a: Action = { type: 'useItem', uid: it.uid };
    if (!ok(a)) continue;
    const e = d.use.effects;
    if (d.use.when === 'killerHere' && killerHere) return a;
    if (hasOp(e, 'teleportHeroine') && h.escorting > 0) return a;
    if (heals(e) && wounded >= 2) return a;
    if (heals(e) && h.health <= 2) return a;
    if (calms(e) && h.horror >= 3) return a;
    if (hasOp(e, 'warm') && cold >= 2) return a;
    if (hasOp(e, 'barricade') && killerNear && !killerHere) return a;
    if (hasOp(e, 'killerMove') && killerNear && !killerHere && !e.some((x) => x.op === 'killerMove' && x.toward === 'heroine')) return a;
    if (hasOp(e, 'clock') && s.round >= s.dawnAt - 4) return a;
  }

  // ── Instincts ──
  for (const card of h.hand) {
    const d = instinctDef(c, card.id);
    const a: Action = { type: 'playInstinct', uid: card.uid };
    const e = d.effects;
    if (e.some((x) => x.op === 'killerMove' && x.toward === 'heroine')) continue; // never call him over
    if (heals(e) && wounded >= 1 && !e.some((x) => x.op === 'if')) return a;
    if (calms(e) && h.horror >= 2) return a;
    if (modKey(e, 'brace') && killerHere && !h.hidden) return a;
    if ((modKey(e, 'fightDice') || modKey(e, 'rerollNext')) && killerHere && h.nerve >= 2) return a;
    if (hasOp(e, 'killerStun') && killerHere) return a;
    if (hasOp(e, 'warm') && cold >= 1) return a;
    if (adds(e) && h.nerve <= 1 && (h.escorting > 0 || (s.victims[h.loc] ?? 0) > 0 || killerHere)) return a;
    if (modKey(e, 'searchDice') && (s.searches[h.loc] ?? 0) > 0 && h.nerve >= 1) return a;
    if (hasOp(e, 'drawItem') && h.items.length + h.pack.length < 8) return a;
  }

  // ── Draft: take what this situation needs ──
  if (s.picksLeft > 0 && s.actionHand.length < 5 && s.lineup.length) {
    const want = (d: ActionCardDef): number => {
      const have = (b: string) => s.actionHand.filter((x) => actionDef(c, x.id).base === b).length;
      const victimsAround = Object.values(s.victims).some((n) => n > 0);
      switch (d.base) {
        case 'move':
          return 9 - have('move') * 3 + (d.range ?? 1) - (d.sneak && !killerNear ? 1 : 0);
        case 'fight':
          return (killerNear || k.finale || s.round >= s.dawnAt - 6 ? 10 : 5) - have('fight') * 3 + (d.dice ?? 0);
        case 'hide':
          return (killerNear ? 7 : 3) - have('hide') * 3 + (d.auto ? 2 : 0);
        case 'lead':
          return (victimsAround ? 8 : 1) - have('lead') * 4;
        case 'search':
          return (h.items.length < 3 ? 6 : 3) - have('search') * 3 + (d.dice ?? 0) / 2;
        case 'rest':
          return (wounded > 0 || h.horror >= 3 || s.actionHand.some((x) => actionDef(c, x.id).junk) ? 7 : 1) - have('rest') * 4;
        case 'effect':
          return h.escorting > 0 || killerNear ? 5 : 2;
        case 'barricade':
          return killerNear ? 4 : 1;
        default:
          return 0;
      }
    };
    const best = s.lineup.map((x) => ({ x, v: want(actionDef(c, x.id)) })).sort((p, q) => q.v - p.v)[0];
    if (best && best.v > 1) return { type: 'draft', uid: best.x.uid };
  }

  // ── Deck upkeep ──
  const panicCard = s.actionHand.find((x) => actionDef(c, x.id).junk === 'panic');
  if (panicCard && h.nerve >= 4 && !killerHere) return { type: 'playCard', uid: panicCard.uid };
  const sprint = card('effect');
  if (sprint && (h.escorting > 0 || killerNear) && h.nerve >= 2 && h.freeMoves === 0) return sprint;

  // ── Killer in the room ──
  if (killerHere) {
    const dice = fightDice(c, s);
    const expectHit = dice * ((7 - 4) / 6) - k.armor;
    const theirHit = killerAttackDice(c, s) * 0.5;
    const brave = k.finale || expectHit >= 0.5 || h.health > theirHit + 1 || s.round >= s.dawnAt - 4;
    if (brave && card('fight')) return card('fight')!;
    if (h.health <= 2 && !h.hidden && card('hide') && h.nerve <= 2) return card('hide')!;
    // flee toward exit if escorting, else away from him
    const away = neighbors(c, h.loc)
      .filter((n) => ok({ type: 'move', to: n }))
      .sort((a, b) => (distances(c, k.loc)[b] ?? 0) - (distances(c, k.loc)[a] ?? 0))[0];
    if (away && !k.finale) return { type: 'move', to: away };
    if (card('fight')) return card('fight')!;
    if (!h.hidden && card('hide')) return card('hide')!;
    return { type: 'endTurn' };
  }

  // ── Location rules ──
  if (rule === 'calls' && s.env.ringing === h.loc && ok({ type: 'answer' })) return { type: 'answer' };
  if (rule === 'calls' && s.env.ringing && h.escorting === 0 && distances(c, h.loc)[s.env.ringing] === 1 && h.nerve >= 2) {
    const a = stepToward(c, s, s.env.ringing);
    if (a) return a;
  }
  if (cold >= 2 && !hasTag(c, h.loc, 'warm')) {
    const warm = nearest(c, s, (n) => hasTag(c, n, 'warm'));
    const a = warm && stepToward(c, s, warm);
    if (a) return a;
  }

  // ── Survivors ──
  if (card('lead')) return card('lead')!;
  if (h.escorting > 0) {
    const a = stepToward(c, s, c.location.exit);
    if (a) return a;
  }

  if (card('search') && !killerNear) return card('search')!;

  const victim = nearest(c, s, (n) => (s.victims[n] ?? 0) > 0 && n !== k.loc);
  if (victim) {
    const a = stepToward(c, s, victim);
    if (a && (h.nerve >= 2 || !killerNear)) return a;
  }

  if (card('search')) return card('search')!;
  if (!killerNear && card('rest') && (wounded > 0 || h.horror >= 2)) return card('rest')!;
  if (killerNear && !h.hidden && card('hide')) return card('hide')!;
  if (killerNear && card('barricade')) return card('barricade')!;

  // Don't end the round in the cold if a roof is one step away.
  if (cold >= 1 && hasTag(c, h.loc, 'outdoor')) {
    const inside = neighbors(c, h.loc).find((n) => !hasTag(c, n, 'outdoor') && ok({ type: 'move', to: n }));
    if (inside) return { type: 'move', to: inside };
  }
  // The only win is killing him: once armed (or running out of night), go hunting.
  const armed = fightDice(c, s) >= 4 || h.items.some((i) => itemDef(c, i.id).use?.when === 'killerHere');
  const late = s.round >= s.dawnAt - 5;
  const haveFight = s.actionHand.some((x) => actionDef(c, x.id).base === 'fight');
  if ((armed || late || k.finale) && haveFight && h.health >= 2) {
    const a = stepToward(c, s, k.loc);
    if (a && h.nerve >= 2) return a;
  }
  return { type: 'endTurn' };
}

/** Play one full game with the bot. */
export function simulate(c: Content, s: GameState, dispatch: (c: Content, s: GameState, a: Action) => GameState, maxSteps = 3000): GameState {
  for (let i = 0; i < maxSteps && !s.outcome; i++) {
    const a = botAction(c, s);
    const next = dispatch(c, s, a);
    s = next === s ? dispatch(c, s, { type: 'endTurn' }) : next;
  }
  return s;
}
