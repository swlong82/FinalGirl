// ─────────────────────────────────────────────────────────────────────────────
// LAST LIGHT — engine types (v1.0 rules).
// Content (killers, locations, heroines, cards) is pure data; the engine
// interprets Effect ops through one ordered effect queue. New "features"
// (expansions) = new packs, no engine edits.
// ─────────────────────────────────────────────────────────────────────────────

export type NodeId = string;

/** Who a killer behavior instruction goes after. */
export type Who = 'npc' | 'heroine' | 'any';

/** Atomic, data-driven effect operations used by every card, item, track and rule. */
export type Effect =
  // ── board & survivors
  | { op: 'spawn'; at: NodeId | 'random' | 'farFromKiller' | 'nearKiller' | 'awayFromKiller'; n: number }
  | { op: 'rally'; n: number } // pull up to n survivors from adjacent locations into hers
  | { op: 'panic'; at: 'killer' | 'heroine' } // survivors there panic right now
  | { op: 'spawnSpecial'; id: string; at: NodeId | 'random' | 'farFromKiller' | 'nearKiller' } // a named survivor joins the board
  | { op: 'spawnMinion'; at: 'killer' | 'lair' | 'nearKiller' | 'nearHeroine' | 'random'; n: number } // up to the minion limit
  | { op: 'minionsAct' } // every minion takes its behavior now
  | { op: 'enemiesAct' } // minions, then the killer, take their behavior now
  // ── the heroine
  | { op: 'move'; n: number } // n movement points; she chooses the route and may stop early
  | { op: 'search'; draw: number; keep: number } // from this location's item pile
  | { op: 'horror'; n: number }
  | { op: 'heal'; n: number }
  | { op: 'wound'; n: number } // direct health loss: never an attack, so reactions can't stop it
  | { op: 'nerve'; n: number }
  | { op: 'hide' } // hidden until the end of the killer phase
  | { op: 'barricade'; at: 'here' | 'around' | NodeId; strength: number } // around: every location next to her
  | { op: 'teleportHeroine'; to: NodeId | 'exit' } // survivors with her (up to her escort limit) come too
  | { op: 'drawItem'; n: number } // from the spare pile (items not dealt to search piles)
  | { op: 'resolve'; n: number } // permanent +n dice on attack rolls
  | { op: 'mod'; key: ModKey; n: number } // until the killer's next behavior is done
  | { op: 'warm' }
  | { op: 'endPhase' }
  // ── Season 2 location rules (each is a no-op where its rule isn't in play)
  | { op: 'fuel'; n: number } // The Campfire: feed the fire (fuel is capped at 3)
  | { op: 'gates' } // Security Shutters: swap which set is down
  | { op: 'bus' } // The Last Bus: the bus stops at the shelter this turn
  | { op: 'song' } // The DJ's Set: skip to the next song
  | { op: 'reveal' } // The Corn: she can see the killer until the end of the turn
  // ── Season 2 killer gimmicks
  | { op: 'trap'; at: 'nearHeroine' | 'killer' } // a steel trap is set there
  | { op: 'pose'; who: Who } // a mannequin marks where he strikes next
  | { op: 'strikePose' } // he appears at his mannequin and attacks (or hunts, if none is posed)
  // ── attacks & defense
  | { op: 'damage'; n: number } // her attack: a weapon and lore add to it if it deals at least 1
  | { op: 'killerDamage'; n: number } // flat damage to the killer (items); no modifiers
  | { op: 'counter'; n: number } // reaction: flat damage to whoever is attacking her
  | { op: 'block'; n: number } // reaction: reduce the incoming attack by n (99 = cancel it)
  // ── the killer
  | { op: 'bloodlust'; n: number }
  | { op: 'killerHeal'; n: number }
  | { op: 'killerStun'; n: number } // he skips that many behavior steps
  | { op: 'killerMove'; toward: 'heroine' | 'lair' | NodeId; steps: number }
  | { op: 'killerTeleport'; to: 'lair' | 'random' | 'heroine' | NodeId }
  | { op: 'target'; who: Who } // pick his target (closest; ties → most survivors → tie-break policy)
  | { op: 'hunt'; extra?: number } // move his Movement Value toward the target; stops on arrival
  | { op: 'attack'; n?: number; who?: 'heroine' } // n separate attacks on someone in his location
  | { op: 'revealPower' }
  | { op: 'event' } // reveal the next location Event card (ongoing)
  | { op: 'if'; cond: Condition; then: Effect[]; else?: Effect[] }
  | { op: 'log'; text: string }
  // ── internal sequencing (never used by content)
  | { op: '_strike'; who?: 'heroine' | 'npc' | 'any'; by?: number } // by = minion uid
  | { op: '_minion'; uid: number }
  | { op: '_minionsAll' }
  | { op: '_reactDone' }
  | { op: '_clearMods' }
  | { op: '_terror' }
  | { op: '_phase'; to: 'panic' | 'upkeep' }
  | { op: '_behavior' }
  | { op: '_finaleCheck' }
  | { op: '_rule'; when: 'upkeep' };

