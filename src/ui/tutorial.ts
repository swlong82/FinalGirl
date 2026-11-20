// Interactive coach-mark tutorial: a spotlight on the element that matters and
// a card that explains it. "info" steps advance with Next; "do" steps advance
// when the game state shows the player actually did the thing.
import type { GameState } from '../engine/types';

export interface TutStep {
  title: string;
  text: string;
  target?: string; // CSS selector to spotlight
  done?: (s: GameState) => boolean; // present = "do" step
}

export const STEPS: TutStep[] = [
  {
    title: 'Welcome to your first night',
    text: 'You are <b>Rosa</b>, working the snack bar on the Holloway Drive-In’s last night. A killer is loose on the lot. <b>You win</b> by killing him in the Finale or surviving until <b>dawn</b>. Save as many people as you can along the way.',
  },
  {
    title: 'Every round starts with an event',
    text: 'Events bring new survivors, bad weather, or the killer. This one helps you: <b>Harvest Moon</b> gives your searches an extra die. Click <b>Continue</b>.',
    target: '#overlay-root .card .btn',
    done: (s) => s.phase !== 'event' || s.round > 1,
  },
  {
    title: 'You',
    text: '<b>Hearts</b> are your health. <b>Horror</b> builds as things go wrong and makes dice harder. <b>Nerve</b> (gold coins) pays for everything. It <b>carries over</b> between rounds (up to 8), so saving some for a bad moment is smart. Spend too much in one round and you make <b>noise</b>, which draws him toward you.',
    target: '#heroine-panel',
  },
  {
    title: 'Him',
    text: 'The Projectionist is in his booth for now. Every survivor he kills raises his <b>bloodlust</b>. At the dashed marks he speeds up, and then the <b>Finale</b> begins and he comes for you.',
    target: '#killer-panel',
  },
  {
    title: 'The lineup',
    text: 'Each round, 6 action cards are dealt face up. <b>Take up to 3, for free.</b> You pay nerve later, when you play them. Take <b>Search</b>, <b>Lead</b> and one more you like.',
    target: '.draft',
    done: (s) => s.picksLeft === 0 || s.round > 1,
  },
  {
    title: 'Your hand',
    text: 'Your cards wait down here, ready to play. Getting hurt puts <b>Bleeding</b> cards in your hand, and they take up slots until you rest. Every marker on the map is explained under <b>Map key</b>, and you can hover any location for details.',
    target: '.actions',
  },
  {
    title: 'Search for something useful',
    text: 'Play your <b>Search</b> card. It costs 1 nerve and rolls dice; each die showing the target number or higher finds an item.',
    target: '[data-kind=search]',
    done: (s) => (s.searches.concession ?? 3) < 3 || s.round > 1,
  },
  {
    title: 'Someone needs you',
    text: 'There is a survivor in <b>Parking Rows A</b> (the little figure). Moving is always available: click a glowing location. Rosa’s first move each round is <b>free</b>. Survivors left alone start to <b>panic</b> (the ! badge) and run off, so don’t make them wait.',
    target: '[data-node=lotA]',
    done: (s) => s.heroine.loc === 'lotA' || s.saved > 0,
  },
  {
    title: '“Stay close to me.”',
    text: '<b>Lead</b> (1 nerve) brings the survivors here with you. They follow wherever you go.',
    target: '[data-kind=lead]',
    done: (s) => s.heroine.escorting > 0 || s.saved > 0,
  },
  {
    title: 'Get them out',
    text: 'The <b>Ticket Booth</b> (green ring) is the exit. Walk your survivor there to save them. Saving people calms you and draws an Instinct card.',
    target: '[data-node=gate]',
    done: (s) => s.saved > 0,
  },
  {
    title: 'Instinct cards',
    text: 'These are free to play at any time: extra nerve, rerolls, healing, bracing for a hit. You draw one every round. Keep them for when things go wrong.',
    target: '.hand',
  },
  {
    title: 'End your turn',
    text: 'Click <b>End Turn</b>. Any nerve you didn’t spend stays in the bank for next round. Then the killer acts.',
    target: '[data-act=endTurn]',
    done: (s) => s.phase === 'killer' || s.round > 1,
  },
  {
    title: 'His turn',
    text: 'You will always see what he did. He hunts the nearest prey: you or a survivor. If he reaches survivors, he kills one. Click <b>Next round</b>.',
    target: '#overlay-root .killerturn .btn',
    done: (s) => s.round > 1,
  },
  {
    title: 'When he finds you',
    text: 'If you share a location with him, your options depend on your hand: <b>Fight</b> (weapons add dice), <b>Hide</b> (he might still find you), or <b>flee</b> (moving away costs 2 nerve). Items like flares stun him. Banked nerve is what saves you here.',
    target: '#heroine-panel .nerve',
  },
  {
    title: 'Every place has a rule',
    text: 'Here it is <b>Intermission</b>: every 4th round the projector stops and you get a breather. Other locations have tides, blackouts, freezing cold or ringing phones. Click this chip any time to read the rules.',
    target: '.rulechip',
  },
  {
    title: 'You’re on your own now',
    text: 'The clock at the top counts down to dawn. Stuck? Press <b>Hint</b> (H). Made a mistake? <b>Undo</b> (Z) works until you roll dice. This is <b>Matinee</b> difficulty, so take your time. Good luck.',
    target: '.clock',
  },
];

