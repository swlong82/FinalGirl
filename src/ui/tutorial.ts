// Teaching, spread out. The first night opens with a short core (a 10-second
// pitch, then search, rescue, and the goal: about a minute); everything else is
// a one-time *lesson* that appears the first time its moment comes up, in the
// tutorial night or any other: the Shop on the first Shop, defending on his
// first attack, the clock when the first Terror card flips. One bubble at a
// time, each 20 words or fewer, with a spotlight on the thing it's about.
// "Do" bubbles close when the game shows the player did the thing; the others
// have "Got it", and the next lesson waits a moment after one so they never
// stack up. The tutorial scenario is staged in engine/tutorial.ts.
import { killerPortrait, victimIcon } from '../art/art';
import { glyph } from './glyphs';
import { sym } from './symbols';
import { advise } from '../engine/coach';
import { abilityUnlocked, actionDef, check, gimmick, isExit, killerSeen, npcAt, ruleAction } from '../engine/rules';
import type { Content, GameState } from '../engine/types';

/** Parts of the screen kept dim until a step introduces them. */
type Area = 'killer' | 'log' | 'clock' | 'phases' | 'rule';
const AREAS: Area[] = ['killer', 'log', 'clock', 'phases', 'rule'];

const CHAPTERS = ['Search', 'Rescue', 'Goal'] as const;
type Chapter = (typeof CHAPTERS)[number];

export interface TutStep {
  /** Lessons: the id remembered once it has been shown. */
  id?: string;
  /** Lessons: show this lesson the first time this is true. */
  trigger?: (s: GameState) => boolean;
  /** Core steps: lessons this step already covers (they won't repeat later). */
  teaches?: string[];
  chapter?: Chapter;
  title: string;
  text: string | ((s: GameState) => string);
  /** What to spotlight: a selector, or several (the first one on screen wins). */
  target?: string | string[] | ((s: GameState) => string | string[] | undefined);
  /** Present = a "do" step: it closes once this is true (`start` = the state when it opened). */
  done?: (s: GameState, start: GameState) => boolean;
  /** Present = wait, hidden, until this is true. */
  when?: (s: GameState) => boolean;
  /** Areas this step brings out of the dark. */
  reveal?: Area[];
  pitch?: boolean;
  /** Where the bubble would rather sit (default below the target). */
  prefer?: 'above' | 'below';
  /** Keep the bubble off this too (the panel around the target: its header, its other buttons). */
  avoid?: string;
  /** A location rule or killer mechanic: taught even to players who skipped the basics. */
  mechanic?: boolean;
}

/** The content of the game being taught (lessons name its cards and killer). */
let C: Content | undefined;
export function teachContent(c: Content) {
  C = c;
}

const inHand = (s: GameState, id: string) => s.heroine.hand.find((x) => x.id === id);
const cardSel = (id: string) => (s: GameState) => {
  const x = inHand(s, id);
  return x ? `[data-card="${x.uid}"]` : undefined;
};
const searched = (s: GameState) => s.heroine.items.length + s.heroine.pack.length > 0 || s.log.some((l) => /^(Look Around|Search|Ransack):/.test(l.text));
const armed = (s: GameState) => s.heroine.items.some((x) => x.id === 'tire-iron');
const calm = (s: GameState) => s.phase === 'action' && !s.pending && !s.outcome;
/** A card in hand with this tag she could play right now. */
const playable = (s: GameState, tag: string) =>
  C ? s.heroine.hand.find((x) => actionDef(C!, x.id).tags.includes(tag as never) && check(C!, s, { type: 'playCard', uid: x.uid }).ok) : undefined;
const cardName = (id: string) => (C ? actionDef(C, id).name : id);
/** The attack to point at: the one the coach would play, else the first she can. */
const bestAttack = (s: GameState) => {
  if (!C) return undefined;
  const a = advise(C, s).action;
  const pick = a.type === 'playCard' ? s.heroine.hand.find((x) => x.uid === a.uid) : undefined;
  return pick && actionDef(C, pick.id).tags.includes('attack') ? pick : playable(s, 'attack');
};

