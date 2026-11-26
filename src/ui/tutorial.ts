// The first night, taught by playing. One 10-second pitch, then short bubbles
// (20 words or fewer) that each appear the moment their idea matters: a
// spotlight on the one thing to click, and the game's other panels dimmed until
// they're introduced. "Do" steps advance when the game state shows the player
// did the thing; "when" steps wait, hidden, until their moment comes.
// The scenario it rides on is staged in engine/tutorial.ts.
import { killerPortrait, victimIcon } from '../art/art';
import { glyph } from './glyphs';
import { sym } from './symbols';
import type { GameState } from '../engine/types';

/** Parts of the screen kept dim until a step introduces them. */
type Area = 'killer' | 'log' | 'clock' | 'phases' | 'rule';
const AREAS: Area[] = ['killer', 'log', 'clock', 'phases', 'rule'];

const CHAPTERS = ['Search', 'Rescue', 'Shop', 'His turn', 'Fight'] as const;
type Chapter = (typeof CHAPTERS)[number];

export interface TutStep {
  chapter?: Chapter;
  title: string;
  text: string | ((s: GameState) => string);
  /** What to spotlight: a selector, or several (the first one on screen wins). */
  target?: string | string[] | ((s: GameState) => string | undefined);
  /** Present = a "do" step: it advances once this is true. */
  done?: (s: GameState) => boolean;
  /** Present = wait, hidden, until this is true. */
  when?: (s: GameState) => boolean;
  /** Areas this step brings out of the dark. */
  reveal?: Area[];
  pitch?: boolean;
  /** Where the bubble would rather sit (default below the target). */
  prefer?: 'above' | 'below';
}

// The tutorial runs on fixed content (the drive-in, the Projectionist, Rosa).
const ATTACKS = ['ac-fullswing', 'ac-desperate', 'ac-swing', 'ac-shove'];
const inHand = (s: GameState, id: string) => s.heroine.hand.find((x) => x.id === id);
const cardSel = (id: string) => (s: GameState) => {
  const x = inHand(s, id);
  return x ? `[data-card="${x.uid}"]` : undefined;
};
const attackCard = (s: GameState) => ATTACKS.map((id) => inHand(s, id)).find(Boolean);
const attackName = (id: string) => ({ 'ac-fullswing': 'Full Swing', 'ac-desperate': 'Desperate Strike', 'ac-swing': 'Swing', 'ac-shove': 'Shove' })[id] ?? 'an attack';
const searched = (s: GameState) => s.heroine.items.length + s.heroine.pack.length > 0 || s.log.some((l) => /^(Look Around|Search|Ransack):/.test(l.text));
const struck = (s: GameState) => s.discard.some((id) => ATTACKS.includes(id));
const armed = (s: GameState) => s.heroine.items.some((x) => x.id === 'tire-iron');

const star = `<svg viewBox="0 0 24 24" class="pf-star" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#f9c74f" stroke="#7a5200" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

const PITCH = `<div class="pitch-flow">
  <div class="pf"><div class="pf-i pf-v">${victimIcon()}</div><b>Rescue</b><span>survivors</span></div><i class="pf-arrow">→</i>
  <div class="pf"><div class="pf-i">${star}</div><b>Power up</b><span>every rescue helps</span></div><i class="pf-arrow">→</i>
  <div class="pf"><div class="pf-i pf-k">${killerPortrait({ art: 'projectionist' })}</div><b>Kill {him}</b><span>the only way to win</span></div>
