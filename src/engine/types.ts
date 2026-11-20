// ─────────────────────────────────────────────────────────────────────────────
// LAST LIGHT — engine types.
// Content (killers, locations, heroines, cards) is pure data; the engine
// interprets Effect ops. New "features" (expansions) = new packs, no engine edits.
// ─────────────────────────────────────────────────────────────────────────────

export type NodeId = string;

/** Atomic, data-driven effect operations used by events, items and instinct cards. */
export type Effect =
  | { op: 'spawn'; at: NodeId | 'random' | 'farFromKiller' | 'nearKiller'; n: number }
  | { op: 'horror'; n: number }
  | { op: 'heal'; n: number }
  | { op: 'wound'; n: number }
  | { op: 'nerve'; n: number }
  | { op: 'bloodlust'; n: number }
  | { op: 'killerHeal'; n: number }
  | { op: 'killerDamage'; n: number; ignoreArmor?: boolean }
  | { op: 'killerStun'; n: number }
  | { op: 'killerMove'; toward: 'heroine' | 'lair' | NodeId; steps: number }
  | { op: 'killerTeleport'; to: 'lair' | 'random' | 'heroine' | NodeId }
  | { op: 'killerArmor'; n: number }
  | { op: 'clock'; n: number }
  | { op: 'mod'; key: RoundModKey; n: number }
  | { op: 'freeMove' }
  | { op: 'drawItem'; n: number }
  | { op: 'drawInstinct'; n: number }
  | { op: 'barricade'; at: 'here' | NodeId; strength: number }
  | { op: 'teleportHeroine'; to: NodeId }
  | { op: 'saveEscorted' }
  | { op: 'if'; cond: Condition; then: Effect[]; else?: Effect[] }
  | { op: 'warm' }
  | { op: 'log'; text: string };

export type Condition =
  | { c: 'killerHere' }
  | { c: 'killerAdjacent' }
  | { c: 'heroineAt'; node: NodeId }
  | { c: 'alone' }
  | { c: 'escorting' }
  | { c: 'finale' }
  | { c: 'horrorAtLeast'; n: number };

/** Per-round modifiers; reset at end of each round. */
export type RoundModKey =
  | 'searchThreshold'
  | 'searchDice'
  | 'fightDice'
  | 'hideAuto'
  | 'killerAttackDice'
  | 'rerollNext'
  | 'brace'
  | 'nerve'
  | 'hideDice';

export type NodeTag = 'outdoor' | 'warm' | 'shore' | 'phone';

/** One signature rule per location, interpreted by the engine. */
export interface LocationRule {
  kind: 'intermission' | 'tide' | 'power' | 'cold' | 'calls';
  name: string;
  text: string;
  period?: number;
}

export interface NodeDef {
  id: NodeId;
  name: string;
  x: number; // map coords (0..1000)
  y: number; // map coords (0..640)
  icon: string; // art key
  searches: number; // search tokens at setup
  flavor: string;
  tags?: NodeTag[];
}

export interface LocationPack {
  id: string;
  name: string;
  tagline: string;
  era: string;
  lore: string[]; // background story paragraphs
  nodes: NodeDef[];
  edges: [NodeId, NodeId][];
  exit: NodeId; // victims escorted here are saved
  lair: NodeId; // where any killer starts / returns
  heroineStart: NodeId;
  setupVictims: NodeId[]; // initial victim placements
  events: EventDef[];
  items: ItemDef[];
  palette: { sky: string; glow: string; accent: string };
  art: 'drivein' | 'coast' | 'hospital' | 'snow' | 'radio'; // backdrop renderer key
  rule: LocationRule;
}

export interface KillerPack {
  id: string;
  name: string;
  epithet: string;
  lore: string[];
  health: number;
  armor: number; // damage reduction per attack (before Finale)
  attackDice: number;
  attackThreshold: number;
  speed: number;
  frenzyAt: number; // bloodlust threshold → speed +1
  finaleAt: number; // bloodlust threshold → Finale
  bloodlustMax: number;
  finale: { name: string; text: string; effects: Effect[]; armor: number; attackDice: number; phases?: FinalePhase[] };
  events: EventDef[];
  terror: EventDef[]; // escalation deck: one card each time bloodlust crosses a multiple of terrorEvery
  terrorEvery: number;
  art: 'projectionist' | 'tidewife' | 'anesthetist' | 'snowblind' | 'caller'; // portrait renderer key
  weakness: { text: string }; // lore items (onGain killerArmor -1) strip armor
  items: ItemDef[]; // killer-specific items (weakness/lore) shuffled into the item deck
  quotes: string[];
}

export interface FinalePhase {
  name: string;
  text: string;
  health: number;
  effects: Effect[];
}

export type Difficulty = 'story' | 'standard' | 'nightmare';

export interface HeroineTraits {
  freeFirstMove?: boolean;
  searchDice?: number;
  barricadeCost?: number;
  barricadeStrength?: number;
  escortCap?: number;
  saveHorror?: number;
  ignoreFirstHorror?: boolean;
  fightDice?: number;
  hideDice?: number;
  coldImmune?: boolean;
  saveDraw?: number; // extra instincts drawn per rescue
  freeAnswer?: boolean; // answering a phone costs no nerve
}