const star = `<svg viewBox="0 0 24 24" class="pf-star" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#f9c74f" stroke="#7a5200" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

const PITCH = `<div class="pitch-flow">
  <div class="pf"><div class="pf-i pf-v">${victimIcon()}</div><b>Rescue</b><span>survivors</span></div><i class="pf-arrow">→</i>
  <div class="pf"><div class="pf-i">${star}</div><b>Power up</b><span>every rescue helps</span></div><i class="pf-arrow">→</i>
  <div class="pf"><div class="pf-i pf-k">${killerPortrait({ art: 'projectionist' })}</div><b>Kill {him}</b><span>the only way to win</span></div>
</div>
<p class="pitch-sub">That’s the whole game. Learn the basics in a minute; the rest is explained when it comes up.</p>`;

const GOAL_TARGET = ['#goal-strip.on', '.goal-mini'];
const ROLL_TEXT = `${sym('dice')} A <b>5 or 6</b> hits. <b>2+</b> hits: the card’s big line. 1 hit: the small one. Click <b>Keep it</b>.`;

/** The first-night core: pitch, search, rescue, goal. */
export const STEPS: TutStep[] = [
  { pitch: true, title: 'Last Light in 10 seconds', text: PITCH },
  // ── Search ──
  {
    chapter: 'Search',
    title: 'Grab a weapon',
    text: 'You’re standing on an item pile. Play <b>Look Around</b> to search it.',
    target: cardSel('ac-look'),
    done: (s) => s.pending?.kind === 'roll' || searched(s) || s.round > 1,
  },
  {
    chapter: 'Search',
    title: 'Roll!',
    text: ROLL_TEXT,
    target: ['#overlay-root .dicetray.live .dice', '#overlay-root .dicetray.live'],
    avoid: '#overlay-root .dicetray.live',
    when: (s) => s.pending?.kind === 'roll',
    done: (s) => s.pending?.kind !== 'roll',
    teaches: ['roll'],
  },
  {
    chapter: 'Search',
    title: 'Keep the weapon',
    text: 'Tap the <b>Tire Iron</b>, then <b>Keep</b>. Weapons make your hits hurt.',
    target: (s) => {
      const i = s.pending?.kind === 'search' ? s.pending.drawn.indexOf('tire-iron') : -1;
      return i >= 0 ? `#overlay-root [data-spick="${i}"]` : '#overlay-root .search-ov';
    },
    avoid: '#overlay-root .search-ov',
    when: (s) => s.pending?.kind === 'search',
    done: (s) => s.pending?.kind !== 'search',
    teaches: ['search'],
  },
  // ── Rescue ──
  {
    chapter: 'Rescue',
    title: 'Someone needs you',
    text: (s) => (s.pending?.kind === 'move' ? 'Click the glowing <b>Parking Rows A</b>.' : 'A survivor is hiding next door, in <b>Parking Rows A</b>. Play <b>Walk</b>.'),
    target: (s) => (s.pending?.kind === 'move' ? '[data-node=lotA]' : (cardSel('ac-walk')(s) ?? '[data-kind=move]')),
    avoid: '[data-node=lotA]',
    done: (s) => s.heroine.loc !== 'concession' || s.saved > 0 || s.round > 1,
  },
  {
    chapter: 'Rescue',
    title: 'Get them out',
    text: 'The survivor follows you: see the green tag under you. Step onto the <b>EXIT</b>, the <b>Ticket Booth</b>.',
    target: '[data-node=gate]',
    done: (s) => s.saved > 0 || s.round > 1,
    teaches: ['escort'],
  },
  // ── Goal ──
  {
    chapter: 'Goal',
    title: 'Saved! Now you know',
    text: `Every rescue powers you up. From here, follow your ${glyph('target')} <b>goal</b>; <b>Show me</b> points at the move.`,
    target: GOAL_TARGET,
    reveal: AREAS,
    teaches: ['goal', 'rescued'],
  },
];

