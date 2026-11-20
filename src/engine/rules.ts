import { nextRand, pick, rollD6, shuffle } from './rng';
import type {
  Action,
  Difficulty,
  Condition,
  Content,
  DiceRoll,
  Effect,
  GameState,
  ItemDef,
  InstinctDef,
  EventDef,
  ActionCardDef,
  LogEntry,
  NodeId,
  NodeTag,
} from './types';

// ── Tunables ────────────────────────────────────────────────────────────────
export const COST = { move: 1, flee: 2, search: 1, lead: 1, fight: 2, hide: 1, barricade: 2, rest: 2 };
export const BASE_DICE = { search: 2, fight: 3, hide: 2, rest: 2 };
export const MAX_ITEMS = 5;
export const MAX_HAND = 4;
export const MAX_HORROR = 6;
export const DEFAULT_ESCORT = 3;
export const VICTIM_POOL = 12;
export const DAWN_ROUND = 13;
export const NERVE_CAP = 8;
export const NERVE_START = 3;
export const ACTION_HAND = 5;
export const NOISE_EVERY = 5;
export const PANIC_AT = 4;

export interface Tier {
  name: string;
  nerve: number; // nerve gained per round (banked, up to NERVE_CAP)
  threshold: number;
}

export function horrorTier(h: number): Tier {
  if (h <= 1) return { name: 'Steady', nerve: 3, threshold: 4 };
  if (h <= 3) return { name: 'Uneasy', nerve: 3, threshold: 4 };
  if (h <= 5) return { name: 'Terrified', nerve: 3, threshold: 5 };
  return { name: 'Breaking', nerve: 2, threshold: 5 };
}

export function actionDef(c: Content, id: string): ActionCardDef {
  const d = c.actions.find((a) => a.id === id);
  if (!d) throw new Error(`Unknown action card ${id}`);
  return d;
}

// ── Lookups ─────────────────────────────────────────────────────────────────
export function allItems(c: Content): ItemDef[] {
  return [...c.location.items, ...c.killer.items];
}
export function itemDef(c: Content, id: string): ItemDef {
  const d = allItems(c).find((i) => i.id === id);
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}
export function allInstincts(c: Content): InstinctDef[] {
  return [...c.instincts, c.heroine.signature];
}
export function instinctDef(c: Content, id: string): InstinctDef {
  const d = allInstincts(c).find((i) => i.id === id);
  if (!d) throw new Error(`Unknown instinct ${id}`);
  return d;
}
export function allEvents(c: Content): EventDef[] {
  return [...c.location.events, ...c.killer.events];
}
export function eventDef(c: Content, id: string): EventDef {
  const d = [...allEvents(c), ...c.killer.terror].find((e) => e.id === id);
  if (!d) throw new Error(`Unknown event ${id}`);
  return d;
}
export function nodeName(c: Content, id: NodeId): string {
  return c.location.nodes.find((n) => n.id === id)?.name ?? id;
}

export function neighbors(c: Content, id: NodeId): NodeId[] {
  const out: NodeId[] = [];
  for (const [a, b] of c.location.edges) {
    if (a === id) out.push(b);
    else if (b === id) out.push(a);
  }
  return out;
}

/** BFS distances from a node. */
export function distances(c: Content, from: NodeId): Record<NodeId, number> {
  const d: Record<NodeId, number> = { [from]: 0 };
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of neighbors(c, cur)) {
      if (d[n] === undefined) {
        d[n] = d[cur] + 1;
        q.push(n);
      }
    }
  }
  return d;
}

/** Next step on a shortest path from → to. */
export function stepToward(c: Content, from: NodeId, to: NodeId): NodeId {
  if (from === to) return from;
  const d = distances(c, to);
  const opts = neighbors(c, from).filter((n) => d[n] !== undefined && d[n] < d[from]);
  return opts.sort()[0] ?? from;
}

// ── Setup ───────────────────────────────────────────────────────────────────
function expand<T extends { id: string; copies?: number }>(defs: T[]): string[] {
  return defs.flatMap((d) => Array(d.copies ?? 1).fill(d.id));
}

export const DIFFICULTY: Record<Difficulty, { label: string; text: string; killerHp: number; attack: number; dawn: number }> = {
  story: { label: 'Matinee', text: 'Killer −3 health, dawn comes a round earlier.', killerHp: -3, attack: 0, dawn: -1 },
  standard: { label: 'Midnight Show', text: 'The intended experience.', killerHp: 0, attack: 0, dawn: 0 },
  nightmare: { label: 'Nightmare', text: 'Killer +3 health and +1 attack die.', killerHp: 3, attack: 1, dawn: 0 },
};