export interface HeroineDef {
  id: string;
  name: string;
  title: string;
  bio: string;
  health: number;
  difficulty: 'Easy' | 'Normal' | 'Hard';
  passive: { name: string; text: string };
  traits: HeroineTraits;
  signature: InstinctDef;
  look: PortraitLook;
}

export interface PortraitLook {
  skin: string;
  hair: string;
  hairStyle: 'bob' | 'ponytail' | 'curls' | 'long' | 'pixie';
  accent: string;
  prop: 'apron' | 'ticket' | 'wrench' | 'whistle' | 'camera' | 'goggles' | 'headphones';
}

export interface EventDef {
  id: string;
  name: string;
  text: string;
  effects: Effect[];
  tone: 'dread' | 'calm' | 'killer' | 'victim';
  copies?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: 'weapon' | 'tool' | 'consumable' | 'lore';
  text: string;
  uses?: number; // undefined = permanent
  fightDice?: number; // passive bonus while held (weapons)
  searchDice?: number; // passive bonus while held
  use?: { when: 'anytime' | 'killerHere' | 'atNode'; node?: NodeId; effects: Effect[]; label: string };
  onGain?: Effect[]; // resolved when the item is found
  lore?: string;
  copies?: number;
}

export interface InstinctDef {
  id: string;
  name: string;
  text: string;
  effects: Effect[];
  copies?: number;
}

// ── Runtime state ────────────────────────────────────────────────────────────

export type Phase = 'event' | 'action' | 'killer' | 'over';
export type Outcome = 'slain' | 'survived' | 'died';

export interface HeldItem {
  uid: number;
  id: string;
  usesLeft?: number;
}

export interface HeldInstinct {
  uid: number;
  id: string;
}

export interface DiceRoll {
  id: number;
  label: string;
  dice: number[];
  threshold: number;
  successes: number;
  rerolled?: boolean;
}

export type Fx =
  | { t: 'killerAppears' }
  | { t: 'wound'; n: number }
  | { t: 'victimSlain'; at: NodeId }
  | { t: 'saved'; n: number }
  | { t: 'dice' }
  | { t: 'card' }
  | { t: 'hit'; n: number }
  | { t: 'finale' }
  | { t: 'item' }
  | { t: 'move' }
  | { t: 'hide' }
  | { t: 'win' }
  | { t: 'lose' }
  | { t: 'horror'; n: number }
  | { t: 'stun' }
  | { t: 'terror'; id: string }
  | { t: 'phase'; name: string }
  | { t: 'env'; text: string };

export interface LogEntry {
  round: number;
  text: string;
  tone?: 'bad' | 'good' | 'killer' | 'info';
}

export interface GameState {
  version: 1;
  seed: number;
  rng: number; // rng internal state
  uid: number;
  packs: { location: string; killer: string; heroine: string };
  difficulty: Difficulty;
  round: number;
  dawnAt: number;
  phase: Phase;
  outcome?: Outcome;

  heroine: {
    loc: NodeId;
    health: number;
    maxHealth: number;
    horror: number;
    nerve: number;
    items: HeldItem[];
    hand: HeldInstinct[];
    escorting: number;
    hidden: boolean;
    movedThisRound: number;
    horrorTakenThisRound: number;
    freeMoves: number;
  };
  killer: {
    loc: NodeId;
    health: number;
    maxHealth: number;
    armor: number;
    bloodlust: number;
    stunned: number;
    finale: boolean;
    frenzy: boolean;
    risen: boolean; // has used the "he gets back up" trope
    finalePhase: number; // index into finale.phases (-1 = main finale)
    attackBonus: number; // difficulty modifier
    lured?: NodeId;
  };
  victims: Record<NodeId, number>;
  searches: Record<NodeId, number>;
  barricades: Record<NodeId, number>;
  saved: number;
  slain: number;
  victimPool: number; // victims not yet on board
  mods: Partial<Record<RoundModKey, number>>;

  eventDeck: string[];
  eventDiscard: string[];
  itemDeck: string[];
  instinctDeck: string[];
  instinctDiscard: string[];
  terrorDeck: string[];
  env: { tideHigh: boolean; dark: boolean; ringing?: NodeId; cold: number };

  currentEvent?: string;
  lastRoll?: DiceRoll;
  foundLore: string[];
  log: LogEntry[];
  fx: Fx[];
}

export type Action =
  | { type: 'resolveEvent' }
  | { type: 'move'; to: NodeId }
  | { type: 'search' }
  | { type: 'lead' }
  | { type: 'fight' }
  | { type: 'hide' }
  | { type: 'barricade' }
  | { type: 'rest' }
  | { type: 'useItem'; uid: number }
  | { type: 'dropItem'; uid: number }
  | { type: 'playInstinct'; uid: number }
  | { type: 'answer' }
  | { type: 'endTurn' }
  | { type: 'resolveKiller' };

export interface Content {
  location: LocationPack;
  killer: KillerPack;
  heroine: HeroineDef;
  instincts: InstinctDef[];
}