/** One-time lessons, in priority order: the first whose moment has come is shown. */
/** Mechanic lessons about this very turn (the bus is here, the fire is low). */
const NOW = ['rule-bus-here', 'rule-stoke', 'rule-override', 'gim-pose', 'gim-captives'];

export const LESSONS: TutStep[] = [
  // Time-sensitive nudges first: they only make sense this turn.
  ...MECHANICS().filter((x) => NOW.includes(x.id!)),
  {
    id: 'roll',
    title: 'Dice',
    text: ROLL_TEXT,
    target: ['#overlay-root .dicetray.live .dice', '#overlay-root .dicetray.live'],
    avoid: '#overlay-root .dicetray.live',
    trigger: (s) => s.pending?.kind === 'roll',
    done: (s) => s.pending?.kind !== 'roll',
  },
  {
    id: 'search',
    title: 'Your finds',
    text: 'Pick what to keep, then <b>Keep</b>. Weapons make your hits hurt.',
    target: '#overlay-root .search-ov [data-spick]',
    avoid: '#overlay-root .search-ov',
    trigger: (s) => s.pending?.kind === 'search',
    done: (s) => s.pending?.kind !== 'search',
  },
  {
    id: 'react',
    title: '{He} attacks!',
    text: (s) => {
      const r = s.heroine.hand.find((x) => C && actionDef(C, x.id).kind === 'reaction');
      return r ? `Play <b>${cardName(r.id)}</b> to block, or take the hit. Defend cards work only now, during {his} turn.` : 'No defend card in hand: take the hit. The Shop sells them for next time.';
    },
    target: ['#overlay-root [data-react]', '#overlay-root .react-ov'],
    avoid: '#overlay-root .react-ov',
    trigger: (s) => s.pending?.kind === 'reaction',
    done: (s) => s.pending?.kind !== 'reaction',
  },
  {
    id: 'histurn',
    title: '{His} turn, summed up',
    text: 'Every turn {he} moves and attacks, then a <b>Terror</b> card flips. Click <b>Next turn</b>.',
    target: ['#overlay-root .killerturn [data-act=endUpkeep]', '#overlay-root .killerturn'],
    avoid: '#overlay-root .killerturn',
    trigger: (s) => s.phase === 'upkeep' && !s.pending,
    done: (s) => s.phase !== 'upkeep',
  },
  {
    id: 'shop',
    title: 'The Shop',
    // Follows the coach, buy by buy, so the lesson, Hint and the shop's header always agree.
    text: (s) => {
      const a = C ? advise(C, s) : undefined;
      if (a?.action.type === 'buy') return `Played cards are gone: restock. ${a.why}`;
      return 'Your hand covers next turn. Click <b>Done</b>: it’s {his} turn.';
    },
    target: (s) => {
      const a = C ? advise(C, s).action : undefined;
      return a?.type === 'buy' ? `#overlay-root [data-buy="${a.id}"]` : '#overlay-root [data-act=endPlanning]';
    },
    trigger: (s) => s.phase === 'planning' && !s.pending,
    done: (s) => s.phase !== 'planning',
  },
  {
    id: 'fight',
    title: 'Fight back',
    text: (s) => {
      const x = bestAttack(s);
      const iron = s.staged && armed(s) && x && x.id === 'ac-fullswing' ? ': your Tire Iron adds +1' : '';
      return `{He}’s right here. Play <b>${x ? cardName(x.id) : 'an attack card'}</b>${iron}. {His} health to zero wins.`;
    },
    target: (s) => {
      const x = bestAttack(s);
      return x ? `[data-card="${x.uid}"]` : undefined;
    },
    trigger: (s) => calm(s) && s.killer.loc === s.heroine.loc && !!playable(s, 'attack'),
    done: (s, start) => s.discard.length > start.discard.length || s.killer.loc !== s.heroine.loc || s.phase !== 'action',
  },
  {
    id: 'goal',
    title: 'Your goal',
    text: `This ${glyph('target')} <b>goal</b> always says what to do next. Stuck? <b>Show me</b> points at the move.`,
    target: GOAL_TARGET,
    trigger: calm,
  },
  {
    id: 'escort',
    title: 'Survivors follow you',
    text: 'Survivors here walk with you when you move: the green tag counts them. Take them to an <b>EXIT</b>.',
    target: '#tok-fol',
    trigger: (s) => calm(s) && !!C && npcAt(s, s.heroine.loc) > 0 && !isExit(C, s.heroine.loc),
  },
  {
    id: 'rescued',
    title: 'Saved!',
    text: 'Every rescue powers you up: see your rescue track. Fill it to unlock your special ability.',
    target: ['#heroine-panel .rescue', '#sum-h'],
    trigger: (s) => calm(s) && s.heroine.rescued > 0,
  },
  {
    id: 'endturn',
    title: 'Done for now?',
    text: `When there’s nothing worth doing, click <b>End Action</b>. Leftover ${sym('nerve')} nerve goes to the Shop.`,
    target: '#bottombar [data-act=endAction]',
    prefer: 'above',
    trigger: (s) => calm(s) && !!C && advise(C, s).action.type === 'endAction',
    done: (s) => s.phase !== 'action',
  },
  {
    id: 'hp',
    title: 'Watch {his} health',
    text: (s) => `Hit! {He}’s down to <b>${s.killer.health}</b>. Bring {his} health to zero to win.`,
    target: ['#killer-panel .boss-hp', '#sum-k'],
    trigger: (s) => calm(s) && s.killer.health < s.killer.maxHealth,
  },
  {
    id: 'clock',
    title: 'The clock',
    text: 'One <b>Terror</b> card flips every turn. When all 10 are gone, the <b>Finale</b>: {he} hunts only you.',
    target: '.terror-clock',
    // Mid-turn, not on top of the Terror card that just flipped.
    trigger: (s) => calm(s) && s.terrorDiscard.length > 0 && s.discard.length > 0,
  },
  {
    id: 'horror',
    title: 'Horror',
    text: `The ${sym('horror')} eye is <b>horror</b>. Misses add it; the higher it climbs, the fewer dice you roll. <b>Calm</b> cards lower it.`,
    target: ['#bottombar .status'],
    trigger: (s) => calm(s) && s.heroine.horror >= 2,
  },
  {
    id: 'ability',
    title: 'Ability unlocked',
    text: () => `Your special ability, <b>${C?.heroine.ability.name ?? ''}</b>, is ready. Read it here; it works once a turn.`,
    target: ['#heroine-panel .ability.on', '#bottombar .items-btn'],
    trigger: (s) => calm(s) && !!C && abilityUnlocked(C, s) && !s.heroine.abilityUsed,
  },
  {
    id: 'finale',
    title: 'The Finale',
    text: 'The Terror cards are gone. {He} hunts only you now. Kill {him}: there’s no other way out.',
    target: '.terror-clock',
    trigger: (s) => calm(s) && s.killer.finale,
  },
  ...MECHANICS().filter((x) => !NOW.includes(x.id!)),
];