export type Condition =
  | { c: 'killerHere' }
  | { c: 'killerAdjacent' }
  | { c: 'heroineAt'; node: NodeId }
  | { c: 'alone' } // no survivors with her
  | { c: 'survivorsHere' }
  | { c: 'finale' }
  | { c: 'hurt' }
  | { c: 'horrorAtLeast'; n: number };

/** Temporary modifiers. Cleared once the killer's behavior has resolved each turn. */
export type ModKey =
  | 'rollDice' // every Horror Roll
  | 'searchDice'
  | 'attackDice'
  | 'hideDice'
  | 'damage' // +n to her next attack that deals at least 1
  | 'rerollNext' // her next roll rerolls every die that isn't a success
  | 'killerAttack'
  | 'killerMove';

export type NodeTag =
  | 'outdoor'
  | 'warm'
  | 'shore'
  | 'phone'
  // Season 2
  | 'fire' // The Campfire: a haven while it burns
  | 'switch' // Security Shutters: the override panel
  | 'bus' // The Last Bus: an exit only while the bus waits
  | 'booth' // The DJ's Set: skip the song here
  | 'corn' // The Corn: he can't be seen here from more than 1 step away
  | 'lookout'; // The Corn: look out over the maze here

/** One signature rule per location, interpreted by the engine. */
export interface LocationRule {
  kind: 'intermission' | 'tide' | 'power' | 'cold' | 'calls' | 'campfire' | 'shutters' | 'bus' | 'dj' | 'corn';
  name: string;
  text: string;
  period?: number;
  /** Security Shutters: two sets of edges; the set at env.gate is down. */
  gates?: [NodeId, NodeId][][];
}

export interface NodeDef {
  id: NodeId;
  name: string;
  x: number; // map coords (0..1000)
  y: number; // map coords (0..640)
  icon: string; // art key
  flavor: string;
  search?: boolean; // has an item pile
  exit?: boolean; // survivors here with her are rescued
  /** Panic table: die face 1–6 → the neighbor a panicking survivor runs to (null = freezes). Derived from the edges when omitted. */
  panic?: (NodeId | null)[];
  tags?: NodeTag[];
}

/** A named survivor with an exception to the normal survivor rules (spec §16). */
export interface SpecialDef {
  id: string;
  name: string;
  flavor: string;
  text: string; // the exception, as printed
  /** toExit: walks 1 toward the nearest exit each Upkeep. heavy: counts as 2 when following.
   *  still: never panics. loud: each Upkeep he's not with her, the killer's next target is him.
   *  wander: each Upkeep she's not with him, he wanders to a neighbor (never into the killer).
   *  medic: each Upkeep she is with them, she heals 1. brave: when an enemy attacks where he
   *  stands, he hits it first for 1. */
  trait: 'toExit' | 'heavy' | 'still' | 'loud' | 'wander' | 'medic' | 'brave';
  rescue: Effect[]; // extra reward when rescued (on top of the rescue slot)
  death: Effect[]; // consequence when eliminated (on top of bloodlust +1)
}

/** Subordinate enemies (spec §17). */
export interface MinionDef {
  name: string; // singular
  plural: string;
  text: string;
  health: number;
  move: number;
  attack: number;
  max: number; // tokens available; extra spawns are ignored
  who: Who; // what each one targets
  order: 'before' | 'after'; // relative to the killer's behavior in the Killer phase
  frozenWhenSeen?: boolean; // one in her location or next to it can't move or attack
}

/** Season 2: one signature mechanic per killer. It never names a location's nodes. */
export type Gimmick =
  | { kind: 'traps'; name: string; text: string; max: number } // leaves a trap where he was each time he moves
  | { kind: 'pose'; name: string; text: string } // telegraphs his next strike with a mannequin
  | { kind: 'captives'; name: string; text: string; max: number; timer: number } // takes survivors to {his} lair alive
  | { kind: 'fear'; name: string; text: string } // her horror powers him
  | { kind: 'stalk'; name: string; text: string; max: number }; // moves as far as she walked