export class Tutorial {
  private i = -1;
  private root?: HTMLDivElement;
  private lastState?: GameState;
  constructor(private onEnd: (finished: boolean) => void) {
    window.addEventListener('resize', () => this.place());
    window.addEventListener('scroll', () => this.place(), { passive: true });
  }
  get active() {
    return this.i >= 0;
  }
  start() {
    this.i = 0;
    this.render();
  }
  stop(finished = false) {
    if (this.i < 0) return;
    this.i = -1;
    this.root?.remove();
    this.root = undefined;
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
  private render() {
    const step = STEPS[this.i];
    if (!step) return;
    if (!this.root) {
      this.root = document.createElement('div');
      this.root.id = 'tut';
      document.body.appendChild(this.root);
    }
    const isDo = !!step.done;
    this.root.innerHTML = `<div class="tut-spot"></div>
      <div class="tut-card" role="dialog" aria-live="polite">
        <div class="tut-step">First night · ${this.i + 1}/${STEPS.length}</div>
        <h4>${step.title}</h4>
        <p>${step.text}</p>
        <div class="tut-row">
          <button class="btn small" data-tut="skip">Skip tutorial</button>
          ${isDo ? '<span class="tut-do">▸ your move</span>' : `<button class="btn small primary" data-tut="next">${this.i === STEPS.length - 1 ? 'Play!' : 'Next'}</button>`}
        </div>
      </div>`;
    this.root.querySelector('[data-tut=skip]')!.addEventListener('click', () => this.stop(false));
    this.root.querySelector('[data-tut=next]')?.addEventListener('click', () => this.next());
    requestAnimationFrame(() => this.place());
  }
  /** Position the spotlight on the target and the card next to it. */
  place() {
    if (!this.root || this.i < 0) return;
    const step = STEPS[this.i];
    const spot = this.root.querySelector<HTMLDivElement>('.tut-spot')!;
    const card = this.root.querySelector<HTMLDivElement>('.tut-card')!;
    const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!el || el.getClientRects().length === 0) {
      spot.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`;
      card.style.cssText = `left:${Math.max(16, vw / 2 - 180)}px;top:${Math.max(16, vh / 2 - 120)}px`;
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const pad = 8;
    spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
    const cw = Math.min(360, vw - 32);
    card.style.cssText = `left:0;top:0;width:${cw}px;visibility:hidden`;
    const ch = card.offsetHeight || 200;
    const clampX = (x: number) => Math.min(vw - cw - 16, Math.max(16, x));
    const clampY = (y: number) => Math.min(vh - ch - 8, Math.max(8, y));
    // Prefer below, then above, then beside — never on top of the target.
    let left = clampX(r.left + r.width / 2 - cw / 2);
    let top: number;
    if (r.bottom + 16 + ch <= vh - 8) top = r.bottom + 16;
    else if (r.top - 16 - ch >= 8) top = r.top - 16 - ch;
    else {
      top = clampY(r.top + r.height / 2 - ch / 2);
      left = r.right + 16 + cw <= vw - 16 ? r.right + 16 : clampX(r.left - 16 - cw);
    }
    card.style.cssText = `left:${left}px;top:${top}px;width:${cw}px`;
  }
}