/** Where a location's tagged spot is on the map (the fire, the silo...). */
const tagNode = (tag: string) => (C ? C.location.nodes.filter((n) => n.tags?.includes(tag as never)).map((n) => `[data-node="${n.id}"]`) : []);
const rule = (kind: string) => C?.location.rule.kind === kind;
/** The location's own button, when she is standing where it works. */
const ruleBtn = (s: GameState) => (C && ruleAction(C) && check(C, s, { type: 'ruleAct' }).ok ? ['#bottombar [data-act=ruleAct]'] : []);

/**
 * One lesson per location rule and killer mechanic, the first time it matters.
 * Season 1's rules are here too, so every map teaches its own twist.
 */
function MECHANICS(): TutStep[] {
  const m = (x: TutStep): TutStep => ({ ...x, mechanic: true, target: x.target ?? '.rulechip' });
  return [
    // ── Location rules
    m({ id: 'rule-intermission', title: 'Intermission', text: 'Every 5th turn the projector stops for intermission: horror −1. The chip up top counts down.', trigger: (s) => calm(s) && rule('intermission') && s.round >= 2 }),
    m({ id: 'rule-tide', title: 'The tide', text: 'The tide turns every 4 turns. At <b>high tide</b>, stepping onto the shore costs 1 extra nerve.', trigger: (s) => calm(s) && rule('tide') && (s.round >= 3 || s.env.tideHigh) }),
    m({ id: 'rule-power', title: 'Blackouts', text: 'The power fails on and off. In the dark: searching is harder, hiding easier, and {he} moves 1 farther.', trigger: (s) => calm(s) && rule('power') && (s.env.dark || s.round >= 2) }),
    m({ id: 'rule-cold', title: 'The cold', text: 'End a turn outdoors and you get colder; at 3 cold you lose 1 health. End by a fire to thaw.', trigger: (s) => calm(s) && rule('cold') && s.round >= 1 && !C?.heroine.traits.coldImmune }),
    m({ id: 'rule-calls', title: 'The phones', text: 'A phone is ringing. Answer it there (<b>A</b>), or someone else picks up and {he} heads toward it.', target: (s) => (s.env.ringing ? [`[data-node="${s.env.ringing}"]`, '.rulechip'] : '.rulechip'), trigger: (s) => calm(s) && rule('calls') && !!s.env.ringing }),
    m({ id: 'rule-campfire', title: 'The campfire', text: 'While the fire burns, nobody can attack anyone in it. It burns down each turn: <b>Stoke</b> it there.', target: () => [...tagNode('fire'), '.rulechip'], trigger: (s) => calm(s) && rule('campfire') && !s.killer.finale }),
    m({ id: 'rule-stoke', title: 'Stoke the fire', text: 'The fire is low. You’re at it: <b>Stoke</b> it back up for 1 nerve.', target: (s) => [...ruleBtn(s), '.rulechip'], prefer: 'above', trigger: (s) => calm(s) && rule('campfire') && (s.env.fuel ?? 0) <= 1 && ruleBtn(s).length > 0 }),
    m({ id: 'rule-shutters', title: 'Security shutters', text: () => (C?.heroine.traits.gateKeys ? 'Red and blue <b>shutters</b> take turns coming down. Your keys open them; survivors running loose stay stuck.' : 'Red and blue <b>shutters</b> take turns coming down. A lock blocks you and survivors, never {him}.'), target: ['.gate-pin.down', '.rulechip'], trigger: (s) => calm(s) && rule('shutters') }),
    m({ id: 'rule-override', title: 'Override', text: 'You’re at the Security Office: <b>Override</b> swaps which shutters are down (1 nerve).', target: (s) => [...ruleBtn(s), '.rulechip'], prefer: 'above', trigger: (s) => calm(s) && rule('shutters') && ruleBtn(s).length > 0 }),
    m({ id: 'rule-bus', title: 'The last bus', text: 'The bus stops here every 3rd turn. Anyone waiting here then gets out, even without you.', target: () => [...tagNode('bus'), '.rulechip'], trigger: (s) => calm(s) && rule('bus') }),
    m({ id: 'rule-bus-here', title: 'The bus is here', text: 'The bus is waiting at the shelter. It leaves when you end your turn, with everyone there.', target: () => [...tagNode('bus'), '.rulechip'], trigger: (s) => calm(s) && rule('bus') && !!s.env.bus }),
    m({ id: 'rule-dj', title: 'The DJ', text: 'Each turn a new song: <b>fast</b>, <b>couples skate</b>, <b>strobe</b>. Each changes the odds for you both: check the chip.', trigger: (s) => calm(s) && rule('dj') }),
    m({ id: 'rule-corn', title: 'Lost in the corn', text: '{He}’s in the corn: you only see where you <b>last saw</b> {him}. Climb the silo to look out.', target: ['#tok-k', '.rulechip'], trigger: (s) => calm(s) && rule('corn') && !!C && !killerSeen(C, s) }),
    // ── Killer mechanics
    m({ id: 'gim-traps', title: 'Traps', text: '{He} leaves a steel <b>trap</b> wherever {he} has been. Step in: lose 1 health and stop. Walk around.', target: ['.badge.trap', '#killer-panel .gimmick', '#sum-k'], trigger: (s) => calm(s) && !!C && !!gimmick(C, 'traps') && (s.traps?.length ?? 0) > 0 }),
    m({ id: 'gim-pose', title: 'The mannequin', text: 'A <b>mannequin</b> marks where {he} strikes next turn. Get everyone out of there, or barricade it.', target: ['.badge.posed', '#killer-panel .gimmick', '#sum-k'], trigger: (s) => calm(s) && !!s.killer.posed }),
    m({ id: 'gim-captives', title: 'Taken alive', text: '{He} dragged someone to {his} lair, alive. Get there before the clock on it runs out to free them.', target: ['.badge.captive', '#killer-panel .gimmick', '#sum-k'], trigger: (s) => calm(s) && (s.captives?.length ?? 0) > 0 }),
    m({ id: 'gim-fear', title: 'Fear feeds {him}', text: 'At horror 5 {he} moves farther; at 6 {he} hits harder and heals. Keep your horror down.', target: ['#bottombar .status', '#killer-panel .gimmick'], trigger: (s) => calm(s) && !!C && !!gimmick(C, 'fear') && s.heroine.horror >= 4 }),
    m({ id: 'gim-stalk', title: 'Only when you move', text: '{He} moves exactly as far as you walk each turn. Walk less, and {he} only creeps.', target: ['#killer-panel .gimmick', '#sum-k'], trigger: (s) => calm(s) && !!C && !!gimmick(C, 'stalk') }),
  ];
}