export function newGame(c: Content, seed: number, difficulty: Difficulty = 'standard'): GameState {
  const dm = DIFFICULTY[difficulty];
  const s: GameState = {
    version: 1,
    seed,
    rng: seed >>> 0,
    uid: 1,
    packs: { location: c.location.id, killer: c.killer.id, heroine: c.heroine.id },
    difficulty,
    round: 1,
    dawnAt: DAWN_ROUND + dm.dawn,
    phase: 'event',
    heroine: {
      loc: c.location.heroineStart,
      health: c.heroine.health,
      maxHealth: c.heroine.health,
      horror: 0,
      nerve: NERVE_START,
      items: [],
      hand: [],
      escorting: 0,
      hidden: false,
      movedThisRound: 0,
      horrorTakenThisRound: 0,
      freeMoves: 0,
      spentThisRound: 0,
    },
    killer: {
      loc: c.location.lair,
      health: c.killer.health + dm.killerHp,
      maxHealth: c.killer.health + dm.killerHp,
      armor: c.killer.armor,
      bloodlust: 0,
      stunned: 0,
      finale: false,
      frenzy: false,
      risen: false,
      finalePhase: -1,
      attackBonus: dm.attack,
    },
    victims: Object.fromEntries(c.location.nodes.map((n) => [n.id, 0])),
    searches: Object.fromEntries(c.location.nodes.map((n) => [n.id, n.searches])),
    barricades: Object.fromEntries(c.location.nodes.map((n) => [n.id, 0])),
    saved: 0,
    slain: 0,
    victimPool: VICTIM_POOL,
    mods: {},
    eventDeck: [],
    eventDiscard: [],
    itemDeck: [],
    instinctDeck: [],
    instinctDiscard: [],
    terrorDeck: [],
    env: { tideHigh: false, dark: false, cold: 0 },
    actionDeck: [],
    actionDiscard: [],
    actionHand: [],
    panic: {},
    foundLore: [],
    log: [],
    fx: [],
  };
  s.eventDeck = shuffle(s, expand(allEvents(c)));
  s.itemDeck = shuffle(s, expand(allItems(c)));
  s.instinctDeck = shuffle(s, expand(allInstincts(c)));
  s.terrorDeck = shuffle(s, expand(c.killer.terror));
  s.actionDeck = shuffle(s, expand(c.actions.filter((a) => !a.junk)));
  for (const at of c.location.setupVictims) placeVictims(c, s, at, 1);
  drawInstinct(s, 2);
  log(s, `The feature begins. ${c.heroine.name} arrives at ${nodeName(c, s.heroine.loc)}.`, 'info');
  startRound(c, s);
  return s;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function log(s: GameState, text: string, tone?: LogEntry['tone']) {
  s.log.push({ round: s.round, text, tone });
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
}

function placeVictims(c: Content, s: GameState, at: NodeId, n: number): number {
  const k = Math.min(n, s.victimPool);
  if (k <= 0) return 0;
  s.victimPool -= k;
  s.victims[at] = (s.victims[at] ?? 0) + k;
  log(s, `${k === 1 ? 'A survivor' : `${k} survivors`} stumble into ${nodeName(c, at)}.`, 'info');
  return k;
}

function drawInstinct(s: GameState, n: number) {
  for (let i = 0; i < n && s.heroine.hand.length < MAX_HAND; i++) {
    if (!s.instinctDeck.length) {
      s.instinctDeck = shuffle(s, s.instinctDiscard);
      s.instinctDiscard = [];
    }
    const id = s.instinctDeck.pop();
    if (!id) return;
    s.heroine.hand.push({ uid: s.uid++, id });
  }
}

// ── Action deck ─────────────────────────────────────────────────────────────
export function drawActions(s: GameState, upTo = ACTION_HAND) {
  while (s.actionHand.length < upTo) {
    if (!s.actionDeck.length) {
      if (!s.actionDiscard.length) return;
      s.actionDeck = shuffle(s, s.actionDiscard);
      s.actionDiscard = [];
    }
    s.actionHand.push({ uid: s.uid++, id: s.actionDeck.pop()! });
  }
}

/** Shuffle a junk card into the draw pile at a random depth. */
function addJunk(s: GameState, id: string) {
  const at = Math.floor(nextRand(s) * (s.actionDeck.length + 1));
  s.actionDeck.splice(at, 0, id);
}

/** Remove one junk card of this id: hand first, then discard, then deck. */
function removeJunk(s: GameState, id: string): boolean {
  const hi = s.actionHand.findIndex((x) => x.id === id);
  if (hi >= 0) {
    s.actionHand.splice(hi, 1);
    return true;
  }
  for (const pile of [s.actionDiscard, s.actionDeck]) {
    const i = pile.indexOf(id);
    if (i >= 0) {
      pile.splice(i, 1);
      return true;
    }
  }
  return false;
}

export function junkCount(s: GameState, id: string) {
  return [...s.actionHand.map((x) => x.id), ...s.actionDiscard, ...s.actionDeck].filter((x) => x === id).length;
}

function gainItem(c: Content, s: GameState, id: string) {
  const d = itemDef(c, id);
  if (s.heroine.items.length >= MAX_ITEMS) {
    log(s, `Hands full — ${d.name} left behind.`, 'info');
    return;
  }
  s.heroine.items.push({ uid: s.uid++, id, usesLeft: d.uses });
  log(s, `Found: ${d.name}.`, 'good');
  s.fx.push({ t: 'item' });
  if (d.lore && !s.foundLore.includes(d.id)) s.foundLore.push(d.id);
  if (d.onGain) applyEffects(c, s, d.onGain);
}

export function canAct(s: GameState) {
  return s.phase === 'action' && !s.outcome;
}

export function rollDice(s: GameState, label: string, n: number, threshold: number): DiceRoll {
  n = Math.max(1, n);
  let dice = Array.from({ length: n }, () => rollD6(s));
  let rerolled = false;
  if ((s.mods.rerollNext ?? 0) > 0) {
    s.mods.rerollNext = (s.mods.rerollNext ?? 1) - 1;
    dice = dice.map((d) => (d >= threshold ? d : rollD6(s)));
    rerolled = true;
  }
  const successes = dice.filter((d) => d >= threshold).length;
  const roll = { id: s.uid++, label, dice, threshold, successes, rerolled };
  s.lastRoll = roll;
  s.fx.push({ t: 'dice' });
  return roll;
}

export function addHorror(c: Content, s: GameState, n: number) {
  const h = s.heroine;
  if (n > 0 && c.heroine.traits.ignoreFirstHorror && h.horrorTakenThisRound === 0) {
    h.horrorTakenThisRound++;
    n -= 1;
    log(s, `${c.heroine.name} steadies herself — she's seen this movie before.`, 'good');
    if (n <= 0) return;
  }
  if (n > 0) h.horrorTakenThisRound++;
  const before = h.horror;
  const raw = h.horror + n;
  h.horror = Math.max(0, Math.min(MAX_HORROR, raw));
  if (h.horror !== before) s.fx.push({ t: 'horror', n: h.horror - before });
  // Fear seeps into her hand: Panic cards at horror 5 and 6, gone again once calm (≤2).
  for (const mark of [5, 6]) if (before < mark && h.horror >= mark) {
    addJunk(s, 'junk-panic');
    log(s, 'Panic sets in. (A Panic card joins her deck.)', 'bad');
  }
  if (h.horror <= 2 && before > 2) while (removeJunk(s, 'junk-panic')) log(s, 'The panic fades.', 'good');
  if (raw > MAX_HORROR) {
    log(s, 'Terror overwhelms her body.', 'bad');
    wound(c, s, raw - MAX_HORROR);
  }
}

export function wound(c: Content, s: GameState, n: number) {
  if (n <= 0) return;
  s.heroine.health -= n;
  s.fx.push({ t: 'wound', n });
  addJunk(s, 'junk-wound'); // one Bleeding card per hit, however hard
  if (s.heroine.health <= 0) {
    s.heroine.health = 0;
    endGame(c, s, 'died');
  }
}

function endGame(c: Content, s: GameState, o: GameState['outcome']) {
  if (s.outcome) return;
  s.outcome = o;
  s.phase = 'over';
  if (o === 'died') {
    log(s, `${c.heroine.name} has fallen. The credits roll in silence.`, 'bad');
    s.fx.push({ t: 'lose' });
  } else if (o === 'slain') {
    log(s, `${c.killer.name} is finished. The reel runs out.`, 'good');
    s.fx.push({ t: 'win' });
  } else {
    log(s, `Dawn breaks over ${c.location.name}. ${c.killer.name} is gone… for now.`, 'good');
    s.fx.push({ t: 'win' });
  }
}

export function killerAttackDice(c: Content, s: GameState) {
  return (s.killer.finale ? c.killer.finale.attackDice : c.killer.attackDice) + s.killer.attackBonus + (s.mods.killerAttackDice ?? 0);
}
export function killerSpeed(c: Content, s: GameState) {
  return c.killer.speed + (s.killer.frenzy ? 1 : 0) + (s.killer.finale ? 1 : 0) + (s.env.dark ? 1 : 0);
}

function addBloodlust(c: Content, s: GameState, n: number) {
  const k = s.killer;
  const before = k.bloodlust;
  k.bloodlust = Math.max(0, Math.min(c.killer.bloodlustMax, k.bloodlust + n));
  const every = c.killer.terrorEvery;
  if (every > 0) {
    const crossed = Math.floor(k.bloodlust / every) - Math.floor(before / every);
    for (let i = 0; i < crossed && !s.outcome; i++) drawTerror(c, s);
  }
  if (!k.frenzy && k.bloodlust >= c.killer.frenzyAt) {
    k.frenzy = true;
    log(s, `${c.killer.name} enters a FRENZY. He moves faster now.`, 'killer');
  }
  if (!k.finale && k.bloodlust >= c.killer.finaleAt) triggerFinale(c, s, 'bloodlust');
}

function drawTerror(c: Content, s: GameState) {
  const id = s.terrorDeck.pop();
  if (!id) return;
  const t = eventDef(c, id);
  log(s, `TERROR — ${t.name}`, 'killer');
  s.fx.push({ t: 'terror', id });
  applyEffects(c, s, t.effects);
}

export function triggerFinale(c: Content, s: GameState, why: 'bloodlust' | 'clock' | 'risen') {
  const k = s.killer;
  if (k.finale) return;
  k.finale = true;
  k.armor = Math.max(0, c.killer.finale.armor - weaknessFound(c, s));
  const reason =
    why === 'risen' ? 'He gets back up.' : why === 'clock' ? 'The last reel begins.' : 'His hunger is sated — now he wants her.';
  log(s, `FINALE — ${c.killer.finale.name}. ${reason}`, 'killer');
  s.fx.push({ t: 'finale' });
  applyEffects(c, s, c.killer.finale.effects);
}

export function weaknessFound(c: Content, s: GameState) {
  return c.killer.items.filter((i) => i.kind === 'lore' && s.foundLore.includes(i.id)).length;
}

function damageKiller(c: Content, s: GameState, n: number, ignoreArmor = false) {
  const k = s.killer;
  const dmg = Math.max(0, n - (ignoreArmor ? 0 : k.armor));
  if (n > 0 && dmg === 0) log(s, `The blow glances off. ${c.killer.name} barely flinches.`, 'bad');
  if (dmg <= 0) return 0;
  k.health -= dmg;
  s.fx.push({ t: 'hit', n: dmg });
  log(s, `${c.killer.name} takes ${dmg} damage.`, 'good');
  if (k.health <= 0) {
    if (!k.finale) {
      k.risen = true;
      k.health = Math.ceil(k.maxHealth / 2);
      log(s, `${c.killer.name} collapses… and then, slowly, sits up.`, 'killer');
      triggerFinale(c, s, 'risen');
    } else {
      const phases = c.killer.finale.phases ?? [];
      const next = phases[k.finalePhase + 1];
      if (next) {
        k.finalePhase++;
        k.health = next.health;
        k.maxHealth = Math.max(k.maxHealth, next.health);
        log(s, `${next.name.toUpperCase()} — ${next.text}`, 'killer');
        s.fx.push({ t: 'phase', name: next.name });
        applyEffects(c, s, next.effects);
      } else {
        k.health = 0;
        endGame(c, s, 'slain');
      }
    }
  }
  return dmg;
}

function saveEscorted(c: Content, s: GameState) {
  const h = s.heroine;
  if (h.loc !== c.location.exit || h.escorting <= 0) return;
  const n = h.escorting;
  h.escorting = 0;
  s.saved += n;
  log(s, `${n === 1 ? 'A survivor flees' : `${n} survivors flee`} down the highway. Saved!`, 'good');
  s.fx.push({ t: 'saved', n });
  addHorror(c, s, -(c.heroine.traits.saveHorror ?? 1) * n);
  drawInstinct(s, 1 + (c.heroine.traits.saveDraw ?? 0));
}

function checkCond(c: Content, s: GameState, cond: Condition): boolean {
  const h = s.heroine;
  switch (cond.c) {
    case 'killerHere':
      return s.killer.loc === h.loc;
    case 'killerAdjacent':
      return neighbors(c, h.loc).includes(s.killer.loc);
    case 'heroineAt':
      return h.loc === cond.node;
    case 'alone':
      return h.escorting === 0 && (s.victims[h.loc] ?? 0) === 0;
    case 'escorting':
      return h.escorting > 0;
    case 'finale':
      return s.killer.finale;
    case 'horrorAtLeast':
      return h.horror >= cond.n;
  }
}

function moveKiller(c: Content, s: GameState, to: NodeId) {
  if (to === s.killer.loc) return true;
  if ((s.barricades[to] ?? 0) > 0) {
    s.barricades[to]--;
    log(s, `${c.killer.name} batters the barricade at ${nodeName(c, to)}.`, 'killer');
    return false;
  }
  s.killer.loc = to;
  return true;
}

export function applyEffects(c: Content, s: GameState, effects: Effect[]) {
  for (const e of effects) {
    if (s.outcome) return;
    applyEffect(c, s, e);
  }
}

function applyEffect(c: Content, s: GameState, e: Effect) {
  const h = s.heroine;
  const k = s.killer;
  switch (e.op) {
    case 'spawn': {
      let at = e.at;
      if (at === 'random') {
        const opts = c.location.nodes.map((n) => n.id).filter((id) => id !== k.loc && id !== c.location.exit);
        at = pick(s, opts);
      } else if (at === 'nearKiller') {
        const opts = neighbors(c, k.loc).filter((id) => id !== c.location.exit && id !== h.loc);
        at = opts.length ? pick(s, opts) : stepAwayFrom(c, s, k.loc);
      } else if (at === 'farFromKiller') {
        const d = distances(c, k.loc);
        at = c.location.nodes
          .map((n) => n.id)
          .filter((id) => id !== c.location.exit)
          .sort((a, b) => (d[b] ?? 0) - (d[a] ?? 0))[0];
      }
      if (at === k.loc) at = stepAwayFrom(c, s, at);
      placeVictims(c, s, at, e.n);
      break;
    }
    case 'horror':
      addHorror(c, s, e.n);
      break;
    case 'heal': {
      const before = h.health;
      h.health = Math.min(h.maxHealth, h.health + e.n);
      if (h.health > before) log(s, `Recovered ${h.health - before} health.`, 'good');
      for (let i = 0; i < e.n; i++) removeJunk(s, 'junk-wound');
      break;
    }
    case 'wound':
      wound(c, s, e.n);
      break;
    case 'nerve':
      h.nerve = Math.max(0, h.nerve + e.n);
      break;
    case 'bloodlust':
      addBloodlust(c, s, e.n);
      break;
    case 'killerHeal':
      k.health = Math.min(k.maxHealth, k.health + e.n);
      break;
    case 'killerDamage':
      damageKiller(c, s, e.n, e.ignoreArmor);
      break;
    case 'killerStun':
      k.stunned += e.n;
      s.fx.push({ t: 'stun' });
      log(s, `${c.killer.name} is stunned.`, 'good');
      break;
    case 'killerMove': {
      for (let i = 0; i < e.steps; i++) {
        const target = e.toward === 'heroine' ? h.loc : e.toward === 'lair' ? c.location.lair : e.toward;
        if (!moveKiller(c, s, stepToward(c, k.loc, target))) break;
      }
      if (k.loc === h.loc) s.fx.push({ t: 'killerAppears' });
      break;
    }
    case 'killerTeleport': {
      let to = e.to;
      if (to === 'lair') to = c.location.lair;
      else if (to === 'heroine') to = h.loc;
      else if (to === 'random') to = pick(s, c.location.nodes.map((n) => n.id).filter((id) => id !== c.location.exit));
      k.loc = to;
      log(s, `${c.killer.name} vanishes… and is now at ${nodeName(c, to)}.`, 'killer');
      if (k.loc === h.loc) s.fx.push({ t: 'killerAppears' });
      break;
    }
    case 'killerArmor':
      k.armor = Math.max(0, k.armor + e.n);
      break;
    case 'clock':
      s.dawnAt = Math.max(s.round, s.dawnAt - e.n);
      break;
    case 'mod':
      s.mods[e.key] = (s.mods[e.key] ?? 0) + e.n;
      if (e.key === 'nerve') h.nerve = Math.max(0, h.nerve + e.n);
      break;
    case 'freeMove':
      h.freeMoves++;
      break;
    case 'drawItem':
      for (let i = 0; i < e.n; i++) {
        const id = s.itemDeck.pop();
        if (id) gainItem(c, s, id);
      }
      break;
    case 'drawInstinct':
      drawInstinct(s, e.n);
      break;
    case 'barricade': {
      const at = e.at === 'here' ? h.loc : e.at;
      s.barricades[at] = (s.barricades[at] ?? 0) + e.strength;
      log(s, `Barricade raised at ${nodeName(c, at)}.`, 'good');
      break;
    }
    case 'teleportHeroine':
      h.loc = e.to;
      s.fx.push({ t: 'move' });
      saveEscorted(c, s);
      break;
    case 'saveEscorted':
      saveEscorted(c, s);
      break;
    case 'if':
      applyEffects(c, s, checkCond(c, s, e.cond) ? e.then : e.else ?? []);
      break;
    case 'warm':
      if (s.env.cold > 0) log(s, 'Warmth floods back into her hands.', 'good');
      s.env.cold = 0;
      break;
    case 'log':
      log(s, e.text, 'info');
      break;
  }
}

function stepAwayFrom(c: Content, s: GameState, at: NodeId): NodeId {
  const opts = neighbors(c, at).filter((n) => n !== c.location.exit);
  return opts.length ? pick(s, opts) : at;
}

// ── Round flow ──────────────────────────────────────────────────────────────
function startRound(c: Content, s: GameState) {
  if (s.round > s.dawnAt) {
    endGame(c, s, 'survived');
    return;
  }
  if (!s.killer.finale && s.round >= s.dawnAt - 3) triggerFinale(c, s, 'clock');
  if (s.outcome) return;
  ruleRoundStart(c, s);
  if (s.outcome) return;
  if (!s.eventDeck.length) {
    s.eventDeck = shuffle(s, s.eventDiscard);
    s.eventDiscard = [];
  }
  const id = s.eventDeck.pop()!;
  s.currentEvent = id;
  s.phase = 'event';
  s.fx.push({ t: 'card' });
}

// ── Location rules ──────────────────────────────────────────────────────────
export function hasTag(c: Content, node: NodeId, tag: NodeTag) {
  return !!c.location.nodes.find((n) => n.id === node)?.tags?.includes(tag);
}
export function isFlooded(c: Content, s: GameState, node: NodeId) {
  return c.location.rule.kind === 'tide' && s.env.tideHigh && hasTag(c, node, 'shore');
}

function ruleRoundStart(c: Content, s: GameState) {
  const r = c.location.rule;
  const env = s.env;
  const period = r.period ?? 3;
  switch (r.kind) {
    case 'intermission':
      if (s.round % period === 0) {
        s.mods.nerve = (s.mods.nerve ?? 0) + 1;
        addHorror(c, s, -1);
        log(s, `${r.name}: the projector stops. +1 nerve, horror −1.`, 'good');
        s.fx.push({ t: 'env', text: r.name });
      }
      break;
    case 'tide': {
      const high = Math.floor((s.round - 1) / period) % 2 === 1;
      if (high !== env.tideHigh) {
        env.tideHigh = high;
        log(s, high ? 'HIGH TIDE — the shore floods. Entering it costs +1 nerve.' : 'Low tide — the water draws back.', high ? 'killer' : 'good');
        s.fx.push({ t: 'env', text: high ? 'High Tide' : 'Low Tide' });
      }
      break;
    }
    case 'power': {
      const dark = s.round >= 3 && (s.round % 4 === 3 || s.round % 4 === 0);
      if (dark !== env.dark) {
        env.dark = dark;
        log(s, dark ? 'BLACKOUT — the power fails. Searching is harder, hiding is easier — and he knows these halls in the dark.' : 'The lights stutter back on.', dark ? 'killer' : 'good');
        s.fx.push({ t: 'env', text: dark ? 'Blackout' : 'Power Restored' });
      }
      if (dark) {
        s.mods.searchThreshold = (s.mods.searchThreshold ?? 0) + 1;
        s.mods.hideDice = (s.mods.hideDice ?? 0) + 1;
      }
      break;
    }
    case 'cold':
      if (env.cold >= 2) {
        s.mods.nerve = (s.mods.nerve ?? 0) - 1;
        log(s, 'Numb fingers, slow thoughts. −1 nerve from the cold.', 'bad');
      }
      break;
    case 'calls': {
      const phones = c.location.nodes.filter((n) => n.tags?.includes('phone') && n.id !== s.heroine.loc).map((n) => n.id);
      env.ringing = phones.length ? pick(s, phones) : undefined;
      if (env.ringing) {
        log(s, `☎ The phone is ringing at ${nodeName(c, env.ringing)}.`, 'killer');
        s.fx.push({ t: 'env', text: 'Phone ringing' });
      }
      break;
    }
  }
}

/** After the heroine's turn, before the killer acts. */
function ruleBeforeKiller(c: Content, s: GameState) {
  const env = s.env;
  if (c.location.rule.kind === 'calls' && env.ringing) {
    const at = env.ringing;
    env.ringing = undefined;
    log(s, `Nobody stopped the ringing at ${nodeName(c, at)}. Someone else picks up — and ${c.killer.name} hears where.`, 'killer');
    if (at !== s.killer.loc) placeVictims(c, s, at, 1);
    s.killer.lured = at;
  }
}

function ruleRoundEnd(c: Content, s: GameState) {
  const env = s.env;
  const h = s.heroine;
  if (c.location.rule.kind === 'cold' && !c.heroine.traits.coldImmune) {
    if (hasTag(c, h.loc, 'warm')) {
      if (env.cold > 0) log(s, 'She thaws out by the fire.', 'good');
      env.cold = 0;
    } else if (hasTag(c, h.loc, 'outdoor')) {
      env.cold++;
      log(s, `The cold bites. Cold ${env.cold}/3.`, 'bad');
      if (env.cold >= 3) {
        log(s, 'Frostbite.', 'bad');
        env.cold = 0;
        wound(c, s, 1);
      }
    }
  }
}

/** Spending a lot of nerve in one round makes noise: he takes a step toward her. */
function makeNoise(c: Content, s: GameState) {
  const k = s.killer;
  const h = s.heroine;
  if (k.stunned > 0 || k.loc === h.loc || s.outcome) return;
  log(s, `Too loud. ${c.killer.name} hears her.`, 'killer');
  applyEffect(c, s, { op: 'killerMove', toward: 'heroine', steps: 1 });
}

/** Survivors left alone get more frightened each round; at PANIC_AT one of them bolts. */
function survivorClock(c: Content, s: GameState) {
  const h = s.heroine;
  const k = s.killer;
  const moves: [NodeId, NodeId][] = [];
  for (const [node, n] of Object.entries(s.victims)) {
    if (n <= 0) {
      s.panic[node] = 0;
      continue;
    }
    if (node === h.loc) {
      s.panic[node] = 0;
      continue;
    }
    s.panic[node] = (s.panic[node] ?? 0) + 1;
    if (s.panic[node] < PANIC_AT) continue;
    s.panic[node] = 1;
    if (nextRand(s) < 0.34) {
      log(s, `The survivors at ${nodeName(c, node)} are holding it together. Barely.`, 'info');
      continue;
    }
    const opts = neighbors(c, node).filter((x) => x !== c.location.exit);
    if (!opts.length) continue;
    moves.push([node, pick(s, opts)]);
  }
  for (const [from, to] of moves) {
    s.victims[from]--;
    if (to === k.loc) {
      s.slain++;
      log(s, `A survivor panics and runs from ${nodeName(c, from)} — straight into ${c.killer.name}.`, 'killer');
      s.fx.push({ t: 'victimSlain', at: to });
      addBloodlust(c, s, 2);
    } else {
      s.victims[to] = (s.victims[to] ?? 0) + 1;
      log(s, `A survivor panics and bolts from ${nodeName(c, from)} to ${nodeName(c, to)}.`, 'bad');
    }
  }
}

function endRound(c: Content, s: GameState) {
  const h = s.heroine;
  ruleRoundEnd(c, s);
  if (s.outcome) return;
  survivorClock(c, s);
  if (s.outcome) return;
  h.spentThisRound = 0;
  s.mods = {};
  h.hidden = false;
  h.movedThisRound = 0;
  h.horrorTakenThisRound = 0;
  h.freeMoves = 0;
  s.round++;
  drawInstinct(s, 1);
  // A quiet board breeds new trouble.
  const onBoard = Object.values(s.victims).reduce((a, b) => a + b, 0);
  if (onBoard === 0 && s.victimPool > 0 && nextRand(s) < 0.6) applyEffect(c, s, { op: 'spawn', at: 'farFromKiller', n: 1 });
  startRound(c, s);
}

// ── Action legality (also used by the UI) ───────────────────────────────────
export interface Check {
  ok: boolean;
  why?: string;
  cost: number;
}

function afford(s: GameState, cost: number): Check {
  return s.heroine.nerve >= cost ? { ok: true, cost } : { ok: false, why: `Needs ${cost} nerve`, cost };
}

export function moveCost(c: Content, s: GameState, to?: NodeId): number {
  const h = s.heroine;
  const flood = (to && isFlooded(c, s, to) ? 1 : 0) + (h.escorting >= 3 ? 1 : 0);
  if (h.freeMoves > 0) return flood;
  if (c.heroine.traits.freeFirstMove && h.movedThisRound === 0) return flood;
  const fleeing = s.killer.loc === h.loc && s.killer.stunned === 0;
  return (fleeing ? COST.flee : COST.move) + flood;
}

export function cardCost(c: Content, d: ActionCardDef): number {
  if (d.base === 'barricade' && c.heroine.traits.barricadeCost !== undefined) return Math.min(d.cost, c.heroine.traits.barricadeCost);
  return d.cost;
}

/** Is the action behind this card possible right now (ignoring cost)? */
export function baseCheck(c: Content, s: GameState, d: ActionCardDef): { ok: boolean; why?: string } {
  const h = s.heroine;
  const killerHere = s.killer.loc === h.loc;
  switch (d.base) {
    case 'search':
      if ((s.searches[h.loc] ?? 0) <= 0) return { ok: false, why: 'Nothing left to find here' };
      if (!s.itemDeck.length) return { ok: false, why: 'Nothing left anywhere' };
      return { ok: true };
    case 'lead': {
      const cap = c.heroine.traits.escortCap ?? DEFAULT_ESCORT;
      if ((s.victims[h.loc] ?? 0) <= 0) return { ok: false, why: 'No survivors here' };
      if (h.escorting >= cap) return { ok: false, why: `Can escort ${cap} at most` };
      return { ok: true };
    }
    case 'fight':
      return killerHere ? { ok: true } : { ok: false, why: 'The killer is not here' };
    case 'hide':
      return h.hidden ? { ok: false, why: 'Already hidden' } : { ok: true };
    case 'barricade':
      if (killerHere) return { ok: false, why: 'Not with the killer in the room' };
      if (h.loc === c.location.exit) return { ok: false, why: 'Cannot barricade the exit' };
      return { ok: true };
    case 'rest':
      if (killerHere) return { ok: false, why: 'Not with the killer in the room' };
      if (h.health >= h.maxHealth && h.horror === 0 && junkCount(s, 'junk-wound') === 0) return { ok: false, why: 'Nothing to recover' };
      return { ok: true };
    case 'effect':
    case 'junk':
      return { ok: true };
  }
}

export function check(c: Content, s: GameState, a: Action): Check {
  if (!canAct(s) && a.type !== 'resolveEvent' && a.type !== 'resolveKiller') return { ok: false, why: 'Not now', cost: 0 };
  const h = s.heroine;
  const killerHere = s.killer.loc === h.loc;
  switch (a.type) {
    case 'resolveEvent':
      return { ok: s.phase === 'event', cost: 0 };
    case 'resolveKiller':
      return { ok: s.phase === 'killer', cost: 0 };
    case 'move':
      if (!neighbors(c, h.loc).includes(a.to)) return { ok: false, why: 'Not adjacent', cost: 0 };
      return afford(s, moveCost(c, s, a.to));
    case 'answer':
      if (s.env.ringing !== h.loc) return { ok: false, why: 'No phone ringing here', cost: 1 };
      return afford(s, c.heroine.traits.freeAnswer ? 0 : 1);
    case 'playCard': {
      const card = s.actionHand.find((x) => x.uid === a.uid);
      if (!card) return { ok: false, why: 'Not in hand', cost: 0 };
      const d = actionDef(c, card.id);
      if (d.junk === 'wound') return { ok: false, why: 'Bleeding: rest or heal to clear it', cost: 0 };
      const cost = cardCost(c, d);
      const b = baseCheck(c, s, d);
      if (!b.ok) return { ok: false, why: b.why, cost };
      return afford(s, cost);
    }
    case 'useItem': {
      const it = h.items.find((i) => i.uid === a.uid);
      if (!it) return { ok: false, why: 'No such item', cost: 0 };
      const d = itemDef(c, it.id);
      if (!d.use) return { ok: false, why: d.kind === 'weapon' ? 'Used automatically when you fight' : 'Passive', cost: 0 };
      if (d.use.when === 'killerHere' && !killerHere) return { ok: false, why: 'The killer must be here', cost: 0 };
      if (d.use.when === 'atNode' && h.loc !== d.use.node)
        return { ok: false, why: `Only at ${nodeName(c, d.use.node!)}`, cost: 0 };
      return { ok: true, cost: 0 };
    }
    case 'dropItem':
      return { ok: h.items.some((i) => i.uid === a.uid), cost: 0 };
    case 'playInstinct':
      return { ok: h.hand.some((i) => i.uid === a.uid), cost: 0 };
    case 'endTurn':
      return { ok: true, cost: 0 };
  }
}

export function fightDice(c: Content, s: GameState) {
  const weapons = s.heroine.items.map((i) => itemDef(c, i.id)).filter((d) => d.fightDice);
  const best = Math.max(0, ...weapons.map((w) => w.fightDice ?? 0));
  return BASE_DICE.fight + best + (c.heroine.traits.fightDice ?? 0) + (s.mods.fightDice ?? 0);
}
export function searchDice(c: Content, s: GameState) {
  const tools = s.heroine.items.map((i) => itemDef(c, i.id));
  const bonus = Math.max(0, ...tools.map((t) => t.searchDice ?? 0));
  return BASE_DICE.search + bonus + (c.heroine.traits.searchDice ?? 0) + (s.mods.searchDice ?? 0);
}
export function threshold(s: GameState) {
  return horrorTier(s.heroine.horror).threshold;
}

// ── Reducer ─────────────────────────────────────────────────────────────────
export function dispatch(c: Content, prev: GameState, a: Action): GameState {
  const chk = check(c, prev, a);
  if (!chk.ok) return prev;
  const s: GameState = structuredClone(prev);
  s.fx = [];
  const h = s.heroine;
  const k = s.killer;
  const spend = (n: number) => {
    if (n <= 0) return;
    const before = h.spentThisRound;
    h.nerve -= n;
    h.spentThisRound += n;
    const marks = Math.floor(h.spentThisRound / NOISE_EVERY) - Math.floor(before / NOISE_EVERY);
    for (let i = 0; i < marks; i++) makeNoise(c, s);
  };
  const breakCover = () => (h.hidden = false);

  switch (a.type) {
    case 'resolveEvent': {
      const ev = eventDef(c, s.currentEvent!);
      log(s, `◆ ${ev.name}`, ev.tone === 'calm' ? 'info' : 'killer');
      s.phase = 'action';
      const gain = Math.max(1, horrorTier(h.horror).nerve + (s.mods.nerve ?? 0));
      h.nerve = Math.min(NERVE_CAP, h.nerve + gain);
      drawActions(s);
      applyEffects(c, s, ev.effects);
      s.eventDiscard.push(ev.id);
      s.currentEvent = undefined;
      break;
    }
    case 'answer': {
      spend(c.heroine.traits.freeAnswer ? 0 : 1);
      s.env.ringing = undefined;
      log(s, '☎ She answers. Breathing… then a calm voice tells her exactly where it is going next. She hangs up first.', 'good');
      addHorror(c, s, 1);
      drawInstinct(s, 2);
      break;
    }
    case 'move': {
      const cost = moveCost(c, s, a.to);
      if (h.freeMoves > 0 && cost <= (isFlooded(c, s, a.to) ? 1 : 0)) h.freeMoves--;
      spend(cost);
      breakCover();
      const from = h.loc;
      h.loc = a.to;
      h.movedThisRound++;
      s.fx.push({ t: 'move' });
      log(s, `${from === k.loc ? 'Fled' : 'Moved'} to ${nodeName(c, a.to)}${h.escorting ? ` with ${h.escorting} in tow` : ''}.`);
      saveEscorted(c, s);
      if (k.loc === h.loc) {
        s.fx.push({ t: 'killerAppears' });
        log(s, `${c.killer.name} is HERE.`, 'killer');
        addHorror(c, s, 1);
      }
      break;
    }
    case 'playCard': {
      const idx = s.actionHand.findIndex((x) => x.uid === a.uid);
      const card = s.actionHand[idx];
      const d = actionDef(c, card.id);
      s.actionHand.splice(idx, 1);
      if (d.junk === 'panic') {
        spend(1);
        s.actionDiscard.push(card.id);
        log(s, 'She forces the panic down.', 'good');
        break;
      }
      s.actionDiscard.push(card.id);
      const bonus = d.dice ?? 0;
      const cost = cardCost(c, d);
      switch (d.base) {
        case 'search': {
          spend(cost);
          breakCover();
          s.searches[h.loc]--;
          const thr = threshold(s) + (s.mods.searchThreshold ?? 0);
          const r = rollDice(s, d.name, searchDice(c, s) + bonus, Math.min(6, thr));
          if (r.successes === 0) log(s, 'Searched… nothing useful.');
          else applyEffect(c, s, { op: 'drawItem', n: Math.min(2, r.successes) });
          break;
        }
        case 'lead': {
          spend(cost);
          breakCover();
          const cap = c.heroine.traits.escortCap ?? DEFAULT_ESCORT;
          const n = Math.min(s.victims[h.loc], cap - h.escorting);
          s.victims[h.loc] -= n;
          if (!s.victims[h.loc]) s.panic[h.loc] = 0;
          h.escorting += n;
          log(s, `"Stay close to me." ${n} survivor${n > 1 ? 's' : ''} follow${n > 1 ? '' : 's'} her.`, 'good');
          break;
        }
        case 'fight': {
          spend(cost);
          breakCover();
          const r = rollDice(s, d.name, fightDice(c, s) + bonus, threshold(s));
          const held = h.items
            .map((i) => ({ i, d: itemDef(c, i.id) }))
            .filter((x) => x.d.fightDice)
            .sort((x, y) => (y.d.fightDice ?? 0) - (x.d.fightDice ?? 0))[0];
          if (held && held.i.usesLeft !== undefined) {
            held.i.usesLeft--;
            if (held.i.usesLeft <= 0) {
              h.items = h.items.filter((x) => x.uid !== held.i.uid);
              log(s, `${held.d.name} is spent.`);
            }
          }
          s.mods.fightDice = 0;
          if (r.successes === 0) log(s, 'She swings wild — and misses.', 'bad');
          damageKiller(c, s, r.successes);
          break;
        }
        case 'hide': {
          spend(cost);
          const auto = d.auto || (s.mods.hideAuto ?? 0) > 0;
          const r = auto ? null : rollDice(s, d.name, BASE_DICE.hide + bonus + (c.heroine.traits.hideDice ?? 0) + (s.mods.hideDice ?? 0), threshold(s));
          if (auto || (r && r.successes > 0)) {
            h.hidden = true;
            s.fx.push({ t: 'hide' });
            log(s, 'She slips into the shadows. Hidden.', 'good');
          } else log(s, 'No cover — still exposed.', 'bad');
          break;
        }
        case 'barricade':
          spend(cost);
          breakCover();
          applyEffect(c, s, { op: 'barricade', at: 'here', strength: c.heroine.traits.barricadeStrength ?? 1 });
          break;
        case 'rest': {
          spend(cost);
          breakCover();
          if (removeJunk(s, 'junk-wound')) log(s, 'She binds the worst of it.', 'good');
          const r = rollDice(s, d.name, BASE_DICE.rest + bonus, threshold(s));
          for (let i = 0; i < r.successes; i++) {
            if (h.health < h.maxHealth) {
              h.health++;
              removeJunk(s, 'junk-wound');
            } else addHorror(c, s, -1);
          }
          log(s, r.successes ? `Catches her breath (${r.successes}).` : 'Too wired to rest.', r.successes ? 'good' : 'bad');
          break;
        }
        case 'effect':
          spend(cost);
          log(s, `${d.name}.`, 'good');
          applyEffects(c, s, d.effects ?? []);
          break;
      }
      break;
    }
    case 'useItem': {
      const it = h.items.find((i) => i.uid === a.uid)!;
      const d = itemDef(c, it.id);
      log(s, `Used ${d.name}.`, 'good');
      if (it.usesLeft !== undefined) {
        it.usesLeft--;
        if (it.usesLeft <= 0) h.items = h.items.filter((x) => x.uid !== it.uid);
      }
      applyEffects(c, s, d.use!.effects);
      break;
    }
    case 'dropItem':
      h.items = h.items.filter((x) => x.uid !== a.uid);
      break;
    case 'playInstinct': {
      const card = h.hand.find((i) => i.uid === a.uid)!;
      const d = instinctDef(c, card.id);
      h.hand = h.hand.filter((x) => x.uid !== a.uid);
      s.instinctDiscard.push(card.id);
      log(s, `Instinct: ${d.name}.`, 'good');
      applyEffects(c, s, d.effects);
      break;
    }
    case 'endTurn':
      s.phase = 'killer';
      ruleBeforeKiller(c, s);
      killerTurn(c, s);
      break;
    case 'resolveKiller':
      endRound(c, s);
      break;
  }
  return s;
}

// ── Killer AI ───────────────────────────────────────────────────────────────
export function killerTarget(c: Content, s: GameState): NodeId {
  const k = s.killer;
  if (k.lured) return k.lured;
  const d = distances(c, k.loc);
  const cands: { id: NodeId; dist: number; pri: number }[] = [];
  for (const [id, n] of Object.entries(s.victims)) if (n > 0) cands.push({ id, dist: d[id] ?? 99, pri: 1 });
  if (!s.heroine.hidden || k.finale) cands.push({ id: s.heroine.loc, dist: d[s.heroine.loc] ?? 99, pri: k.finale ? -5 : 0 });
  if (!cands.length) return k.loc;
  cands.sort((a, b) => a.dist + a.pri * 0.1 - (b.dist + b.pri * 0.1));
  return cands[0].id;
}

function killerTurn(c: Content, s: GameState) {
  const k = s.killer;
  const h = s.heroine;
  const name = c.killer.name;
  if (k.stunned > 0) {
    k.stunned--;
    log(s, `${name} staggers, dazed. He loses his turn.`, 'good');
    return;
  }
  let exposed = !h.hidden;
  if (k.loc === h.loc && h.hidden) {
    // He searches the room. Hiding buys a chance, not a guarantee.
    const need = k.finale ? 4 : 5;
    const r = rollD6(s);
    if (r >= need) {
      h.hidden = false;
      exposed = true;
      log(s, `${name} tears the room apart… and finds her.`, 'killer');
      s.fx.push({ t: 'killerAppears' });
    }
  }
  if (k.loc === h.loc && exposed) {
    killerAttack(c, s);
    return;
  }
  if ((s.victims[k.loc] ?? 0) > 0) {
    const n = Math.min(s.victims[k.loc], k.frenzy ? 2 : 1);
    s.victims[k.loc] -= n;
    s.slain += n;
    log(s, `${name} butchers ${n === 1 ? 'a survivor' : `${n} survivors`} at ${nodeName(c, k.loc)}.`, 'killer');
    s.fx.push({ t: 'victimSlain', at: k.loc });
    if (k.loc === h.loc || neighbors(c, h.loc).includes(k.loc)) addHorror(c, s, 1);
    addBloodlust(c, s, 2 * n);
    return;
  }
  if (k.loc === h.loc && h.hidden) {
    log(s, `${name} stands inches away… and passes her by.`, 'info');
  }
  const target = killerTarget(c, s);
  k.lured = undefined;
  const speed = killerSpeed(c, s);
  for (let i = 0; i < speed && k.loc !== target; i++) {
    if (!moveKiller(c, s, stepToward(c, k.loc, target))) break;
    if (k.loc === h.loc || (s.victims[k.loc] ?? 0) > 0) break;
  }
  log(s, `${name} prowls to ${nodeName(c, k.loc)}.`, 'killer');
  if (k.loc === h.loc && !h.hidden) {
    s.fx.push({ t: 'killerAppears' });
    log(s, `He's found her.`, 'killer');
    addHorror(c, s, 1);
  }
}

function killerAttack(c: Content, s: GameState) {
  const h = s.heroine;
  const r = rollDice(s, `${c.killer.name} attacks`, killerAttackDice(c, s), c.killer.attackThreshold);
  const hits = Math.max(0, r.successes - (s.mods.brace ?? 0));
  if (hits === 0) {
    log(s, `${c.killer.name} lunges — she twists away!`, 'good');
    return;
  }
  log(s, `${c.killer.name} strikes: ${hits} wound${hits > 1 ? 's' : ''}.`, 'bad');
  wound(c, s, hits);
  if (s.outcome) return;
  addHorror(c, s, 1);
  if (hits >= 2 && h.escorting > 0) {
    h.escorting--;
    s.slain++;
    log(s, 'In the chaos, one of her survivors is cut down.', 'killer');
    s.fx.push({ t: 'victimSlain', at: h.loc });
    addBloodlust(c, s, 2);
  }
}

// ── Scoring ─────────────────────────────────────────────────────────────────
export function score(s: GameState) {
  const base = s.outcome === 'slain' ? 100 : s.outcome === 'survived' ? 50 : 0;
  return Math.max(0, base + s.saved * 15 - s.slain * 5 + s.heroine.health * 5);
}

export function rating(s: GameState): { stars: number; blurb: string } {
  const sc = score(s);
  if (s.outcome === 'died') return { stars: 1, blurb: 'Straight to video.' };
  if (sc >= 190) return { stars: 5, blurb: 'A midnight-movie legend.' };
  if (sc >= 150) return { stars: 4, blurb: 'Cult classic.' };
  if (sc >= 100) return { stars: 3, blurb: 'Solid double feature.' };
  return { stars: 2, blurb: 'She made it. Barely.' };
}