export interface SetupCard {
  heroine: NodeId;
  killer: NodeId;
  npcs: NodeId[];
}

export interface LocationPack {
  id: string;
  name: string;
  tagline: string;
  era: string;
  lore: string[];
  nodes: NodeDef[];
  edges: [NodeId, NodeId][];
  lair: NodeId; // where the killer returns
  setups: SetupCard[]; // one is picked at random
  terror: EventDef[]; // location Terror cards (shuffled with the killer's)
  events: EventDef[]; // ongoing Event cards: one is revealed at setup
  specials: SpecialDef[]; // named survivors, brought in by the location's cards
  items: ItemDef[];
  palette: { sky: string; glow: string; accent: string };
  art: 'drivein' | 'coast' | 'hospital' | 'snow' | 'radio' | 'camp' | 'mall' | 'motel' | 'rink' | 'farm';
  rule: LocationRule;
}

export interface BloodlustLevel {
  move: number;
  attack: number;
  name?: string;
  text?: string;
  effects?: Effect[]; // resolved the moment this level is reached
}

export interface Behavior {
  text: string;
  effects: Effect[];
}

export interface KillerPack {
  id: string;
  name: string;
  epithet: string;
  lore: string[];
  health: number; // printed maximum, including the hidden final-health token
  horror: number; // the heroine's starting Horror Level
  bloodlust: { levels: BloodlustLevel[]; revealAt: number; max: { text: string; effects: Effect[] } };
  behavior: Behavior; // initial behavior instruction
  power: { name: string; text: string; health: number; attack?: number; move?: number; effects?: Effect[]; upkeep?: Effect[] };
  finale: { name: string; text: string; effects: Effect[]; behavior: Behavior; attack?: number; move?: number; upkeep?: Effect[] };
  revive: { name: string; text: string; effects: Effect[] }; // when his final-health token shows a number
  terror: EventDef[]; // killer Terror cards (shuffled with the location's)
  minions?: MinionDef;
  art: 'projectionist' | 'tidewife' | 'anesthetist' | 'snowblind' | 'caller' | 'trapper' | 'dresser' | 'manager' | 'mirrorball' | 'harvestman';
  gimmick?: Gimmick;
  weakness: { text: string };
  items: ItemDef[]; // lore items, always dealt into the search piles
  quotes: string[];
  pronoun?: 'he' | 'she'; // fills {he}/{him}/{his} in shared text (default he)
}

export type Difficulty = 'story' | 'standard' | 'nightmare';
export type TieBreak = 'adverse' | 'plausible' | 'comedic' | 'random';

export interface HeroineTraits {
  moveBonus?: number; // first move effect each turn gets +n
  searchDice?: number;
  barricadeDiscount?: number;
  barricadeStrength?: number;
  escortCap?: number; // survivors she can bring along (default 2)
  ignoreFirstHorror?: boolean;
  attackDice?: number;
  hideDice?: number;
  moveDice?: number;
  reactDice?: number;
  coldImmune?: boolean;
  freeAnswer?: boolean;
  durableWeapons?: boolean; // weapons don't spend uses
  // Season 2
  trapSense?: boolean; // traps never hurt or stop her: she springs them safely
  rallyBonus?: number; // rally effects call n more
  gateKeys?: boolean; // shutters never stop her or the survivors with her
  handSlots?: number; // hand slots (default 2)
  lightBonus?: number; // light attacks (Shove, Swing) deal +n
  cornSight?: boolean; // the corn never hides the killer from her
}

export interface RescueSlot {
  text: string;
  effects: Effect[];
}

export interface HeroineDef {
  id: string;
  name: string;
  title: string;
  bio: string;
  health: number; // including the hidden final-health token
  difficulty: 'Easy' | 'Normal' | 'Hard';
  passive: { name: string; text: string };
  traits: HeroineTraits;
  rescue: { slots: RescueSlot[]; repeat: RescueSlot };
  ability: { name: string; text: string; effects: Effect[]; when?: 'killerHere' };
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
  ongoing?: Partial<Record<ModKey, number>>; // Event cards: permanent modifiers
  upkeep?: Effect[]; // Event cards: resolved every upkeep
}