/**
 * Phones pin the hand bar over the bottom of the page: if the target sits
 * under it, scroll the page so it's in the clear. True if it scrolled.
 */
export function clearOfBar(el: HTMLElement): boolean {
  const bar = document.getElementById('bottombar');
  if (!bar || bar.contains(el) || el.closest('.overlay') || getComputedStyle(bar).position !== 'fixed') return false;
  const top = bar.getBoundingClientRect().top;
  const r = el.getBoundingClientRect();
  if (r.bottom <= top - 8) return false;
  window.scrollBy({ top: r.bottom - top + 40, behavior: 'auto' });
  return true;
}

export class Tutorial {
  private i = -1;
  private steps: TutStep[] = STEPS;
  private root?: HTMLDivElement;
  private lastState?: GameState;
  private startState?: GameState; // the state when the current step opened
  private shown = -1; // the step whose target was last scrolled into view
  /**
   * `lesson`: a one-off bubble (no dimming, no chapters, no Skip).
   * `taught`: told which lessons a core step has just covered.
   */
  constructor(
    private onEnd: (finished: boolean) => void,
    private opts: { lesson?: boolean; taught?: (ids: string[]) => void } = {},
  ) {
    window.addEventListener('resize', () => this.place());
    // Capture catches scrolling inside panels too (the hand row, the shop), not just the page.
    document.addEventListener('scroll', () => this.place(), { passive: true, capture: true });
  }
  get active() {
    return this.i >= 0;
  }
  start(steps: TutStep[] = STEPS, s?: GameState) {
    this.steps = steps;
    this.i = 0;
    this.shown = -1;
    if (s) this.lastState = s;
    this.startState = this.lastState;
    if (!this.opts.lesson) document.body.classList.add('tut-on', ...AREAS.map((a) => `tut-dim-${a}`));
    this.render();
  }
  stop(finished = false) {
    if (this.i < 0) return;
    this.i = -1;
    this.root?.remove();
    this.root = undefined;
    if (!this.opts.lesson) document.body.classList.remove('tut-on', ...AREAS.map((a) => `tut-dim-${a}`));
    this.onEnd(finished);
  }
  /** Call after every game update. */
  sync(s: GameState) {
    this.lastState = s;
    if (this.i < 0) return;
    let step = this.steps[this.i];
    while (step?.done && step.done(s, this.startState ?? s)) {
      this.i++;
      this.startState = s;
      step = this.steps[this.i];
    }
    if (!step) return this.stop(true);
    this.render();
  }
  private next() {
    this.i++;
    this.startState = this.lastState;
    if (this.i >= this.steps.length) return this.stop(true);
    if (this.lastState) this.sync(this.lastState);
    else this.render();
  }
  private target(step: TutStep): HTMLElement | null {
    const t = typeof step.target === 'function' ? (this.lastState ? step.target(this.lastState) : undefined) : step.target;
    if (!t) return null;
    for (const sel of Array.isArray(t) ? t : [t]) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.getClientRects().length) return el;
    }
    return null;
  }
  private render() {
    const step = this.steps[this.i];
    if (!step) return;
    if (!this.root) {
      this.root = document.createElement('div');
      this.root.id = 'tut';
      document.body.appendChild(this.root);
    }
    for (const a of step.reveal ?? []) document.body.classList.remove(`tut-dim-${a}`);
    const s = this.lastState;
    const waiting = !!step.when && (!s || !step.when(s));
    this.root.classList.toggle('waiting', waiting);
    if (waiting) {
      this.root.innerHTML = '';
      return;
    }
    if (step.teaches) this.opts.taught?.(step.teaches);
    const isDo = !!step.done;
    const text = typeof step.text === 'function' ? (s ? step.text(s) : '') : step.text;
    const ch = step.chapter ? CHAPTERS.indexOf(step.chapter) : -1;
    const chapters = ch < 0 ? '' : `<div class="tut-chap">${CHAPTERS.map((c, n) => `<i class="${n < ch ? 'done' : n === ch ? 'on' : ''}" title="${c}"></i>`).join('')}<span>${step.chapter}</span></div>`;
    const last = this.i === this.steps.length - 1;
    const lesson = !!this.opts.lesson;
    const nextLabel = step.pitch ? 'Let’s go' : last && !lesson ? 'Play!' : 'Got it';
    const skip = lesson
      ? isDo
        ? '<button class="btn small tut-skip" data-tut="skip" title="Hide this tip">Hide</button>'
        : '<span class="tut-new">New</span>'
      : `<button class="btn small tut-skip" data-tut="skip">${step.pitch ? 'Skip tutorial' : 'Skip'}</button>`;
    this.root.classList.toggle('lesson', lesson);
    this.root.innerHTML = `<div class="tut-spot"></div>
      <div class="tut-card ${step.pitch ? 'pitch' : ''}" role="dialog" aria-live="polite">
        ${chapters}
        <h4>${step.title}</h4>
        <div class="tut-text">${text}</div>
        <div class="tut-row">
          ${skip}
          ${isDo ? '<span class="tut-do">do it to continue</span>' : `<button class="btn ${step.pitch ? '' : 'small'} primary" data-tut="next">${nextLabel}</button>`}
        </div>
      </div>`;
    this.root.querySelector('[data-tut=skip]')?.addEventListener('click', () => this.stop(false));
    this.root.querySelector('[data-tut=next]')?.addEventListener('click', () => this.next());
    // Keep re-placing for a moment: smooth scrolls and re-renders move the target after this frame.
    const until = performance.now() + 900;
    const settle = () => {
      this.place();
      if (performance.now() < until && this.root) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }
  /** Position the spotlight on the target and the card next to it. */
  place() {
    if (!this.root || this.i < 0 || this.root.classList.contains('waiting')) return;
    const step = this.steps[this.i];
    const spot = this.root.querySelector<HTMLDivElement>('.tut-spot');
    const card = this.root.querySelector<HTMLDivElement>('.tut-card');
    if (!spot || !card) return;
    const el = this.target(step);
    // A decision overlay (dice, search, reaction, shop) is up and this step isn't about it: step aside.
    const overlay = document.querySelector('#overlay-root .overlay');
    this.root.style.display = overlay && !step.pitch && !(el && overlay.contains(el)) ? 'none' : '';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = Math.min(step.pitch ? 520 : 340, vw - 32);
    if (!el) {
      spot.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`;
      card.style.cssText = `left:0;top:0;width:${cw}px;visibility:hidden`;
      const ch = card.offsetHeight || 200;
      card.style.cssText = `left:${Math.max(16, vw / 2 - cw / 2)}px;top:${Math.max(16, vh / 2 - ch / 2)}px;width:${cw}px`;
      return;
    }
    if (this.shown !== this.i) {
      this.shown = this.i;
      el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    if (clearOfBar(el)) return; // scrolled: the scroll event places us again
    const tr = el.getBoundingClientRect();
    if (tr.bottom < 0 || tr.top > vh) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const pad = 8;
    spot.style.cssText = `left:${tr.left - pad}px;top:${tr.top - pad}px;width:${tr.width + pad * 2}px;height:${tr.height + pad * 2}px`;
    // The bubble keeps off the target and anything it should leave readable around it.
    const av = step.avoid ? document.querySelector<HTMLElement>(step.avoid)?.getBoundingClientRect() : undefined;
    const r = av && av.width ? { left: Math.min(tr.left, av.left), top: Math.min(tr.top, av.top), right: Math.max(tr.right, av.right), bottom: Math.max(tr.bottom, av.bottom), width: 0, height: 0 } : { left: tr.left, top: tr.top, right: tr.right, bottom: tr.bottom, width: tr.width, height: tr.height };
    r.width = r.right - r.left;
    r.height = r.bottom - r.top;
    card.classList.remove('docked');
    card.style.cssText = `left:0;top:0;width:${cw}px;visibility:hidden`;
    let ch = card.offsetHeight || 200;
    const clampX = (x: number) => Math.min(vw - cw - 16, Math.max(16, x));
    const clampY = (y: number) => Math.min(vh - ch - 8, Math.max(8, y));
    // Never on top of the target: below or above (the step's preference first),
    // then beside; failing all three (a phone, a full-screen panel), shrink and
    // dock at the screen edge farther from it.
    const below = r.bottom + 16 + ch <= vh - 8 ? r.bottom + 16 : null;
    const above = r.top - 16 - ch >= 8 ? r.top - 16 - ch : null;
    let left = clampX(r.left + r.width / 2 - cw / 2);
    let top = step.prefer === 'above' ? (above ?? below) : (below ?? above);
    if (top === null) {
      const right = r.right + 16 + cw <= vw - 16 ? r.right + 16 : null;
      const leftSide = r.left - 16 - cw >= 16 ? r.left - 16 - cw : null;
      if (right !== null || leftSide !== null) {
        top = clampY(r.top + r.height / 2 - ch / 2);
        left = (right ?? leftSide)!;
      } else {
        card.classList.add('docked');
        ch = card.offsetHeight || 120;
        // Dock at whichever edge covers less of the target (top on a tie: panel headers matter least).
        const over = (y: number) => Math.max(0, Math.min(y + ch, tr.bottom) - Math.max(y, tr.top));
        const up = 8;
        const down = vh - ch - 8;
        top = over(down) < over(up) ? down : over(up) < over(down) ? up : r.top + r.height / 2 > vh * 0.4 ? up : down;
        left = clampX(vw / 2 - cw / 2);
      }
    }
    card.style.cssText = `left:${left}px;top:${top}px;width:${cw}px`;
  }
}
