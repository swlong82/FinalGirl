// A rule-aware heuristic player. Used for balance simulation and fuzzing, and
// reusable as an in-game "hint" provider. It reads cards and items by their
// effect ops, so it works with any content pack without special cases.
import { check, distances, fightDice, hasTag, instinctDef, isFlooded, itemDef, killerAttackDice, moveCost, neighbors } from './rules';
import type { Action, Content, Effect, GameState, NodeId } from './types';

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
  const killerHere = k.loc === h.loc && k.stunned === 0;
  const killerNear = killerHere || (neighbors(c, h.loc).includes(k.loc) && k.stunned === 0);
  const rule = c.location.rule.kind;
  const cold = rule === 'cold' && !c.heroine.traits.coldImmune ? s.env.cold : 0;
  const wounded = h.maxHealth - h.health;

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
    if (hasOp(e, 'drawItem') && h.items.length < 4) return a;
  }

  // ── Killer in the room ──
  if (killerHere) {
    const dice = fightDice(c, s);
    const expectHit = dice * ((7 - 4) / 6) - k.armor;
    const theirHit = killerAttackDice(c, s) * 0.5;
    const brave = k.finale || expectHit >= 1 || h.health > theirHit + 2;
    if (brave && ok({ type: 'fight' })) return { type: 'fight' };
    if (h.health <= 2 && !h.hidden && ok({ type: 'hide' }) && h.nerve <= 2) return { type: 'hide' };
    // flee toward exit if escorting, else away from him
    const away = neighbors(c, h.loc)
      .filter((n) => ok({ type: 'move', to: n }))
      .sort((a, b) => (distances(c, k.loc)[b] ?? 0) - (distances(c, k.loc)[a] ?? 0))[0];
    if (away && !k.finale) return { type: 'move', to: away };
    if (ok({ type: 'fight' })) return { type: 'fight' };
    if (!h.hidden && ok({ type: 'hide' })) return { type: 'hide' };
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
  if (ok({ type: 'lead' })) return { type: 'lead' };
  if (h.escorting > 0) {
    const a = stepToward(c, s, c.location.exit);
    if (a) return a;
  }

  if (ok({ type: 'search' }) && h.items.length < 4 && !killerNear) return { type: 'search' };

  const victim = nearest(c, s, (n) => (s.victims[n] ?? 0) > 0 && n !== k.loc);
  if (victim) {
    const a = stepToward(c, s, victim);
    if (a && (h.nerve >= 2 || !killerNear)) return a;
  }

  if (ok({ type: 'search' }) && h.items.length < 5) return { type: 'search' };
  if (!killerNear && ok({ type: 'rest' }) && (wounded > 0 || h.horror >= 2)) return { type: 'rest' };
  if (killerNear && !h.hidden && ok({ type: 'hide' })) return { type: 'hide' };
  if (killerNear && ok({ type: 'barricade' })) return { type: 'barricade' };

  // Don't end the round in the cold if a roof is one step away.
  if (cold >= 1 && hasTag(c, h.loc, 'outdoor')) {
    const inside = neighbors(c, h.loc).find((n) => !hasTag(c, n, 'outdoor') && ok({ type: 'move', to: n }));
    if (inside) return { type: 'move', to: inside };
  }
  // In the finale, go hunting with weapons — or wait for him in cover.
  if (k.finale && fightDice(c, s) >= 5) {
    const a = stepToward(c, s, k.loc);
    if (a && h.nerve >= 3) return a;
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