export interface ItemDef {
  id: string;
  name: string;
  kind: 'weapon' | 'tool' | 'consumable' | 'lore';
  text: string;
  hands: 0 | 1 | 2; // 0 = works from the backpack
  uses?: number; // undefined = permanent
  damage?: number; // weapons: + damage when an attack deals at least 1
  range?: number[]; // weapons: distances it reaches (default [0])
  searchDice?: number; // tools: + dice on search cards
  use?: { when: 'anytime' | 'killerHere' | 'killerNear' | 'atNode'; node?: NodeId; effects: Effect[]; label: string };
  onGain?: Effect[];
  lore?: string;
  copies?: number;
}

export type CardTag = 'move' | 'search' | 'attack' | 'hide' | 'heal' | 'calm' | 'barricade' | 'nerve' | 'lure' | 'rally' | 'focus' | 'reaction';

export interface ActionCardDef {
  id: string;
  name: string;
  cost: number;
  kind: 'action' | 'reaction';
  tags: CardTag[];
  roll: boolean; // false: resolve `always` with no Horror Roll
  dice?: number; // bonus dice
  light?: boolean; // attack that weapons, lore and focus don't add to
  req?: 'killerHere' | 'killerAway' | 'searchSpace' | 'reach' | 'survivorsNear';
  great?: Effect[]; // two or more successes
  good?: Effect[]; // exactly one success
  fail?: Effect[];
  always?: Effect[];
  flavor: string;
  copies: number; // tableau pile size
  starter?: boolean; // one copy starts in her hand
}

// ── Runtime state ────────────────────────────────────────────────────────────

export type Phase = 'action' | 'planning' | 'hunter' | 'panic' | 'upkeep' | 'over';
export type Outcome = 'slain' | 'died';

export interface HeldItem {
  uid: number;
  id: string;
  usesLeft?: number;
}

export interface Card {
  uid: number;
  id: string;
}

export interface DiceRoll {
  id: number;
  label: string;
  dice: number[];
  converted: number[]; // indices of partials bought up to successes
  successes: number;
  partials: number;
  band: 'great' | 'good' | 'fail';
  rerolled?: boolean;
  parts?: [string, number][]; // where the dice came from
}

export type Pending =
  | { kind: 'move'; left: number }
  | { kind: 'roll'; card: string; reaction: boolean }
  | { kind: 'search'; node: NodeId; drawn: string[]; keep: number }
  | { kind: 'reaction' }
  | { kind: 'aim'; base: number; range: number; killer: boolean };

export type Fx =
  | { t: 'killerAppears' }
  | { t: 'minion'; n: number }
  | { t: 'wound'; n: number }
  | { t: 'victimSlain'; at: NodeId }
  | { t: 'saved'; n: number }
  | { t: 'dice' }
  | { t: 'card' }
  | { t: 'hit'; n: number }
  | { t: 'damage'; parts: [string, number][]; light: boolean } // how her hit on him added up
  | { t: 'finale' }
  | { t: 'item' }
  | { t: 'move' }
  | { t: 'hide' }
  | { t: 'win' }
  | { t: 'lose' }
  | { t: 'horror'; n: number }
  | { t: 'stun' }
  | { t: 'terror'; id: string }
  | { t: 'event'; id: string }
  | { t: 'power' }
  | { t: 'revive'; who: 'heroine' | 'killer'; n: number }
  | { t: 'bloodlust'; level: number }
  | { t: 'unlock' }
  | { t: 'env'; text: string; src?: 'killer'; msg?: string }; // src: the killer's mechanic, not the location's rule; msg: a full sentence for the toast

export interface LogEntry {
  round: number;
  text: string;
  tone?: 'bad' | 'good' | 'killer' | 'info';
}

export interface Pile {
  cards: string[]; // index 0 = top
  up: boolean; // top card face up
}

export interface GameState {
  version: 2;
  seed: number;
  rng: number;
  uid: number;
  packs: { location: string; killer: string; heroine: string };
  difficulty: Difficulty;
  tiebreak: TieBreak;
  round: number; // the current turn
  phase: Phase;
  outcome?: Outcome;

