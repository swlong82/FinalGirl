import { nextRand, pick, rollD6, shuffle } from './rng';
import type {
  Action,
  ActionCardDef,
  Condition,
  Content,
  Difficulty,
  DiceRoll,
  Effect,
  EventDef,
  GameState,
  HeldItem,
  ItemDef,
  LogEntry,
  ModKey,
  NodeId,
  NodeTag,
  TieBreak,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// LAST LIGHT v1.0 rules engine.
// Turn = Action → Planning → Killer → Panic → Upkeep. Every effect runs through
// one ordered queue; a player decision (move route, dice conversion, search
// pick, reaction) pauses the queue as `pending` until the player answers.
// ─────────────────────────────────────────────────────────────────────────────

// ── Tunables ────────────────────────────────────────────────────────────────
export const HAND_LIMIT = 10;
export const HAND_SLOTS = 2;
export const MAX_HORROR = 6;
export const DEFAULT_ESCORT = 2;
export const VICTIM_POOL = 16;
export const SETUP_SURVIVORS = 2; // survivors on each setup-card spot at the start
export const UPKEEP_ARRIVALS = 1; // survivors who wander in every Upkeep, until the supply runs out
export const TERROR_DEAL = 10;
export const PILE_SIZE = 4;
export const CONVERT_COST = 2; // cards discarded to turn a partial into a success
export const MAX_BUYUPS = 1; // partials that can be bought up in one roll

export interface DifficultyDef {
  label: string;
  text: string;
  nerve: number; // Nerve each Planning phase resets to
  track: number[]; // Horror Level 0..6 → dice in a Horror Roll
  heroineTokens: number[]; // her hidden final-health token is drawn from these (0 = blank)
  killerTokens: number[];
  killerHp: number;
  attack: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyDef> = {
  story: {
    label: 'Matinee',
    text: '6 nerve a turn, a gentler Horror track, a better final-health token for her and a worse one for {him}.',
    nerve: 6,
    track: [4, 4, 3, 3, 2, 2, 2],
    heroineTokens: [1, 2, 3],
    killerTokens: [0, 0, 2, 3],
    killerHp: -4,
    attack: 0,
  },
  standard: {
    label: 'Midnight Show',
    text: 'The intended experience. 5 nerve a turn.',
    nerve: 5,
    track: [3, 3, 3, 2, 2, 2, 2],
    heroineTokens: [0, 1, 2, 3],
    killerTokens: [0, 2, 3, 4],
    killerHp: -2,
    attack: 0,
  },
  nightmare: {
    label: 'Nightmare',
    text: '4 nerve a turn, a harsh Horror track, and {he} is very hard to keep down.',
    nerve: 4,
    track: [3, 3, 2, 2, 2, 2, 1],
    heroineTokens: [0, 1, 1, 2],
    killerTokens: [2, 2, 3, 4],
    killerHp: -1,
    attack: 0,
  },
};

export const TIEBREAK: Record<TieBreak, { label: string; text: string }> = {
  adverse: { label: 'Player-adverse', text: 'When the rules leave a genuine tie, the outcome least favorable to you happens: {he} goes for you, takes the route toward you, kills the named survivor first.' },
  plausible: { label: 'Most plausible', text: 'Ties go to what fits the story: {he} keeps after the target {he} was already chasing, stays on familiar ground near {his} lair, and cuts down the anonymous crowd before the people with names.' },
  comedic: { label: 'Comedic', text: 'Ties go to the funniest outcome: {he} wanders after the farthest option, takes the long way round, and always gets the guy who was two days from retirement. Every tie comes with a pratfall in the Script.' },
  random: { label: 'Unpredictable', text: 'Genuine ties are settled by a seeded coin flip (still replayable).' },
};

const GAGS = [
  '{He} stops, looks both ways, and flips an imaginary coin.',
  '{He} walks face-first into a hanging sign, recovers, and pretends that was the plan.',
  '{He} stands perfectly still for a full ten seconds, deciding. Somewhere, a cricket chirps.',
  '{He} trips over a garden hose that was definitely not there before.',
  '{He} pauses to adjust {his} mask in a reflection. It takes a while.',
  '{He} starts one way, stops, sighs audibly, and turns around.',
];

/** Order tied options by the tie-break policy (most preferred first). */
function tieOrder(c: Content, s: GameState, opts: NodeId[], kind: 'target' | 'path'): NodeId[] {
  const h = s.heroine;
  const sorted = [...opts].sort();
  switch (s.tiebreak) {
    case 'random':
      return [pick(s, sorted)];
    case 'adverse': {
      const dh = distances(c, h.loc);
      return sorted.sort((a, b) => Number(b === h.loc) - Number(a === h.loc) || (dh[a] ?? 99) - (dh[b] ?? 99));
    }
    case 'plausible': {
      const dl = distances(c, c.location.lair);
      const prev = s.killer.target;
      return sorted.sort((a, b) => (kind === 'target' ? Number(b === prev) - Number(a === prev) : 0) || (dl[a] ?? 99) - (dl[b] ?? 99));
    }
    case 'comedic': {
      const dh = distances(c, h.loc);
      return sorted.sort((a, b) => Number(a === h.loc) - Number(b === h.loc) || (dh[b] ?? 99) - (dh[a] ?? 99));
    }
  }
}

function logTieBreak(s: GameState, what: string) {
  const label = TIEBREAK[s.tiebreak].label.toLowerCase();
  if (s.tiebreak === 'comedic') log(s, `Tie-break (${label}): ${pick(s, GAGS)} Then ${what}.`, 'info');
  else log(s, `Tie-break (${label}): ${what}.`, 'info');
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
export function actionDef(c: Content, id: string): ActionCardDef {
  const d = c.actions.find((a) => a.id === id);
  if (!d) throw new Error(`Unknown action card ${id}`);
  return d;
}
export function allTerror(c: Content): EventDef[] {
  return [...c.location.terror, ...c.killer.terror];
}
export function terrorDef(c: Content, id: string): EventDef {
  const d = allTerror(c).find((e) => e.id === id);
  if (!d) throw new Error(`Unknown terror card ${id}`);
  return d;
}
export function eventDef(c: Content, id: string): EventDef {
  const d = c.location.events.find((e) => e.id === id);
  if (!d) throw new Error(`Unknown event ${id}`);
  return d;
}
export function nodeName(c: Content, id: NodeId): string {
  return c.location.nodes.find((n) => n.id === id)?.name ?? id;
}
export function nodeDef(c: Content, id: NodeId) {
  return c.location.nodes.find((n) => n.id === id)!;
}
export function hasTag(c: Content, node: NodeId, tag: NodeTag) {
  return !!nodeDef(c, node)?.tags?.includes(tag);
}
export function isExit(c: Content, node: NodeId) {
  return !!nodeDef(c, node)?.exit;
}
export function exits(c: Content): NodeId[] {
  return c.location.nodes.filter((n) => n.exit).map((n) => n.id);
}
export function isSearch(c: Content, node: NodeId) {
  return !!nodeDef(c, node)?.search;
}
export function isFlooded(c: Content, s: GameState, node: NodeId) {
  return c.location.rule.kind === 'tide' && s.env.tideHigh && hasTag(c, node, 'shore');
}

// ── Graph ───────────────────────────────────────────────────────────────────
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

/** Panic table for a location: die face 1–6 → neighbor (null = the survivor freezes). */
export function panicTable(c: Content, node: NodeId): (NodeId | null)[] {
  const def = nodeDef(c, node);
  if (def.panic) return def.panic;
  const nb = neighbors(c, node).sort();
  if (!nb.length) return [null, null, null, null, null, null];
  return [null, ...Array.from({ length: 5 }, (_, i) => nb[i % nb.length])];
}

// ── Setup ───────────────────────────────────────────────────────────────────
function expand<T extends { id: string; copies?: number }>(defs: T[]): string[] {
  return defs.flatMap((d) => Array(d.copies ?? 1).fill(d.id));
}

export function newGame(c: Content, seed: number, difficulty: Difficulty = 'standard', tiebreak: TieBreak = 'adverse'): GameState {
  const dm = DIFFICULTY[difficulty];
  const kHp = c.killer.health + dm.killerHp - 1;
  const s: GameState = {
    version: 2,
    seed,
    rng: seed >>> 0,
    uid: 1,
    packs: { location: c.location.id, killer: c.killer.id, heroine: c.heroine.id },
    difficulty,
    tiebreak,
    round: 1,
    phase: 'action',
    heroine: {
      loc: c.location.setups[0].heroine,
      health: c.heroine.health - 1,
      maxHealth: c.heroine.health - 1,
      token: 0,
      horror: c.killer.horror,
      nerve: dm.nerve,
      hand: [],
      items: [],
      pack: [],
      hidden: false,
      rescued: 0,
      resolve: 0,
      abilityUsed: false,
      movesThisTurn: 0,
      horrorTakenThisTurn: 0,
      broke: false,
      leave: [],
      bring: c.heroine.traits.escortCap ?? DEFAULT_ESCORT,
    },
    killer: {
      loc: c.location.lair,
      health: kHp,
      maxHealth: kHp,
      token: 0,
      bloodlust: 0,
      stunned: 0,
      finale: false,
      power: 'hidden',
      powerHealth: 0,
      attackBonus: dm.attack,
    },
    victims: Object.fromEntries(c.location.nodes.map((n) => [n.id, 0])),
    specials: [],
    specialsGone: [],
    minions: [],
    barricades: Object.fromEntries(c.location.nodes.map((n) => [n.id, 0])),
    saved: 0,
    slain: 0,
    slainThisTurn: 0,
    victimPool: VICTIM_POOL,
    mods: {},
    tableau: {},
    discard: [],
    terrorDeck: [],
    terrorDiscard: [],
    eventDeck: [],
    events: [],
    piles: {},
    spare: [],
    queue: [],
    rearrange: false,
    env: { tideHigh: false, dark: false, cold: 0 },
    foundLore: [],
    log: [],
    fx: [],
  };
  // Setup card, hidden final-health tokens.
  const setup = pick(s, c.location.setups);
  s.heroine.loc = setup.heroine;
  s.killer.loc = setup.killer;
  s.heroine.token = pick(s, dm.heroineTokens);
  s.killer.token = pick(s, dm.killerTokens);
  // Action cards: starters in hand, everything else in the tableau.
  for (const a of c.actions) {
    s.tableau[a.id] = a.copies;
    if (a.starter) {
      s.tableau[a.id]--;
      s.heroine.hand.push({ uid: s.uid++, id: a.id });
    }
  }
  // Terror deck: 10 of the killer + location cards.
  s.terrorDeck = shuffle(s, expand(allTerror(c))).slice(0, TERROR_DEAL);
  // Item piles: one per search location, lore always included.
  const searchNodes = c.location.nodes.filter((n) => n.search).map((n) => n.id);
  const lore = expand(c.killer.items);
  const pool = shuffle(s, expand(c.location.items));
  const dealt = shuffle(s, [...pool.slice(0, Math.max(0, searchNodes.length * PILE_SIZE - lore.length)), ...lore]);
  s.spare = pool.slice(Math.max(0, searchNodes.length * PILE_SIZE - lore.length));
  searchNodes.forEach((n, i) => (s.piles[n] = { cards: dealt.filter((_, j) => j % searchNodes.length === i), up: true }));
  for (const at of setup.npcs) placeVictims(c, s, at, SETUP_SURVIVORS);
  ruleSetup(c, s);
  log(s, `The feature begins. ${c.heroine.name} is at ${nodeName(c, s.heroine.loc)}. ${c.killer.name} waits at ${nodeName(c, s.killer.loc)}.`, 'info');
  // Reveal one ongoing Event.
  s.eventDeck = shuffle(s, expand(c.location.events));
  revealEvent(c, s);
  drain(c, s);
  s.fx = [];
  return s;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function log(s: GameState, text: string, tone?: LogEntry['tone']) {
  s.log.push({ round: s.round, text, tone });
  if (s.log.length > 240) s.log.splice(0, s.log.length - 240);
}

function placeVictims(c: Content, s: GameState, at: NodeId, n: number): number {
  const k = Math.min(n, s.victimPool);
  if (k <= 0) return 0;
  s.victimPool -= k;
  s.victims[at] = (s.victims[at] ?? 0) + k;
  log(s, `${k === 1 ? 'A survivor stumbles' : `${k} survivors stumble`} into ${nodeName(c, at)}.`, 'info');
  return k;
}

export function mod(c: Content, s: GameState, key: ModKey): number {
  let n = s.mods[key] ?? 0;
  for (const id of s.events) n += eventDef(c, id).ongoing?.[key] ?? 0;
  return n;
}

function pushFront(s: GameState, effs: Effect[]) {
  if (effs.length) s.queue.unshift(...effs);
}

export function canAct(s: GameState) {
  return s.phase === 'action' && !s.outcome && !s.pending;
}

export function escortCap(c: Content) {
  return c.heroine.traits.escortCap ?? DEFAULT_ESCORT;
}

export function abilityUnlocked(c: Content, s: GameState) {
  return s.heroine.rescued >= c.heroine.rescue.slots.length;
}

// ── Items & inventory ───────────────────────────────────────────────────────
export function handsUsed(c: Content, items: HeldItem[]) {
  return items.reduce((n, i) => n + itemDef(c, i.id).hands, 0);
}

/** Items that work right now: anything in hand, plus anything that needs no hands. */
export function activeItems(c: Content, s: GameState): HeldItem[] {
  return [...s.heroine.items, ...s.heroine.pack.filter((i) => itemDef(c, i.id).hands === 0)];
}

function gainItem(c: Content, s: GameState, id: string) {
  const d = itemDef(c, id);
  const it: HeldItem = { uid: s.uid++, id, usesLeft: d.uses };
  if (d.hands > 0 && handsUsed(c, s.heroine.items) + d.hands <= HAND_SLOTS) s.heroine.items.push(it);
  else s.heroine.pack.push(it);
  s.rearrange = true; // gaining an item is one of the two moments she may rearrange
  log(s, `Found: ${d.name}.`, 'good');
  s.fx.push({ t: 'item' });
  if (d.lore && !s.foundLore.includes(d.id)) s.foundLore.push(d.id);
  if (d.onGain) pushFront(s, d.onGain);
}

function spendUse(c: Content, s: GameState, it: HeldItem) {
  if (it.usesLeft === undefined) return;
  it.usesLeft--;
  if (it.usesLeft <= 0) {
    s.heroine.items = s.heroine.items.filter((x) => x.uid !== it.uid);
    s.heroine.pack = s.heroine.pack.filter((x) => x.uid !== it.uid);
    log(s, `${itemDef(c, it.id).name} is used up.`);
  }
}

/** Best weapon in hand that reaches `range`. */
export function bestWeapon(c: Content, s: GameState, range: number): HeldItem | undefined {
  return s.heroine.items
    .filter((i) => {
      const d = itemDef(c, i.id);
      return d.damage && (d.range ?? [0]).includes(range) && (i.usesLeft === undefined || i.usesLeft > 0);
    })
    .sort((a, b) => (itemDef(c, b.id).damage ?? 0) - (itemDef(c, a.id).damage ?? 0))[0];
}

export function loreBonus(c: Content, s: GameState) {
  return c.killer.items.filter((i) => s.foundLore.includes(i.id)).length;
}

// ── Horror Rolls ────────────────────────────────────────────────────────────
export function horrorDice(s: GameState): number {
  const track = DIFFICULTY[s.difficulty].track;
  return track[Math.max(0, Math.min(track.length - 1, s.heroine.horror))];
}

/** Where every die in a Horror Roll comes from (for the roll and for the UI). */
export function rollBreakdown(c: Content, s: GameState, d: ActionCardDef): { total: number; parts: [string, number][] } {
  const h = s.heroine;
  const t = c.heroine.traits;
  const parts: [string, number][] = [[`horror ${h.horror}`, horrorDice(s)]];
  const add = (label: string, n: number) => {
    if (n) parts.push([label, n]);
  };
  /** A modifier split into its named sources: each ongoing Event, plus this turn's effects. */
  const addMod = (key: ModKey) => {
    for (const id of s.events) add(eventDef(c, id).name, eventDef(c, id).ongoing?.[key] ?? 0);
    add('this turn', s.mods[key] ?? 0);
  };
  add('card', d.dice ?? 0);
  addMod('rollDice');
  if (d.tags.includes('search')) {
    add(c.heroine.passive.name, t.searchDice ?? 0);
    add('tool', Math.max(0, ...s.heroine.items.map((i) => itemDef(c, i.id).searchDice ?? 0)));
    addMod('searchDice');
    add('blackout', s.env.dark ? -1 : 0);
  }
  if (d.tags.includes('attack')) {
    add(c.heroine.passive.name, t.attackDice ?? 0);
    add('Resolve', h.resolve);
    addMod('attackDice');
  }
  if (d.tags.includes('hide')) {
    add(c.heroine.passive.name, t.hideDice ?? 0);
    addMod('hideDice');
    add('blackout', s.env.dark ? 1 : 0);
  }
  if (d.kind === 'reaction') add(c.heroine.passive.name, t.reactDice ?? 0);
  if (d.tags.includes('move')) add(c.heroine.passive.name, t.moveDice ?? 0);
  return { total: Math.max(1, parts.reduce((n, [, v]) => n + v, 0)), parts };
}

export function rollPool(c: Content, s: GameState, d: ActionCardDef): number {
  return rollBreakdown(c, s, d).total;
}

/** Light attacks (Shove, Swing) take no weapon, lore or focus bonus: those reward the heavy cards. */
function lightAttack(c: Content, s: GameState) {
  return !!(s.rolling && actionDef(c, s.rolling.card).light);
}

function summarize(s: GameState, label: string, dice: number[], converted: number[], rerolled: boolean): DiceRoll {
  const successes = dice.filter((d) => d >= 5).length + converted.length;
  const partials = dice.filter((d, i) => d >= 3 && d <= 4 && !converted.includes(i)).length;
  const band = successes >= 2 ? 'great' : successes === 1 ? 'good' : 'fail';
  return { id: s.uid++, label, dice, converted, successes, partials, band, rerolled };
}

export function canConvert(s: GameState): boolean {
  const r = s.rolling;
  if (!r) return false;
  const any = r.dice.some((d, i) => d >= 3 && d <= 4 && !r.converted.includes(i));
  return any && r.converted.length < MAX_BUYUPS && s.heroine.hand.length >= CONVERT_COST;
}

function startRoll(c: Content, s: GameState, cardUid: number, d: ActionCardDef, reaction: boolean) {
  const n = rollPool(c, s, d);
  let dice = Array.from({ length: n }, () => rollD6(s));
  let rerolled = false;
  if ((s.mods.rerollNext ?? 0) > 0) {
    s.mods.rerollNext = (s.mods.rerollNext ?? 1) - 1;
    dice = dice.map((x) => (x >= 5 ? x : rollD6(s)));
    rerolled = true;
  }
  const range = s.heroine.loc === s.killer.loc ? 0 : (distances(c, s.heroine.loc)[s.killer.loc] ?? 99);
  s.rolling = { uid: cardUid, dice, converted: [], card: d.id, reaction, range };
  s.lastRoll = { ...summarize(s, d.name, dice, [], rerolled), parts: rollBreakdown(c, s, d).parts };
  s.fx.push({ t: 'dice' });
  if (canConvert(s)) s.pending = { kind: 'roll', card: d.id, reaction };
  else finishRoll(c, s);
}

function finishRoll(c: Content, s: GameState) {
  const r = s.rolling!;
  const d = actionDef(c, r.card);
  const roll = { ...summarize(s, d.name, r.dice, r.converted, !!s.lastRoll?.rerolled), parts: s.lastRoll?.parts };
  s.lastRoll = roll;
  s.pending = undefined;
  const effs = d[roll.band] ?? [];
  log(s, `${d.name}: ${roll.successes} success${roll.successes === 1 ? '' : 'es'}${r.converted.length ? ` (${r.converted.length} bought with cards)` : ''}.`, roll.band === 'fail' ? 'bad' : 'info');
  pushFront(s, [...effs, ...(r.reaction ? [{ op: '_reactDone' } as Effect] : [])]);
  // Keep the range for damage resolution until the card's effects are done.
}

// ── Horror, health, damage ──────────────────────────────────────────────────
export function addHorror(c: Content, s: GameState, n: number) {
  const h = s.heroine;
  if (n > 0 && c.heroine.traits.ignoreFirstHorror && h.horrorTakenThisTurn === 0 && s.phase === 'hunter') {
    h.horrorTakenThisTurn++;
    n -= 1;
    log(s, `${c.heroine.name} steadies herself. She's seen this movie before.`, 'good');
    if (n <= 0) return;
  }
  if (n > 0 && s.phase === 'hunter') h.horrorTakenThisTurn++;
  const before = h.horror;
  const raw = h.horror + n;
  h.horror = Math.max(0, Math.min(MAX_HORROR, raw));
  if (h.horror !== before) s.fx.push({ t: 'horror', n: h.horror - before });
  if (raw > MAX_HORROR) {
    log(s, 'Her terror spills over, and {he} feeds on it. (Bloodlust +1.)', 'killer');
    addBloodlust(c, s, raw - MAX_HORROR);
  } else if (raw < 0) {
    log(s, 'Perfectly calm. (+1 nerve.)', 'good');
    h.nerve += -raw;
  }
}

function hurtHeroine(c: Content, s: GameState, n: number) {
  const h = s.heroine;
  if (n <= 0) return;
  h.health -= n;
  s.fx.push({ t: 'wound', n });
  if (h.health > 0) return;
  const over = -h.health;
  h.health = 0;
  if (h.token === null) {
    s.down = { ...s.down, heroine: true };
    return;
  }
  if (over <= 0) {
    log(s, 'She is down to her last ounce of strength.', 'bad');
    return;
  }
  const t = h.token;
  h.token = null;
  if (t <= 0) {
    log(s, 'Her backup token is blank.', 'bad');
    s.down = { ...s.down, heroine: true };
    return;
  }
  h.health = Math.min(h.maxHealth, t);
  log(s, `She should be dead. She gets up anyway: her backup token was ${t}, so she's back on ${t} health. The current phase ends.`, 'good');
  s.fx.push({ t: 'revive', who: 'heroine', n: t });
  endCurrentPhase(c, s);
}

function hurtKiller(c: Content, s: GameState, n: number) {
  const k = s.killer;
  if (n <= 0) return;
  if (k.power === 'active' && k.powerHealth > 0) {
    const a = Math.min(n, k.powerHealth);
    k.powerHealth -= a;
    n -= a;
    log(s, `${c.killer.power.name} absorbs ${a}.`, 'info');
    if (k.powerHealth <= 0) {
      k.power = 'spent';
      log(s, `${c.killer.power.name} is broken. {He} loses that power.`, 'good');
    }
    s.fx.push({ t: 'hit', n: a });
    if (n <= 0) return;
  }
  k.health -= n;
  s.fx.push({ t: 'hit', n });
  log(s, `${c.killer.name} takes ${n} damage.`, 'good');
  if (k.health > 0) return;
  const over = -k.health;
  k.health = 0;
  if (k.token === null) {
    s.down = { ...s.down, killer: true };
    return;
  }
  if (over <= 0) {
    log(s, `${c.killer.name} drops to 0 and staggers. The next hit reveals the backup token.`, 'good');
    return;
  }
  const t = k.token;
  k.token = null;
  if (t <= 0) {
    s.down = { ...s.down, killer: true };
    return;
  }
  k.health = t;
  k.maxHealth = Math.max(k.maxHealth, t);
  log(s, `${c.killer.revive.name.toUpperCase()}: ${c.killer.revive.text} (Backup token: ${t}, back up with ${t} health.) The current phase ends.`, 'killer');
  s.fx.push({ t: 'revive', who: 'killer', n: t });
  endCurrentPhase(c, s);
  pushFront(s, c.killer.revive.effects);
}

/** Her attack: a weapon that reaches, lore and focus add to it, but only if it deals at least 1. */
function heroineAttack(c: Content, s: GameState, base: number) {
  if (base <= 0) {
    log(s, 'No damage.', 'bad');
    return;
  }
  const h = s.heroine;
  const range = h.loc === s.killer.loc ? 0 : (distances(c, h.loc)[s.killer.loc] ?? 99);
  const killerOk = range === 0 || !!bestWeapon(c, s, range);
  const minionsHere = minionsAt(s, h.loc).length > 0;
  // With both in reach she must choose: him, or the minions. Never both.
  // Against several minions she also chooses how to divide the damage.
  const mins = minionsAt(s, h.loc);
  const splitMatters = mins.length > 1 && minionDamage(c, s, base) < mins.reduce((n, m) => n + m.health, 0);
  if (minionsHere && (killerOk || splitMatters)) s.pending = { kind: 'aim', base, range, killer: killerOk };
  else if (killerOk) hitKiller(c, s, base, range);
  else if (minionsHere) hitMinions(c, s, base);
  else log(s, 'Out of reach.', 'bad');
}

function hitKiller(c: Content, s: GameState, base: number, range: number) {
  const card = s.rolling ? actionDef(c, s.rolling.card).name : 'Hit';
  if (lightAttack(c, s)) {
    damageBreakdown(s, [[card, base]], true);
    return hurtKiller(c, s, base);
  }
  // Where every point came from, so a 7-damage hit off "2 successes" makes sense.
  const parts: [string, number][] = [[card, base]];
  const w = bestWeapon(c, s, range);
  if (w) {
    const wd = itemDef(c, w.id).damage ?? 0;
    if (wd) parts.push([itemDef(c, w.id).name, wd]);
    if (!c.heroine.traits.durableWeapons) spendUse(c, s, w);
  }
  const lore = loreBonus(c, s);
  if (lore) parts.push([lore > 1 ? `${lore} lore items` : 'lore item', lore]);
  if (s.mods.damage) parts.push(['Psych Up', s.mods.damage]);
  s.mods.damage = 0;
  damageBreakdown(s, parts, false);
  hurtKiller(c, s, parts.reduce((n, [, v]) => n + v, 0));
}

function damageBreakdown(s: GameState, parts: [string, number][], light: boolean) {
  const total = parts.reduce((n, [, v]) => n + v, 0);
  if (parts.length > 1) log(s, `Damage ${total} = ${parts.map(([l, v]) => `${l} ${v}`).join(' + ')}.`, 'info');
  else if (light) log(s, `${parts[0][0]} is a light attack: weapons, lore and Psych Up don't add.`, 'info');
  s.fx.push({ t: 'damage', parts, light });
}

const SEQUENCING = new Set<Effect['op']>(['_strike', '_reactDone', '_clearMods', '_terror', '_phase', '_behavior', '_finaleCheck', '_rule', '_minion', '_minionsAll', 'minionsAct', 'enemiesAct', 'target', 'hunt', 'attack', 'move', 'search']);

function settle(c: Content, s: GameState) {
  if (!s.down || s.outcome) return;
  if (s.down.heroine && !s.down.killer) {
    // She is down, but the rest of the card or effect she is in still resolves:
    // if it takes him down too, both fell in the same resolution and she wins.
    s.pending = undefined;
    let guard = 0;
    while (s.queue.length && !SEQUENCING.has(s.queue[0].op) && !s.down.killer && guard++ < 50) exec(c, s, s.queue.shift()!);
  }
  endGame(c, s, s.down.killer ? 'slain' : 'died');
}

function endGame(c: Content, s: GameState, o: GameState['outcome']) {
  if (s.outcome) return;
  s.outcome = o;
  s.phase = 'over';
  s.pending = undefined;
  s.queue = [];
  if (o === 'died') {
    log(s, `${c.heroine.name} has fallen. The credits roll in silence.`, 'bad');
    s.fx.push({ t: 'lose' });
  } else {
    log(s, `${c.killer.name} is finished. It's over.`, 'good');
    s.fx.push({ t: 'win' });
  }
}

// ── Killer stats ────────────────────────────────────────────────────────────
export function bloodlustLevel(c: Content, s: GameState) {
  const lv = c.killer.bloodlust.levels;
  return lv[Math.max(0, Math.min(lv.length - 1, s.killer.bloodlust))];
}
export function killerAttack(c: Content, s: GameState) {
  const k = s.killer;
  return Math.max(
    0,
    bloodlustLevel(c, s).attack +
      (k.finale ? c.killer.finale.attack ?? 0 : 0) +
      (k.power === 'active' ? c.killer.power.attack ?? 0 : 0) +
      mod(c, s, 'killerAttack') +
      k.attackBonus,
  );
}
export function killerMoveValue(c: Content, s: GameState) {
  const k = s.killer;
  return Math.max(
    0,
    bloodlustLevel(c, s).move +
      (k.finale ? c.killer.finale.move ?? 0 : 0) +
      (k.power === 'active' ? c.killer.power.move ?? 0 : 0) +
      mod(c, s, 'killerMove') +
      (s.env.dark ? 1 : 0),
  );
}

function addBloodlust(c: Content, s: GameState, n: number) {
  const k = s.killer;
  const tr = c.killer.bloodlust;
  const effs: Effect[] = [];
  if (n < 0) {
    k.bloodlust = Math.max(0, k.bloodlust + n);
    return;
  }
  for (let i = 0; i < n; i++) {
    if (k.bloodlust < tr.levels.length - 1) {
      k.bloodlust++;
      const lv = tr.levels[k.bloodlust];
      s.fx.push({ t: 'bloodlust', level: k.bloodlust });
      log(s, `Bloodlust ${k.bloodlust}${lv.name ? `: ${lv.name}` : ''}. ${lv.text ?? ''} (Move ${lv.move}, attack ${lv.attack}.)`, 'killer');
      effs.push(...(lv.effects ?? []));
      if (k.bloodlust === tr.revealAt && k.power === 'hidden') effs.push({ op: 'revealPower' });
    } else {
      log(s, `{His} bloodlust is already at its peak. ${tr.max.text}`, 'killer');
      effs.push(...tr.max.effects);
    }
  }
  pushFront(s, effs);
}

function revealEvent(c: Content, s: GameState) {
  const id = s.eventDeck.shift();
  if (!id) return;
  const ev = eventDef(c, id);
  s.events.push(id);
  log(s, `EVENT: ${ev.name}. ${ev.text}`, ev.tone === 'calm' ? 'good' : 'killer');
  s.fx.push({ t: 'event', id });
  pushFront(s, ev.effects);
}

// ── Survivors ───────────────────────────────────────────────────────────────
// Survivors = ordinary survivors (a count per location) + named special survivors.
export function specialDef(c: Content, id: string) {
  const d = c.location.specials.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown special survivor ${id}`);
  return d;
}
export function specialsAt(s: GameState, node: NodeId) {
  return s.specials.filter((x) => x.at === node);
}
export function npcAt(s: GameState, node: NodeId) {
  return (s.victims[node] ?? 0) + specialsAt(s, node).length;
}
export function npcNodes(s: GameState): NodeId[] {
  const out = new Set(Object.entries(s.victims).filter(([, n]) => n > 0).map(([id]) => id));
  for (const x of s.specials) out.add(x.at);
  return [...out];
}
export function minionsAt(s: GameState, node: NodeId) {
  return s.minions.filter((m) => m.loc === node);
}
/** Where any enemy (the killer or a minion) stands. */
export function enemyNodes(s: GameState): NodeId[] {
  return [...new Set([s.killer.loc, ...s.minions.map((m) => m.loc)])];
}

function eliminate(c: Content, s: GameState, at: NodeId, by = c.killer.name) {
  const regular = s.victims[at] ?? 0;
  const named = specialsAt(s, at);
  if (regular + named.length <= 0) return;
  // Who dies first when a named survivor stands with the crowd is a genuine tie.
  let victim: string | null = null;
  if (named.length && !regular) victim = named[0].id;
  else if (named.length) {
    const pickNamed = s.tiebreak === 'adverse' || s.tiebreak === 'comedic' || (s.tiebreak === 'random' && nextRand(s) < 0.5);
    if (pickNamed) victim = named[0].id;
    logTieBreak(s, pickNamed ? `${specialDef(c, named[0].id).name} is the one ${by} reaches first` : `${by} reaches someone in the crowd before ${specialDef(c, named[0].id).name}`);
  }
  s.slain++;
  s.slainThisTurn++;
  s.fx.push({ t: 'victimSlain', at });
  if (s.heroine.loc === at) pushFront(s, [{ op: 'horror', n: 1 }]);
  if (victim) {
    const d = specialDef(c, victim);
    s.specials = s.specials.filter((x) => x.id !== victim);
    s.specialsGone.push({ id: victim, how: 'dead' });
    log(s, `${by} kills ${d.name} at ${nodeName(c, at)}.`, 'killer');
    pushFront(s, d.death);
  } else {
    s.victims[at]--;
    log(s, `${by} kills a survivor at ${nodeName(c, at)}.`, 'killer');
  }
  addBloodlust(c, s, 1);
}

/** On an exit during the Action phase: everyone there with her is rescued. */
function checkRescue(c: Content, s: GameState) {
  const h = s.heroine;
  if (s.phase !== 'action' || s.outcome || !isExit(c, h.loc)) return;
  const regular = s.victims[h.loc] ?? 0;
  const named = specialsAt(s, h.loc);
  const n = regular + named.length;
  if (n <= 0) return;
  s.victims[h.loc] = 0;
  s.specials = s.specials.filter((x) => x.at !== h.loc);
  s.saved += n;
  log(s, `${n === 1 ? 'A survivor gets' : `${n} survivors get`} out through ${nodeName(c, h.loc)}. Rescued!`, 'good');
  s.fx.push({ t: 'saved', n });
  const slots = c.heroine.rescue.slots;
  const effs: Effect[] = [];
  const fill = () => {
    const slot = h.rescued < slots.length ? slots[h.rescued] : c.heroine.rescue.repeat;
    h.rescued++;
    log(s, `Rescue reward: ${slot.text}`, 'good');
    effs.push(...slot.effects);
    if (h.rescued === slots.length) {
      log(s, `Every rescue slot is full. ${c.heroine.ability.name} is unlocked.`, 'good');
      s.fx.push({ t: 'unlock' });
    }
  };
  for (const x of named) {
    const d = specialDef(c, x.id);
    s.specialsGone.push({ id: x.id, how: 'rescued' });
    log(s, `${d.name} makes it out.`, 'good');
    fill();
    effs.push(...d.rescue);
  }
  for (let i = 0; i < regular; i++) fill();
  runNow(c, s, effs);
}

function panicAt(c: Content, s: GameState, at: NodeId) {
  const table = panicTable(c, at);
  const roll = (who: string) => {
    const r = rollD6(s);
    const to = table[r - 1];
    if (!to) log(s, `${who} at ${nodeName(c, at)} freezes in terror (rolled ${r}).`, 'info');
    else log(s, `${who} panics (rolled ${r}) and runs from ${nodeName(c, at)} to ${nodeName(c, to)}.`, 'bad');
    return to;
  };
  const n = s.victims[at] ?? 0;
  for (let i = 0; i < n; i++) {
    const to = roll('A survivor');
    if (!to) continue;
    s.victims[at]--;
    s.victims[to] = (s.victims[to] ?? 0) + 1;
  }
  for (const x of specialsAt(s, at)) {
    const d = specialDef(c, x.id);
    if (d.trait === 'still') {
      log(s, `${d.name} doesn't panic. ${d.text}`, 'info');
      continue;
    }
    const to = roll(d.name);
    if (to) x.at = to;
  }
}

/** Who would come with her from `from` to `to`: named survivors first, then the crowd, up to her limit. */
export function followPlan(c: Content, s: GameState, from: NodeId, to: NodeId): { specials: string[]; regular: number; count: number } {
  const none = { specials: [], regular: 0, count: 0 };
  if (to === s.killer.loc) return none; // they won't walk into him
  let room = Math.max(0, Math.min(s.heroine.bring, escortCap(c)));
  const specials: string[] = [];
  for (const x of specialsAt(s, from)) {
    if ((s.heroine.leave ?? []).includes(x.id)) continue; // she asked them to stay put
    const w = specialDef(c, x.id).trait === 'heavy' ? 2 : 1;
    if (w <= room) {
      specials.push(x.id);
      room -= w;
    }
  }
  const regular = Math.min(room, s.victims[from] ?? 0);
  return { specials, regular, count: specials.length + regular };
}

/** How many survivors would come with her from `from` to `to`. */
export function followers(c: Content, s: GameState, from: NodeId, to: NodeId) {
  return followPlan(c, s, from, to).count;
}

function moveHeroine(c: Content, s: GameState, to: NodeId) {
  const h = s.heroine;
  const from = h.loc;
  const plan = followPlan(c, s, from, to);
  s.victims[from] -= plan.regular;
  s.victims[to] = (s.victims[to] ?? 0) + plan.regular;
  for (const x of s.specials) if (plan.specials.includes(x.id)) x.at = to;
  h.loc = to;
  h.hidden = false;
  s.fx.push({ t: 'move' });
  const names = plan.specials.map((id) => specialDef(c, id).name);
  const who = [...names, ...(plan.regular ? [`${plan.regular} survivor${plan.regular > 1 ? 's' : ''}`] : [])].join(' and ');
  log(s, `Moved to ${nodeName(c, to)}${who ? ` with ${who}` : ''}.`);
  if (s.killer.loc === to) {
    s.fx.push({ t: 'killerAppears' });
    log(s, `${c.killer.name} is HERE.`, 'killer');
  }
}

/** Upkeep: named survivors' standing exceptions. */
function specialsUpkeep(c: Content, s: GameState) {
  const h = s.heroine;
  for (const x of [...s.specials]) {
    const d = specialDef(c, x.id);
    if (x.at === h.loc) continue; // with her, they stay with her
    if (d.trait === 'toExit') {
      if (isExit(c, x.at)) continue;
      const dist = (n: NodeId) => Math.min(...exits(c).map((e) => distances(c, n)[e] ?? 99));
      const next = neighbors(c, x.at)
        .filter((n) => n !== s.killer.loc && dist(n) < dist(x.at))
        .sort()[0];
      if (next) {
        x.at = next;
        log(s, `${d.name} heads for the exit: now at ${nodeName(c, next)}.`, 'info');
      }
    } else if (d.trait === 'wander') {
      const opts = neighbors(c, x.at).filter((n) => n !== s.killer.loc);
      if (opts.length) {
        x.at = pick(s, opts.sort());
        log(s, `${d.name} wanders off to ${nodeName(c, x.at)}.`, 'info');
      }
    } else if (d.trait === 'loud') {
      log(s, `${d.name} is making a racket at ${nodeName(c, x.at)}. ${c.killer.name} will go for the noise.`, 'killer');
      s.killer.lured = x.at;
    }
  }
}

/** Resolve a spawn location keyword. */
function spawnSpot(c: Content, s: GameState, at: NodeId | 'random' | 'farFromKiller' | 'nearKiller' | 'awayFromKiller'): NodeId {
  const k = s.killer;
  const h = s.heroine;
  const ex = exits(c);
  let spot = at;
  if (spot === 'random') spot = pick(s, c.location.nodes.map((n) => n.id).filter((id) => id !== k.loc && !ex.includes(id)));
  else if (spot === 'awayFromKiller') {
    // Somewhere at least 2 steps from him, not an exit and not where she stands.
    const d = distances(c, k.loc);
    const opts = c.location.nodes.map((n) => n.id).filter((id) => (d[id] ?? 0) >= 2 && !ex.includes(id) && id !== h.loc);
    spot = opts.length ? pick(s, opts) : spawnSpot(c, s, 'farFromKiller');
  } else if (spot === 'nearKiller') {
    const opts = neighbors(c, k.loc).filter((id) => !ex.includes(id) && id !== h.loc);
    spot = opts.length ? pick(s, opts) : k.loc;
  } else if (spot === 'farFromKiller') {
    const d = distances(c, k.loc);
    spot = c.location.nodes
      .map((n) => n.id)
      .filter((id) => !ex.includes(id))
      .sort((a, b) => (d[b] ?? 0) - (d[a] ?? 0) || a.localeCompare(b))[0];
  }
  if (spot === k.loc) {
    const opts = neighbors(c, spot).filter((n) => !ex.includes(n));
    if (opts.length) spot = pick(s, opts);
  }
  return spot;
}

// ── Minions (subordinate enemies) ───────────────────────────────────────────
function spawnMinions(c: Content, s: GameState, at: Extract<Effect, { op: 'spawnMinion' }>['at'], n: number) {
  const def = c.killer.minions;
  if (!def) return;
  const k = s.killer;
  const h = s.heroine;
  for (let i = 0; i < n; i++) {
    if (s.minions.length >= def.max) {
      log(s, `No more ${def.plural} to come (limit ${def.max}).`, 'info');
      return;
    }
    let loc: NodeId;
    if (at === 'killer') loc = k.loc;
    else if (at === 'lair') loc = c.location.lair;
    else if (at === 'nearKiller') loc = pick(s, neighbors(c, k.loc).sort());
    else if (at === 'nearHeroine') {
      const opts = neighbors(c, h.loc).filter((x) => !isExit(c, x)).sort();
      loc = opts.length ? pick(s, opts) : k.loc;
    } else loc = pick(s, c.location.nodes.map((x) => x.id).filter((x) => !isExit(c, x) && x !== h.loc));
    s.minions.push({ uid: s.uid++, loc, health: def.health });
    log(s, `${def.name} appears at ${nodeName(c, loc)}.`, 'killer');
    s.fx.push({ t: 'minion', n: 1 });
  }
}

function minionStep(c: Content, s: GameState, m: { loc: NodeId }, to: NodeId) {
  if (to === m.loc) return;
  if ((s.barricades[to] ?? 0) > 0) {
    s.barricades[to]--;
    log(s, `${c.killer.minions!.name} claws at the barricade at ${nodeName(c, to)}.`, 'killer');
    return;
  }
  m.loc = to;
}

/** Her attack on the minions in her location: damage may be split between them; excess is lost. */
/** Total damage an attack would deal to minions: base + a melee weapon + focus. Lore never applies. */
export function minionDamage(c: Content, s: GameState, base: number) {
  if (lightAttack(c, s)) return base;
  const w = bestWeapon(c, s, 0);
  return base + (w ? itemDef(c, w.id).damage ?? 0 : 0) + (s.mods.damage ?? 0);
}

/** The default split: finish off the weakest first. */
export function autoSplit(c: Content, s: GameState, base: number): Record<number, number> {
  let dmg = minionDamage(c, s, base);
  const out: Record<number, number> = {};
  for (const m of minionsAt(s, s.heroine.loc).sort((a, b) => a.health - b.health || a.uid - b.uid)) {
    const a = Math.min(dmg, m.health);
    out[m.uid] = a;
    dmg -= a;
  }
  return out;
}

/** Her attack on the minions in her location. She divides the damage; whatever she doesn't assign, or overkills, is lost. */
function hitMinions(c: Content, s: GameState, base: number, split?: Record<number, number>) {
  const def = c.killer.minions!;
  const total = minionDamage(c, s, base);
  const plan = split ?? autoSplit(c, s, base);
  if (!lightAttack(c, s)) {
    const w = bestWeapon(c, s, 0);
    if (w && !c.heroine.traits.durableWeapons) spendUse(c, s, w);
    s.mods.damage = 0;
  }
  let killed = 0;
  let used = 0;
  for (const m of minionsAt(s, s.heroine.loc)) {
    const a = Math.min(plan[m.uid] ?? 0, m.health);
    m.health -= a;
    used += a;
    if (a > 0 && m.health <= 0) killed++;
  }
  s.minions = s.minions.filter((m) => m.health > 0);
  s.fx.push({ t: 'hit', n: base });
  const wasted = total - used;
  log(s, killed ? `${killed} ${killed === 1 ? def.name : def.plural} destroyed.${wasted > 0 ? ` (${wasted} damage lost.)` : ''}` : `The ${def.plural} take ${used} damage and keep coming.`, 'good');
}

// ── Effect queue ────────────────────────────────────────────────────────────
/** Run effects right now, ahead of anything queued (rescue rewards). */
function runNow(c: Content, s: GameState, effs: Effect[]) {
  const savedQ = s.queue;
  const savedP = s.pending;
  s.queue = [...effs];
  s.pending = undefined;
  let guard = 0;
  while (!s.outcome && !s.pending && s.queue.length && guard++ < 200) {
    exec(c, s, s.queue.shift()!);
    settle(c, s);
  }
  s.queue = [...s.queue, ...savedQ];
  if (!s.pending) s.pending = savedP;
}

export function drain(c: Content, s: GameState) {
  let guard = 0;
  while (!s.outcome && !s.pending && s.queue.length && guard++ < 1000) {
    exec(c, s, s.queue.shift()!);
    settle(c, s);
  }
  if (s.outcome || s.pending) return;
  if (s.queue.length === 0) s.rolling = undefined;
  if (s.phase === 'action') {
    checkRescue(c, s);
    if ((s.heroine.nerve < 0 || s.heroine.broke) && !s.pending) {
      log(s, 'Out of nerve. Her turn is over.', 'bad');
      endActionPhase(c, s);
    }
  }
}

/** Revival, or an "end the phase" effect: skip straight to the next phase. */
function endCurrentPhase(c: Content, s: GameState) {
  s.pending = undefined;
  s.attack = undefined;
  s.rolling = undefined;
  if (s.phase === 'action') {
    s.queue = [];
    endActionPhase(c, s);
  } else {
    const i = s.queue.findIndex((q) => q.op === '_phase');
    s.queue = i >= 0 ? s.queue.slice(i) : [];
  }
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
      return npcAt(s, h.loc) === 0;
    case 'survivorsHere':
      return npcAt(s, h.loc) > 0;
    case 'finale':
      return s.killer.finale;
    case 'hurt':
      return h.health < h.maxHealth;
    case 'horrorAtLeast':
      return h.horror >= cond.n;
  }
}

/** One movement point: a step, or 1 off the barricade in his way. */
function killerStep(c: Content, s: GameState, to: NodeId) {
  if (to === s.killer.loc) return true;
  if ((s.barricades[to] ?? 0) > 0) {
    s.barricades[to]--;
    log(s, `${c.killer.name} batters the barricade at ${nodeName(c, to)}.`, 'killer');
    return false;
  }
  s.killer.loc = to;
  return true;
}

/** Shortest-path step; ties broken by the tie-break policy. */
function stepToward(c: Content, s: GameState, from: NodeId, to: NodeId): NodeId {
  if (from === to) return from;
  const d = distances(c, to);
  const opts = neighbors(c, from)
    .filter((n) => d[n] !== undefined && d[n] < d[from])
    .sort();
  if (opts.length <= 1) return opts[0] ?? from;
  return tieOrder(c, s, opts, 'path')[0];
}

/** Closest valid target from `from`; ties → most survivors → tie-break policy. */
function selectTarget(c: Content, s: GameState, who: 'npc' | 'heroine' | 'any', logTie = true, from = s.killer.loc, actor = c.killer.name): NodeId {
  const h = s.heroine;
  const d = distances(c, from);
  const npcs = npcNodes(s);
  const heroine = h.hidden ? [] : [h.loc];
  let cands: NodeId[];
  if (who === 'npc') cands = npcs.length ? npcs : heroine;
  else if (who === 'heroine') cands = heroine.length ? heroine : npcs;
  else cands = [...new Set([...npcs, ...heroine])];
  if (!cands.length) return from;
  const best = Math.min(...cands.map((n) => d[n] ?? 99));
  let tied = cands.filter((n) => (d[n] ?? 99) === best);
  if (tied.length > 1) {
    const most = Math.max(...tied.map((n) => npcAt(s, n)));
    tied = tied.filter((n) => npcAt(s, n) === most);
  }
  if (tied.length === 1) return tied[0];
  const chosen = tieOrder(c, s, tied, 'target')[0];
  if (logTie) logTieBreak(s, `${actor} goes for ${chosen === h.loc ? 'her' : nodeName(c, chosen)}`);
  return chosen;
}

/** Where he is heading next (for the UI). */
export function predictTarget(c: Content, s: GameState): NodeId {
  if (s.killer.lured) return s.killer.lured;
  const beh = (s.killer.finale ? c.killer.finale.behavior : c.killer.behavior).effects;
  const t = beh.find((e) => e.op === 'target') as (Effect & { op: 'target' }) | undefined;
  const probe = structuredClone(s);
  return selectTarget(c, probe, t?.who ?? 'any', false);
}

function exec(c: Content, s: GameState, e: Effect) {
  const h = s.heroine;
  const k = s.killer;
  switch (e.op) {
    // ── board
    case 'spawn':
      placeVictims(c, s, spawnSpot(c, s, e.at), e.n);
      if (s.phase === 'action') checkRescue(c, s);
      break;
    case 'spawnSpecial': {
      const d = specialDef(c, e.id);
      if (s.specials.some((x) => x.id === e.id) || s.specialsGone.some((x) => x.id === e.id)) {
        log(s, `(${d.name} has already been tonight.)`, 'info');
        break;
      }
      const at = spawnSpot(c, s, e.at);
      s.specials.push({ id: e.id, at });
      log(s, `${d.name} is at ${nodeName(c, at)}. ${d.text}`, 'info');
      if (s.phase === 'action') checkRescue(c, s);
      break;
    }
    case 'spawnMinion':
      spawnMinions(c, s, e.at, e.n);
      break;
    case 'minionsAct':
    case '_minionsAll':
      pushFront(s, s.minions.map((m) => ({ op: '_minion', uid: m.uid }) as Effect));
      break;
    case 'enemiesAct':
      // Unless told otherwise, minions act before the killer.
      pushFront(s, [{ op: '_minionsAll' }, { op: '_behavior' }]);
      break;
    case '_minion': {
      const def = c.killer.minions;
      const m = s.minions.find((x) => x.uid === e.uid);
      if (!def || !m) break;
      const target = selectTarget(c, s, def.who, true, m.loc, def.name);
      const start = m.loc;
      for (let i = 0; i < def.move && m.loc !== target; i++) minionStep(c, s, m, stepToward(c, s, m.loc, target));
      if (m.loc !== start) log(s, `${def.name} shambles to ${nodeName(c, m.loc)}.`, 'killer');
      pushFront(s, [{ op: '_strike', who: def.who, by: m.uid }]);
      break;
    }
    case 'rally': {
      if (h.loc === k.loc) {
        log(s, 'Nobody will come into a room with {him} in it.', 'bad');
        break;
      }
      let left = e.n;
      const from = neighbors(c, h.loc).sort((a, b) => npcAt(s, b) - npcAt(s, a));
      for (const n of from) {
        for (const x of specialsAt(s, n)) {
          const d = specialDef(c, x.id);
          const w = d.trait === 'heavy' ? 2 : 1;
          if (w > left) continue;
          x.at = h.loc;
          left -= w;
          log(s, `"Over here!" ${d.name} comes to her from ${nodeName(c, n)}.`, 'good');
        }
        const m = Math.min(left, s.victims[n] ?? 0);
        if (m <= 0) continue;
        s.victims[n] -= m;
        s.victims[h.loc] += m;
        left -= m;
        log(s, `"Over here!" ${m} survivor${m > 1 ? 's' : ''} run${m > 1 ? '' : 's'} to her from ${nodeName(c, n)}.`, 'good');
      }
      if (left === e.n) log(s, 'Nobody close enough to hear her.');
      if (s.phase === 'action') checkRescue(c, s);
      break;
    }
    case 'panic':
      panicAt(c, s, e.at === 'killer' ? k.loc : h.loc);
      break;
    // ── heroine
    case 'move': {
      const bonus = h.movesThisTurn === 0 ? c.heroine.traits.moveBonus ?? 0 : 0;
      h.movesThisTurn++;
      const n = e.n + bonus;
      if (n > 0) s.pending = { kind: 'move', left: n };
      break;
    }
    case 'search': {
      const pile = s.piles[h.loc];
      if (!pile || !pile.cards.length) {
        log(s, 'Nothing left to find here.');
        break;
      }
      const drawn = pile.cards.splice(0, Math.min(e.draw, pile.cards.length));
      pile.up = false;
      s.pending = { kind: 'search', node: h.loc, drawn, keep: Math.min(e.keep, drawn.length) };
      break;
    }
    case 'horror':
      addHorror(c, s, e.n);
      break;
    case 'heal': {
      const before = h.health;
      h.health = Math.min(h.maxHealth, h.health + e.n);
      if (h.health > before) log(s, `Recovered ${h.health - before} health.`, 'good');
      break;
    }
    case 'wound':
      log(s, `She loses ${e.n} health.`, 'bad');
      hurtHeroine(c, s, e.n);
      break;
    case 'nerve':
      h.nerve += e.n;
      if (e.n) log(s, `${e.n > 0 ? '+' : ''}${e.n} nerve.`, e.n > 0 ? 'good' : 'bad');
      break;
    case 'hide':
      h.hidden = true;
      s.fx.push({ t: 'hide' });
      log(s, 'She slips out of sight. Hidden until {he} has passed.', 'good');
      break;
    case 'barricade': {
      const at = e.at === 'here' ? h.loc : e.at;
      if (isExit(c, at)) {
        log(s, 'You cannot barricade an exit.');
        break;
      }
      // Barricades don't stack: a new one only replaces a weaker one.
      const str = e.strength + (c.heroine.traits.barricadeStrength ?? 0);
      s.barricades[at] = Math.max(s.barricades[at] ?? 0, str);
      log(s, `Barricade raised at ${nodeName(c, at)} (holds ${s.barricades[at]}).`, 'good');
      break;
    }
    case 'teleportHeroine': {
      let to = e.to;
      if (to === 'exit') {
        const d = distances(c, h.loc);
        to = exits(c).sort((a, b) => (d[a] ?? 99) - (d[b] ?? 99))[0];
      }
      moveHeroine(c, s, to);
      if (s.phase === 'action') checkRescue(c, s);
      break;
    }
    case 'drawItem':
      for (let i = 0; i < e.n; i++) {
        const id = s.spare.shift();
        if (id) gainItem(c, s, id);
        else log(s, 'There is nothing more to hand her.');
      }
      break;
    case 'resolve':
      h.resolve += e.n;
      log(s, `Resolve +${e.n}: her attacks roll +${h.resolve} dice for the rest of the night.`, 'good');
      break;
    case 'mod':
      s.mods[e.key] = (s.mods[e.key] ?? 0) + e.n;
      break;
    case 'warm':
      if (s.env.cold > 0) log(s, 'Warmth floods back into her hands.', 'good');
      s.env.cold = 0;
      break;
    case 'endPhase':
      log(s, 'The phase ends.', 'info');
      endCurrentPhase(c, s);
      break;
    // ── attacks
    case 'damage':
      heroineAttack(c, s, e.n);
      break;
    case 'killerDamage':
      hurtKiller(c, s, e.n);
      break;
    case 'counter': {
      const by = s.attack?.by;
      if (by === undefined) {
        hurtKiller(c, s, e.n);
        break;
      }
      const m = s.minions.find((x) => x.uid === by);
      if (m) {
        m.health -= e.n;
        if (m.health <= 0) {
          s.minions = s.minions.filter((x) => x.uid !== by);
          log(s, `She drops the ${c.killer.minions!.name.replace(/^(A|An|The) /, '').toLowerCase()} that came at her.`, 'good');
        }
      }
      break;
    }
    case 'block':
      if (s.attack) {
        const before = s.attack.damage;
        s.attack.damage = Math.max(0, before - e.n);
        log(s, s.attack.damage === 0 ? 'She avoids the blow completely.' : `She softens the blow (${before} → ${s.attack.damage}).`, 'good');
      }
      break;
    // ── killer
    case 'bloodlust':
      addBloodlust(c, s, e.n);
      break;
    case 'killerHeal': {
      const before = k.health;
      k.health = Math.min(k.maxHealth, k.health + e.n);
      if (k.health > before) log(s, `${c.killer.name} recovers ${k.health - before}.`, 'killer');
      break;
    }
    case 'killerStun':
      k.stunned += e.n;
      s.fx.push({ t: 'stun' });
      log(s, `${c.killer.name} is stunned. {He} will lose {his} next move.`, 'good');
      break;
    case 'killerMove': {
      for (let i = 0; i < e.steps; i++) {
        const target = e.toward === 'heroine' ? h.loc : e.toward === 'lair' ? c.location.lair : e.toward;
        killerStep(c, s, stepToward(c, s, k.loc, target));
      }
      log(s, `${c.killer.name} moves to ${nodeName(c, k.loc)}.`, 'killer');
      if (k.loc === h.loc) s.fx.push({ t: 'killerAppears' });
      break;
    }
    case 'killerTeleport': {
      let to = e.to;
      if (to === 'lair') to = c.location.lair;
      else if (to === 'heroine') to = h.loc;
      else if (to === 'random') to = pick(s, c.location.nodes.map((n) => n.id).filter((id) => !isExit(c, id)));
      k.loc = to;
      log(s, `${c.killer.name} vanishes… and is now at ${nodeName(c, to)}.`, 'killer');
      if (k.loc === h.loc) s.fx.push({ t: 'killerAppears' });
      break;
    }
    case 'target': {
      if (k.lured) {
        k.target = k.lured;
        log(s, `${c.killer.name} heads for the ringing at ${nodeName(c, k.lured)}.`, 'killer');
        k.lured = undefined;
      } else k.target = selectTarget(c, s, e.who);
      break;
    }
    case 'hunt': {
      const target = k.target ?? k.loc;
      const steps = killerMoveValue(c, s) + (e.extra ?? 0);
      const start = k.loc;
      // Each movement point either takes a step or knocks 1 off a barricade.
      for (let i = 0; i < steps && k.loc !== target; i++) killerStep(c, s, stepToward(c, s, k.loc, target));
      if (k.loc !== start) log(s, `${c.killer.name} prowls to ${nodeName(c, k.loc)}.`, 'killer');
      if (k.loc === h.loc && start !== h.loc && !h.hidden) {
        s.fx.push({ t: 'killerAppears' });
        log(s, `{He}'s found her.`, 'killer');
        pushFront(s, [{ op: 'horror', n: 1 }]);
      }
      break;
    }
    case 'attack':
      pushFront(s, Array.from({ length: e.n ?? 1 }, () => ({ op: '_strike', who: e.who }) as Effect));
      break;
    case '_strike': {
      const minion = e.by !== undefined ? s.minions.find((m) => m.uid === e.by) : undefined;
      if (e.by !== undefined && !minion) break; // destroyed before it could strike
      const actor = minion ? c.killer.minions!.name : c.killer.name;
      const here = minion ? minion.loc : k.loc;
      const npcs = npcAt(s, here);
      const herHere = h.loc === here;
      if (npcs > 0 && (e.who !== 'heroine' || !herHere)) {
        eliminate(c, s, here, actor);
        break;
      }
      if (!herHere) break;
      if (minion) {
        if (h.hidden) {
          log(s, `${actor} shuffles right past her hiding place.`, 'good');
          break;
        }
        const dmg = c.killer.minions!.attack;
        s.attack = { damage: dmg, by: minion.uid };
        log(s, `${actor} attacks her (${dmg} damage).`, 'killer');
        if (canReact(c, s)) s.pending = { kind: 'reaction' };
        else takeAttack(c, s);
        break;
      }
      if (h.hidden) {
        const need = k.finale ? 4 : 5;
        const r = rollD6(s);
        if (r < need) {
          log(s, `${c.killer.name} stands inches away… and passes her by. (Searched: ${r}, needed ${need}+.)`, 'good');
          break;
        }
        h.hidden = false;
        log(s, `${c.killer.name} tears the room apart… and finds her. (Searched: ${r}.)`, 'killer');
      }
      const dmg = killerAttack(c, s);
      s.attack = { damage: dmg };
      log(s, `${c.killer.name} attacks her (${dmg} damage).`, 'killer');
      if (canReact(c, s)) s.pending = { kind: 'reaction' };
      else takeAttack(c, s);
      break;
    }
    case '_reactDone':
      if (!s.attack) break;
      if (s.attack.damage <= 0) s.attack = undefined;
      else if (canReact(c, s)) s.pending = { kind: 'reaction' };
      else takeAttack(c, s);
      break;
    case 'revealPower':
      if (k.power !== 'hidden') break;
      k.power = 'active';
      k.powerHealth = c.killer.power.health;
      log(s, `POWER: ${c.killer.power.name}. ${c.killer.power.text}`, 'killer');
      s.fx.push({ t: 'power' });
      pushFront(s, c.killer.power.effects ?? []);
      break;
    case 'event':
      revealEvent(c, s);
      break;
    case 'if':
      pushFront(s, checkCond(c, s, e.cond) ? e.then : e.else ?? []);
      break;
    case 'log':
      log(s, e.text, 'info');
      break;
    // ── sequencing
    case '_behavior': {
      if (k.stunned > 0) {
        k.stunned--;
        log(s, `${c.killer.name} staggers, dazed. {He} loses {his} move.`, 'good');
        break;
      }
      pushFront(s, (k.finale ? c.killer.finale.behavior : c.killer.behavior).effects);
      break;
    }
    case '_clearMods':
      s.mods = {};
      break;
    case '_terror': {
      if (k.finale) break;
      const id = s.terrorDeck.shift();
      if (!id) break;
      const t = terrorDef(c, id);
      s.lastTerror = id;
      s.terrorDiscard.push(id);
      log(s, `TERROR: ${t.name}. ${t.text}`, 'killer');
      s.fx.push({ t: 'terror', id });
      pushFront(s, t.effects);
      break;
    }
    case '_phase':
      if (e.to === 'panic') {
        s.phase = 'panic';
        h.hidden = false;
        const scared = enemyNodes(s).filter((n) => npcAt(s, n) > 0);
        if (s.slainThisTurn > 0 && scared.length) {
          log(s, 'Blood has been spilled tonight. Survivors near the killer panic.', 'killer');
          for (const n of scared) panicAt(c, s, n);
        }
        pushFront(s, [{ op: '_phase', to: 'upkeep' }]);
      } else {
        s.phase = 'upkeep';
        s.rearrange = true;
        const ups: Effect[] = [{ op: '_finaleCheck' }, { op: '_rule', when: 'upkeep' }];
        if (s.victimPool > 0) ups.push({ op: 'spawn', at: 'awayFromKiller', n: UPKEEP_ARRIVALS });
        for (const id of s.events) ups.push(...(eventDef(c, id).upkeep ?? []));
        if (k.power === 'active') ups.push(...(c.killer.power.upkeep ?? []));
        if (k.finale) ups.push(...(c.killer.finale.upkeep ?? []));
        pushFront(s, ups);
      }
      break;
    case '_finaleCheck':
      if (!k.finale && s.terrorDeck.length === 0) {
        k.finale = true;
        log(s, `FINALE: ${c.killer.finale.name}. ${c.killer.finale.text}`, 'killer');
        s.fx.push({ t: 'finale' });
        pushFront(s, [...c.killer.finale.effects, ...(k.power === 'hidden' ? [{ op: 'revealPower' } as Effect] : [])]);
      }
      break;
    case '_rule':
      ruleUpkeep(c, s);
      specialsUpkeep(c, s);
      break;
  }
}

function takeAttack(c: Content, s: GameState) {
  const dmg = s.attack?.damage ?? 0;
  s.attack = undefined;
  s.pending = undefined;
  if (dmg > 0) {
    log(s, `The blow lands: ${dmg} damage.`, 'bad');
    hurtHeroine(c, s, dmg);
  }
}

// ── Location rules ──────────────────────────────────────────────────────────
function ruleSetup(c: Content, s: GameState) {
  if (c.location.rule.kind === 'calls') ringPhone(c, s);
}

function ringPhone(c: Content, s: GameState) {
  const phones = c.location.nodes.filter((n) => n.tags?.includes('phone') && n.id !== s.heroine.loc).map((n) => n.id);
  s.env.ringing = phones.length ? pick(s, phones) : undefined;
  if (s.env.ringing) {
    log(s, `☎ The phone is ringing at ${nodeName(c, s.env.ringing)}.`, 'killer');
    s.fx.push({ t: 'env', text: 'Phone ringing' });
  }
}

/** Upkeep: the location's signature rule sets up next turn. */
function ruleUpkeep(c: Content, s: GameState) {
  const r = c.location.rule;
  const env = s.env;
  const h = s.heroine;
  const next = s.round + 1;
  const period = r.period ?? 3;
  switch (r.kind) {
    case 'intermission':
      if (s.round % period === 0) {
        log(s, `${r.name}: the projector stops. Horror −1, +1 nerve.`, 'good');
        s.fx.push({ t: 'env', text: r.name });
        h.nerve += 1;
        addHorror(c, s, -1);
      }
      break;
    case 'tide': {
      const high = Math.floor((next - 1) / period) % 2 === 1;
      if (high !== env.tideHigh) {
        env.tideHigh = high;
        log(s, high ? 'HIGH TIDE: the shore floods. Moving into it costs +1 nerve.' : 'Low tide: the water draws back.', high ? 'killer' : 'good');
        s.fx.push({ t: 'env', text: high ? 'High Tide' : 'Low Tide' });
      }
      break;
    }
    case 'power': {
      const dark = next >= 3 && (next % 4 === 3 || next % 4 === 0);
      if (dark !== env.dark) {
        env.dark = dark;
        log(s, dark ? 'BLACKOUT: the power fails. Search −1 die, hide +1 die, and {he} moves +1.' : 'The lights stutter back on.', dark ? 'killer' : 'good');
        s.fx.push({ t: 'env', text: dark ? 'Blackout' : 'Power Restored' });
      }
      break;
    }
    case 'cold':
      if (c.heroine.traits.coldImmune) break;
      if (hasTag(c, h.loc, 'warm')) {
        if (env.cold > 0) log(s, 'She thaws out by the fire.', 'good');
        env.cold = 0;
      } else if (hasTag(c, h.loc, 'outdoor')) {
        env.cold++;
        log(s, `The cold bites. Cold ${env.cold}/3.`, 'bad');
        if (env.cold >= 3) {
          env.cold = 0;
          log(s, 'Frostbite.', 'bad');
          hurtHeroine(c, s, 1);
        }
      }
      if (env.cold >= 2) {
        h.nerve -= 1;
        log(s, 'Numb fingers, slow thoughts. −1 nerve from the cold.', 'bad');
      }
      break;
    case 'calls':
      ringPhone(c, s);
      break;
  }
}

/** End of her Action phase: an unanswered phone lures him. Then Planning. */
function endActionPhase(c: Content, s: GameState) {
  const env = s.env;
  if (c.location.rule.kind === 'calls' && env.ringing) {
    const at = env.ringing;
    env.ringing = undefined;
    log(s, `Nobody answered at ${nodeName(c, at)}. Someone else picks up, and ${c.killer.name} is on the line.`, 'killer');
    if (at !== s.killer.loc) placeVictims(c, s, at, 1);
    s.queue.push({ op: 'killerMove', toward: at, steps: 1 });
    drain(c, s);
  }
  s.rearrange = false;
  s.pending = undefined;
  // Once nerve has gone below zero it can't climb back above zero this turn.
  if (s.heroine.broke) s.heroine.nerve = Math.min(0, s.heroine.nerve);
  s.heroine.broke = false;
  s.phase = 'planning';
}

function startTurn(c: Content, s: GameState) {
  const h = s.heroine;
  s.round++;
  s.phase = 'action';
  s.slainThisTurn = 0;
  s.rearrange = false;
  h.abilityUsed = false;
  h.movesThisTurn = 0;
  h.horrorTakenThisTurn = 0;
  log(s, `── Turn ${s.round} ──`, 'info');
  checkRescue(c, s);
  if (h.nerve < 0) endActionPhase(c, s);
}

// ── Legality (also used by the UI) ──────────────────────────────────────────
export interface Check {
  ok: boolean;
  why?: string;
  cost: number;
}

export function cardCost(c: Content, d: ActionCardDef): number {
  if (d.tags.includes('barricade')) return Math.max(0, d.cost - (c.heroine.traits.barricadeDiscount ?? 0));
  return d.cost;
}

/** Can a ranged weapon in hand reach him? */
export function canReach(c: Content, s: GameState): boolean {
  if (s.killer.loc === s.heroine.loc) return true;
  const d = distances(c, s.heroine.loc)[s.killer.loc] ?? 99;
  return !!bestWeapon(c, s, d);
}

export function reqCheck(c: Content, s: GameState, d: ActionCardDef): { ok: boolean; why?: string } {
  const h = s.heroine;
  switch (d.req) {
    case 'killerHere':
      return s.killer.loc === h.loc ? { ok: true } : { ok: false, why: 'The killer must be here' };
    case 'killerAway':
      return s.killer.loc !== h.loc ? { ok: true } : { ok: false, why: 'Not with the killer in the room' };
    case 'searchSpace':
      if (!isSearch(c, h.loc)) return { ok: false, why: 'Only at a search location' };
      if (!s.piles[h.loc]?.cards.length) return { ok: false, why: 'Nothing left to find here' };
      return { ok: true };
    case 'reach':
      return canReach(c, s) || minionsAt(s, h.loc).length ? { ok: true } : { ok: false, why: '{He} must be here (or in range of a weapon in hand)' };
    default:
      return { ok: true };
  }
}

export function canReact(c: Content, s: GameState): boolean {
  if (!s.attack || s.attack.damage <= 0) return false;
  return s.heroine.hand.some((x) => {
    const d = actionDef(c, x.id);
    return d.kind === 'reaction' && s.heroine.nerve >= cardCost(c, d);
  });
}

function itemUsable(c: Content, s: GameState, it: HeldItem): { ok: boolean; why?: string } {
  const d = itemDef(c, it.id);
  const h = s.heroine;
  if (!d.use) return { ok: false, why: d.kind === 'weapon' ? 'Adds damage to your attack cards' : 'Passive' };
  if (d.hands > 0 && !h.items.some((x) => x.uid === it.uid)) return { ok: false, why: 'Needs to be in hand' };
  const dist = distances(c, h.loc)[s.killer.loc] ?? 99;
  if (d.use.when === 'killerHere' && dist !== 0) return { ok: false, why: 'The killer must be here' };
  if (d.use.when === 'killerNear' && dist > 1) return { ok: false, why: 'The killer must be within 1' };
  if (d.use.when === 'atNode' && h.loc !== d.use.node) return { ok: false, why: `Only at ${nodeName(c, d.use.node!)}` };
  return { ok: true };
}

export function check(c: Content, s: GameState, a: Action): Check {
  const h = s.heroine;
  const no = (why: string, cost = 0): Check => ({ ok: false, why, cost });
  const yes = (cost = 0): Check => ({ ok: true, cost });
  if (s.outcome) return no('The night is over');
  const p = s.pending;
  switch (a.type) {
    case 'playCard': {
      if (!canAct(s)) return no(p ? 'Finish the current card first' : 'Not now');
      if (h.nerve < 0) return no('Out of nerve');
      const card = h.hand.find((x) => x.uid === a.uid);
      if (!card) return no('Not in hand');
      const d = actionDef(c, card.id);
      const cost = cardCost(c, d);
      if (d.kind === 'reaction') return no('Reactions are played when {he} attacks you', cost);
      const r = reqCheck(c, s, d);
      if (!r.ok) return no(r.why!, cost);
      return yes(cost);
    }
    case 'discardForNerve':
      if (!canAct(s)) return no('Not now');
      if (h.nerve < 0) return no('Out of nerve');
      return h.hand.some((x) => x.uid === a.uid) ? yes() : no('Not in hand');
    case 'step': {
      if (p?.kind !== 'move' || s.phase !== 'action') return no('Play a move card first');
      if (!neighbors(c, h.loc).includes(a.to)) return no('Not adjacent');
      return yes(isFlooded(c, s, a.to) ? 1 : 0);
    }
    case 'stopMove':
      return p?.kind === 'move' ? yes() : no('Not moving');
    case 'setBring':
      return a.n >= 0 && a.n <= escortCap(c) ? yes() : no('Too many');
    case 'convert': {
      if (p?.kind !== 'roll' || !s.rolling) return no('No roll to adjust');
      const v = s.rolling.dice[a.die];
      if (v === undefined || v < 3 || v > 4 || s.rolling.converted.includes(a.die)) return no('Only a 3 or 4 can be bought up');
      if (s.rolling.converted.length >= MAX_BUYUPS) return no('Only one die per roll can be bought up');
      const [x, y] = a.discard;
      if (x === y || !h.hand.some((q) => q.uid === x) || !h.hand.some((q) => q.uid === y)) return no(`Choose ${CONVERT_COST} cards from your hand`);
      return yes();
    }
    case 'resolveRoll':
      return p?.kind === 'roll' ? yes() : no('No roll');
    case 'keep': {
      if (p?.kind !== 'search') return no('Not searching');
      const ok = a.picks.length <= p.keep && new Set(a.picks).size === a.picks.length && a.picks.every((i) => i >= 0 && i < p.drawn.length);
      return ok ? yes() : no(`Keep up to ${p.keep}`);
    }
    case 'react': {
      if (p?.kind !== 'reaction') return no('Only when {he} attacks you');
      const card = h.hand.find((x) => x.uid === a.uid);
      if (!card) return no('Not in hand');
      const d = actionDef(c, card.id);
      if (d.kind !== 'reaction') return no('Not a reaction');
      const cost = cardCost(c, d);
      return h.nerve >= cost ? yes(cost) : no(`Needs ${cost} nerve`, cost);
    }
    case 'takeHit':
      return p?.kind === 'reaction' ? yes() : no('Nothing to take');
    case 'aim': {
      if (p?.kind !== 'aim') return no('Nothing to aim');
      if (a.at === 'killer') return p.killer ? yes() : no('{He} is out of reach');
      if (!a.split) return yes();
      const here = new Set(minionsAt(s, h.loc).map((m) => m.uid));
      const vals = Object.entries(a.split);
      if (vals.some(([uid, n]) => !here.has(+uid) || !Number.isInteger(n) || n < 0)) return no('Assign damage to minions here');
      return vals.reduce((t, [, n]) => t + n, 0) <= minionDamage(c, s, p.base) ? yes() : no('More damage than the attack deals');
    }
    case 'toggleFollow':
      return s.specials.some((x) => x.id === a.id && x.at === h.loc) ? yes() : no('Not here');
    case 'useItem': {
      if (!canAct(s)) return no('Not now');
      const it = activeItems(c, s).find((i) => i.uid === a.uid);
      if (!it) return no('Not usable from there');
      const u = itemUsable(c, s, it);
      return u.ok ? yes() : no(u.why!);
    }
    case 'useAbility': {
      if (!canAct(s)) return no('Not now');
      if (!abilityUnlocked(c, s)) return no(`Fill all ${c.heroine.rescue.slots.length} rescue slots to unlock`);
      if (h.abilityUsed) return no('Once per turn');
      if (c.heroine.ability.when === 'killerHere' && s.killer.loc !== h.loc) return no('The killer must be here');
      return yes();
    }
    case 'ready': {
      if (!(s.rearrange || s.phase === 'upkeep') || p) return no('Only when you gain an item, or during Upkeep');
      const it = h.pack.find((i) => i.uid === a.uid);
      if (!it) return no('Not in the backpack');
      const need = itemDef(c, it.id).hands;
      if (need === 0) return no('Works from the backpack');
      const keep = h.items.filter((i) => !(a.swapOut ?? []).includes(i.uid));
      if (handsUsed(c, keep) + need > HAND_SLOTS) return no('Hands full: choose what to put away');
      return yes();
    }
    case 'stow':
      if (!(s.rearrange || s.phase === 'upkeep') || p) return no('Only when you gain an item, or during Upkeep');
      return h.items.some((i) => i.uid === a.uid) ? yes() : no('Not in hand');
    case 'dropItem':
      return h.items.some((i) => i.uid === a.uid) || h.pack.some((i) => i.uid === a.uid) ? yes() : no('No such item');
    case 'answer': {
      if (!canAct(s)) return no('Not now');
      if (s.env.ringing !== h.loc) return no('No phone ringing here', 1);
      return yes(c.heroine.traits.freeAnswer ? 0 : 1);
    }
    case 'endAction':
      return canAct(s) ? yes() : no(p ? 'Finish the current card first' : 'Not now');
    case 'buy': {
      if (s.phase !== 'planning') return no('Buy cards in the Planning phase');
      const d = c.actions.find((x) => x.id === a.id);
      if (!d) return no('Unknown card');
      if ((s.tableau[a.id] ?? 0) <= 0) return no(s.discard.includes(a.id) ? 'Used this turn: back after Planning' : 'None left');
      if (h.hand.length >= HAND_LIMIT) return no(`Hand full (${HAND_LIMIT})`);
      const cost = cardCost(c, d);
      if (cost > 0 && h.nerve - cost < 0) return no(`Needs ${cost} nerve`, cost);
      return yes(cost);
    }
    case 'endPlanning':
      return s.phase === 'planning' ? yes() : no('Not planning');
    case 'endUpkeep':
      return s.phase === 'upkeep' && !p && !s.queue.length ? yes() : no('Not now');
  }
}

// ── Reducer ─────────────────────────────────────────────────────────────────
export function dispatch(c: Content, prev: GameState, a: Action): GameState {
  const chk = check(c, prev, a);
  if (!chk.ok) return prev;
  const s: GameState = structuredClone(prev);
  s.fx = [];
  s.down = undefined;
  const h = s.heroine;
  const toDiscard = (uid: number) => {
    const i = h.hand.findIndex((x) => x.uid === uid);
    const [card] = h.hand.splice(i, 1);
    s.discard.push(card.id);
    return card;
  };

  switch (a.type) {
    case 'playCard': {
      const card = toDiscard(a.uid);
      const d = actionDef(c, card.id);
      s.rearrange = false;
      h.nerve -= cardCost(c, d);
      if (h.nerve < 0) h.broke = true;
      log(s, `Played ${d.name}${cardCost(c, d) ? ` (${cardCost(c, d)} nerve)` : ''}.`);
      if (d.tags.includes('attack') || d.tags.includes('search') || d.tags.includes('move')) h.hidden = false;
      if (d.roll) startRoll(c, s, card.uid, d, false);
      else pushFront(s, d.always ?? []);
      break;
    }
    case 'discardForNerve': {
      const card = toDiscard(a.uid);
      h.nerve += 1;
      log(s, `Discarded ${actionDef(c, card.id).name} for +1 nerve.`);
      break;
    }
    case 'step': {
      const p = s.pending as { kind: 'move'; left: number };
      if (isFlooded(c, s, a.to)) {
        h.nerve -= 1;
        if (h.nerve < 0) h.broke = true;
        log(s, 'She wades through the flood (+1 nerve).', 'bad');
      }
      moveHeroine(c, s, a.to);
      p.left--;
      if (p.left <= 0) s.pending = undefined;
      checkRescue(c, s);
      break;
    }
    case 'stopMove':
      s.pending = undefined;
      break;
    case 'setBring':
      h.bring = a.n;
      break;
    case 'convert': {
      for (const uid of a.discard) toDiscard(uid);
      s.rolling!.converted.push(a.die);
      s.lastRoll = { ...summarize(s, actionDef(c, s.rolling!.card).name, s.rolling!.dice, s.rolling!.converted, !!s.lastRoll?.rerolled), parts: s.lastRoll?.parts };
      if (!canConvert(s)) finishRoll(c, s);
      break;
    }
    case 'resolveRoll':
      finishRoll(c, s);
      break;
    case 'keep': {
      const p = s.pending as { kind: 'search'; node: NodeId; drawn: string[]; keep: number };
      s.pending = undefined;
      const kept = a.picks.map((i) => p.drawn[i]);
      const rest = p.drawn.filter((_, i) => !a.picks.includes(i));
      const pile = s.piles[p.node];
      if (rest.length) {
        pile.cards.unshift(...rest);
        pile.up = true;
      }
      if (!kept.length) log(s, 'She leaves it all where it was.');
      for (const id of kept) gainItem(c, s, id);
      break;
    }
    case 'react': {
      const card = toDiscard(a.uid);
      const d = actionDef(c, card.id);
      h.nerve -= cardCost(c, d);
      s.pending = undefined;
      log(s, `Reaction: ${d.name}.`);
      if (d.roll) startRoll(c, s, card.uid, d, true);
      else pushFront(s, [...(d.always ?? []), { op: '_reactDone' }]);
      break;
    }
    case 'takeHit':
      takeAttack(c, s);
      break;
    case 'aim': {
      const p = s.pending as { kind: 'aim'; base: number; range: number };
      s.pending = undefined;
      if (a.at === 'killer') hitKiller(c, s, p.base, p.range);
      else hitMinions(c, s, p.base, a.split);
      break;
    }
    case 'toggleFollow':
      h.leave = (h.leave ?? []).includes(a.id) ? h.leave.filter((x) => x !== a.id) : [...(h.leave ?? []), a.id];
      break;
    case 'useItem': {
      const it = activeItems(c, s).find((i) => i.uid === a.uid)!;
      const d = itemDef(c, it.id);
      log(s, `Used ${d.name}.`, 'good');
      spendUse(c, s, it);
      pushFront(s, d.use!.effects);
      break;
    }
    case 'useAbility':
      h.abilityUsed = true;
      log(s, `${c.heroine.ability.name}.`, 'good');
      pushFront(s, c.heroine.ability.effects);
      break;
    case 'ready': {
      const it = h.pack.find((x) => x.uid === a.uid)!;
      h.pack = h.pack.filter((x) => x.uid !== a.uid);
      for (const out of a.swapOut ?? []) {
        const o = h.items.find((x) => x.uid === out);
        if (!o) continue;
        h.items = h.items.filter((x) => x.uid !== out);
        h.pack.push(o);
      }
      h.items.push(it);
      log(s, `Took ${itemDef(c, it.id).name} in hand.`);
      break;
    }
    case 'stow': {
      const it = h.items.find((x) => x.uid === a.uid)!;
      h.items = h.items.filter((x) => x.uid !== a.uid);
      h.pack.push(it);
      log(s, `Put ${itemDef(c, it.id).name} in the backpack.`);
      break;
    }
    case 'dropItem':
      h.items = h.items.filter((x) => x.uid !== a.uid);
      h.pack = h.pack.filter((x) => x.uid !== a.uid);
      break;
    case 'answer':
      h.nerve -= c.heroine.traits.freeAnswer ? 0 : 1;
      s.env.ringing = undefined;
      log(s, '☎ She answers. Breathing… then a calm voice says her name. She hangs up first.', 'good');
      pushFront(s, [{ op: 'horror', n: 1 }]);
      break;
    case 'endAction':
      endActionPhase(c, s);
      break;
    case 'buy': {
      const d = actionDef(c, a.id);
      s.tableau[a.id]--;
      h.nerve -= cardCost(c, d);
      h.hand.push({ uid: s.uid++, id: a.id });
      log(s, `Bought ${d.name}${cardCost(c, d) ? ` for ${cardCost(c, d)} nerve` : ''}.`);
      break;
    }
    case 'endPlanning': {
      h.nerve = DIFFICULTY[s.difficulty].nerve;
      for (const id of s.discard) s.tableau[id] = (s.tableau[id] ?? 0) + 1;
      s.discard = [];
      s.phase = 'hunter';
      log(s, `${c.killer.name}'s turn.`, 'killer');
      const enemies: Effect[] = !c.killer.minions ? [{ op: '_behavior' }] : c.killer.minions.order === 'before' ? [{ op: '_minionsAll' }, { op: '_behavior' }] : [{ op: '_behavior' }, { op: '_minionsAll' }];
      s.queue = [...enemies, { op: '_clearMods' }, { op: '_terror' }, { op: '_phase', to: 'panic' }];
      break;
    }
    case 'endUpkeep':
      startTurn(c, s);
      break;
  }
  drain(c, s);
  settle(c, s);
  return s;
}

/** Fill in fields added since a save was written (v1.0 → v1.0.2). */
export function upgradeState(s: GameState): GameState {
  s.specials ??= [];
  s.specialsGone ??= [];
  s.minions ??= [];
  s.heroine.leave ??= [];
  return s;
}

// ── Scoring ─────────────────────────────────────────────────────────────────
export function totalHealth(s: GameState) {
  return s.heroine.health + (s.heroine.token !== null ? 1 : 0);
}

export function score(s: GameState) {
  if (s.outcome !== 'slain') return Math.max(0, s.saved * 10 - s.slain * 5);
  return Math.max(0, 100 + s.saved * 15 - s.slain * 5 + totalHealth(s) * 5 + s.terrorDeck.length * 5);
}

export function rating(s: GameState): { stars: number; blurb: string } {
  const sc = score(s);
  if (s.outcome === 'died') return { stars: 1, blurb: 'Straight to video.' };
  if (sc >= 200) return { stars: 5, blurb: 'A midnight-movie legend.' };
  if (sc >= 165) return { stars: 4, blurb: 'Cult classic.' };
  if (sc >= 130) return { stars: 3, blurb: 'Solid double feature.' };
  return { stars: 2, blurb: 'She got {him}. Barely.' };
}