</div>
<p class="pitch-sub">That’s the whole game. Learn it by playing one turn: about two minutes.</p>`;

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
    text: `${sym('dice')} A <b>5 or 6</b> is a hit. More hits, better result. Then click <b>Keep it</b>.`,
    target: ['#overlay-root .dicetray.live .dice', '#overlay-root .dicetray.live'],
    prefer: 'above',
    when: (s) => s.pending?.kind === 'roll',
    done: (s) => s.pending?.kind !== 'roll',
  },
  {
    chapter: 'Search',
    title: 'Keep the weapon',
    text: 'Tap the <b>Tire Iron</b>, then <b>Keep</b>. Weapons make your hits hurt.',
    target: (s) => {
      const i = s.pending?.kind === 'search' ? s.pending.drawn.indexOf('tire-iron') : -1;
      return i >= 0 ? `#overlay-root [data-spick="${i}"]` : '#overlay-root .search-ov';
    },
    prefer: 'above',
    when: (s) => s.pending?.kind === 'search',
    done: (s) => s.pending?.kind !== 'search',
  },
  // ── Rescue ──
  {
    chapter: 'Rescue',
    title: 'Your goal',
    text: `This ${glyph('target')} <b>goal</b> always says what to do next. Stuck? <b>Show me</b> points at the move.`,
    target: ['#goal-strip.on', '.goal-mini'],
  },
  {
    chapter: 'Rescue',
    title: 'Someone needs you',
    text: 'A survivor is hiding in <b>Parking Rows A</b>, next door. Play <b>Walk</b>.',
    target: (s) => cardSel('ac-walk')(s) ?? '[data-kind=move]',
    done: (s) => s.pending?.kind === 'move' || s.heroine.loc !== 'concession' || s.saved > 0 || s.round > 1,
  },
  {
    chapter: 'Rescue',
    title: 'Step by step',
    text: 'Click the glowing <b>Parking Rows A</b>.',
    target: '[data-node=lotA]',
    done: (s) => s.heroine.loc !== 'concession' || s.pending?.kind !== 'move' || s.round > 1,
  },
  {
    chapter: 'Rescue',
    title: 'Get them out',
    text: 'The survivor follows you: see the green tag under you. Step onto the <b>EXIT</b>, the <b>Ticket Booth</b>. Hurry!',
    target: '[data-node=gate]',
    done: (s) => s.saved > 0 || s.round > 1,
  },
  {
    chapter: 'Rescue',
    title: 'Saved!',
    text: 'Every rescue powers you up. This one: <b>+1 die</b> on attacks. Four unlock Rosa’s special ability.',
    target: '#heroine-panel .rescue',
  },
  {
    chapter: 'Rescue',
    title: 'Turn over',
    text: `Click <b>End Action</b>. Leftover ${sym('nerve')} <b>nerve</b> goes shopping.`,
    target: '[data-act=endAction]',
    done: (s) => s.phase !== 'action' || s.round > 1,
    reveal: ['phases'],
  },
  // ── Shop ──
  {
    chapter: 'Shop',
    title: 'Shop for the fight',
    text: (s) => (inHand(s, 'ac-fullswing') ? 'Got it. Now click <b>Done</b>: it’s {his} turn.' : `Cards you play are gone: buy what you’ll need. Get <b>Full Swing</b> (2${sym('nerve')}): your ${armed(s) ? 'Tire Iron' : 'weapon'} adds to it.`),
    target: (s) => (inHand(s, 'ac-fullswing') ? '#overlay-root [data-act=endPlanning]' : '#overlay-root [data-buy="ac-fullswing"]'),
    when: (s) => s.phase === 'planning',
    done: (s) => (s.phase !== 'planning' && s.phase !== 'action') || s.round > 1,
  },
  // ── His turn ──
  {
    chapter: 'His turn',
    title: '{He} attacks!',
    text: 'Play <b>Duck</b> to dodge. Defend cards work only now, during {his} turn.',
    target: ['#overlay-root [data-react]', '#overlay-root .react-ov'],
    when: (s) => s.pending?.kind === 'reaction',
    done: (s) => s.phase === 'upkeep' || s.round > 1,
    reveal: ['killer'],
  },
  {
    chapter: 'His turn',
    title: '{His} turn, summed up',
    text: 'Every turn {he} moves and attacks, then a <b>Terror</b> card flips. Click <b>Next turn</b>.',
    target: ['#overlay-root .killerturn [data-act=endUpkeep]', '#overlay-root .killerturn'],
    prefer: 'above',
    when: (s) => s.phase === 'upkeep',
    done: (s) => s.round > 1,
    reveal: ['killer'],
  },
  // ── Fight ──
  {
    chapter: 'Fight',
    title: 'Fight back',
    text: (s) => {
      const x = attackCard(s);
      return x ? `{He}’s right here. Play <b>${attackName(x.id)}</b>${armed(s) && x.id !== 'ac-shove' && x.id !== 'ac-swing' ? ': your Tire Iron adds +1' : ''}.` : '{He}’s right here. Play an attack card.';
    },
    target: (s) => {
      const x = attackCard(s);
      return x ? `[data-card="${x.uid}"]` : undefined;
    },
    when: (s) => s.phase === 'action' && !s.pending && s.killer.loc === s.heroine.loc,
    done: (s) => struck(s) || s.round > 2 || (s.round > 1 && s.phase === 'action' && !s.pending && s.killer.loc !== s.heroine.loc),
  },
  {
    chapter: 'Fight',
    title: 'Watch {his} health',
    text: (s) =>
      !struck(s)
        ? '{His} <b>health</b> is up here. Bring it to zero to win.'
        : s.killer.health < s.killer.maxHealth
          ? `Hit! {He}’s down to <b>${s.killer.health}</b>. Bring {his} health to zero to win.`
          : 'A miss: it happens. {His} <b>health</b> is up here. Zero wins.',
    target: ['#killer-panel .boss-hp', '#sum-k'],
    when: (s) => !s.pending,
    reveal: ['killer'],
  },
  {
    chapter: 'Fight',
    title: 'The clock',
    text: 'One <b>Terror</b> card flips every turn. When all 10 are gone, the <b>Finale</b>: {he} hunts only you.',
    target: '.terror-clock',
    reveal: ['clock'],
  },
  {
    chapter: 'Fight',
    title: 'You’ve got this',
    text: `Rescue to power up, then finish {him}. Follow your ${glyph('target')} <b>goal</b>, and press <b>Show me</b> whenever you’re unsure.`,
    target: ['#goal-strip.on', '.goal-mini'],
    reveal: AREAS,
  },
];

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
  private root?: HTMLDivElement;
  private lastState?: GameState;
  private shown = -1; // the step whose target was last scrolled into view
  constructor(private onEnd: (finished: boolean) => void) {
    window.addEventListener('resize', () => this.place());
    // Capture catches scrolling inside panels too (the hand row, the shop), not just the page.
    document.addEventListener('scroll', () => this.place(), { passive: true, capture: true });
  }
  get active() {
    return this.i >= 0;
  }
  start() {
    this.i = 0;
    this.shown = -1;
    document.body.classList.add('tut-on', ...AREAS.map((a) => `tut-dim-${a}`));
    this.render();
  }
  stop(finished = false) {
    if (this.i < 0) return;
    this.i = -1;
    this.root?.remove();
    this.root = undefined;
    document.body.classList.remove('tut-on', ...AREAS.map((a) => `tut-dim-${a}`));
    this.onEnd(finished);
  }
  /** Call after every game update. */
  sync(s: GameState) {
    this.lastState = s;
    if (this.i < 0) return;
    let step = STEPS[this.i];
    while (step?.done && step.done(s)) {
      this.i++;
      step = STEPS[this.i];
    }
    if (!step) return this.stop(true);
    this.render();
  }
  private next() {
    this.i++;
    if (this.i >= STEPS.length) return this.stop(true);
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
    const step = STEPS[this.i];
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
    const isDo = !!step.done;
    const text = typeof step.text === 'function' ? (s ? step.text(s) : '') : step.text;
    const ch = step.chapter ? CHAPTERS.indexOf(step.chapter) : -1;
    const chapters = ch < 0 ? '' : `<div class="tut-chap">${CHAPTERS.map((c, n) => `<i class="${n < ch ? 'done' : n === ch ? 'on' : ''}" title="${c}"></i>`).join('')}<span>${step.chapter}</span></div>`;
    const last = this.i === STEPS.length - 1;
    const nextLabel = step.pitch ? 'Let’s go' : last ? 'Play!' : 'Got it';
    this.root.innerHTML = `<div class="tut-spot"></div>
      <div class="tut-card ${step.pitch ? 'pitch' : ''}" role="dialog" aria-live="polite">
        ${chapters}
        <h4>${step.title}</h4>
        <div class="tut-text">${text}</div>
        <div class="tut-row">
          <button class="btn small tut-skip" data-tut="skip">${step.pitch ? 'Skip tutorial' : 'Skip'}</button>
          ${isDo ? '<span class="tut-do">do it to continue</span>' : `<button class="btn ${step.pitch ? '' : 'small'} primary" data-tut="next">${nextLabel}</button>`}
        </div>
      </div>`;
    this.root.querySelector('[data-tut=skip]')!.addEventListener('click', () => this.stop(false));
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
    const step = STEPS[this.i];
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
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const pad = 8;
    spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
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
        // Top by default (panel headers matter least); bottom when the target is up there.
        top = r.top + r.height / 2 > vh * 0.4 ? 8 : vh - ch - 8;
        left = clampX(vw / 2 - cw / 2);
      }
    }
    card.style.cssText = `left:${left}px;top:${top}px;width:${cw}px`;
  }
}