  heroine: {
    loc: NodeId;
    health: number; // ordinary health (the final-health token is separate)
    maxHealth: number; // ordinary maximum
    token: number | null; // hidden final-health token; null once revealed
    horror: number;
    nerve: number;
    hand: Card[];
    items: HeldItem[]; // hand slots
    pack: HeldItem[]; // backpack
    hidden: boolean;
    rescued: number; // rescue slots filled (and beyond)
    resolve: number;
    abilityUsed: boolean;
    movesThisTurn: number;
    horrorTakenThisTurn: number;
    overflowRound?: number; // the turn her horror last spilled over into his bloodlust (once a turn)
    broke: boolean; // nerve went below zero this Action phase
    bring: number; // how many survivors (in total) she tries to bring
    leave: string[]; // named survivors she has asked to stay put // how many survivors she tries to bring when she moves
    stepsThisTurn?: number; // steps walked this turn (the Harvestman moves that far)
  };
  killer: {
    loc: NodeId;
    health: number;
    maxHealth: number;
    token: number | null;
    bloodlust: number;
    stunned: number;
    finale: boolean;
    power: 'hidden' | 'active' | 'spent';
    powerHealth: number;
    attackBonus: number;
    target?: NodeId;
    lured?: NodeId;
    posed?: NodeId; // the Window Dresser's mannequin: where he strikes next
  };
  victims: Record<NodeId, number>; // ordinary survivors
  specials: { id: string; at: NodeId }[]; // named survivors on the board
  specialsGone: { id: string; how: 'rescued' | 'dead' }[];
  minions: { uid: number; loc: NodeId; health: number }[];
  barricades: Record<NodeId, number>;
  saved: number;
  slain: number;
  slainThisTurn: number;
  victimPool: number;
  mods: Partial<Record<ModKey, number>>;

  tableau: Record<string, number>; // copies available per action-card pile
  discard: string[]; // cards played or discarded since the last Planning phase
  terrorDeck: string[];
  terrorDiscard: string[];
  eventDeck: string[];
  events: string[]; // ongoing Events in play
  piles: Record<NodeId, Pile>;
  spare: string[];

  queue: Effect[];
  pending?: Pending;
  attack?: { damage: number; by?: number };
  rolling?: { uid: number; dice: number[]; converted: number[]; card: string; reaction: boolean; range: number };
  rearrange: boolean; // she may rearrange items (just gained one, or Upkeep)
  env: {
    tideHigh: boolean;
    dark: boolean;
    ringing?: NodeId;
    cold: number;
    // Season 2
    fuel?: number; // The Campfire: 0–3
    gate?: number; // Security Shutters: which set is down (index into rule.gates)
    bus?: boolean; // The Last Bus: the bus is waiting this turn
    song?: number; // The DJ's Set: 0 fast, 1 couples skate, 2 strobe
    seen?: NodeId; // The Corn: where she last saw him
    revealed?: number; // The Corn: the turn she looked out (she sees him all that turn)
    ruleTurn?: number; // the turn she last used the location's action
  };
  traps?: NodeId[]; // the Trapper's traps
  captives?: { id?: string; timer: number; taken: number }[]; // held in the killer's lair (id = a named survivor; timer = her Action phases left)

  down?: { heroine?: boolean; killer?: boolean }; // deaths in the current resolution
  lastRoll?: DiceRoll;
  lastTerror?: string;
  foundLore: string[];
  log: LogEntry[];
  fx: Fx[];
  /** The staged first-night tutorial game (lessons use its scripted moments). */
  staged?: boolean;
}

export type Action =
  | { type: 'playCard'; uid: number }
  | { type: 'discardForNerve'; uid: number }
  | { type: 'step'; to: NodeId }
  | { type: 'stopMove' }
  | { type: 'setBring'; n: number }
  | { type: 'convert'; die: number; discard: [number, number] }
  | { type: 'resolveRoll' }
  | { type: 'keep'; picks: number[] }
  | { type: 'react'; uid: number }
  | { type: 'takeHit' }
  | { type: 'aim'; at: 'killer' | 'minions'; split?: Record<number, number> }
  | { type: 'toggleFollow'; id: string }
  | { type: 'useItem'; uid: number }
  | { type: 'useAbility' }
  | { type: 'ready'; uid: number; swapOut?: number[] }
  | { type: 'stow'; uid: number }
  | { type: 'dropItem'; uid: number }
  | { type: 'answer' }
  | { type: 'ruleAct' } // the location's own action (stoke, override, skip the song, look out)
  | { type: 'endAction' }
  | { type: 'buy'; id: string }
  | { type: 'endPlanning' }
  | { type: 'endUpkeep' };

export interface Content {
  location: LocationPack;
  killer: KillerPack;
  heroine: HeroineDef;
  actions: ActionCardDef[];
}
