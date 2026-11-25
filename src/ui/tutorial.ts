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
    text: 'You are <b>Rosa</b>, working the snack bar on the Holloway Drive-In’s last night. A killer is loose on the lot. <b>The only way to win is to kill him.</b> There is no dawn to wait for: the night ends when one of you does. Saving people along the way is how you get strong enough.',
  },
  {
    title: 'Five phases a turn',
    text: '<b>Action</b>: you play cards. <b>Planning</b>: you buy new ones. <b>Killer</b>: he moves and attacks, then a Terror card flips. <b>Panic</b>: survivors near a fresh kill scatter. <b>Upkeep</b>: the location’s rule, and you may rearrange items.',
    target: '#phasebar',
  },
  {
    title: 'You',
    text: '<b>Health</b> comes with a hidden backup token (the <b>?</b>) that may get you back up once. <b>Horror</b> climbs left to right on the track, and the row under it shows how many dice you roll at that level: more fear, fewer dice. <b>Nerve</b> (◉) pays for cards: 6 a turn on Matinee, plus bonuses. Your items are below: tap one to read or use it.',
    target: '#heroine-panel',
  },
  {
    title: 'Him',
    text: 'His <b>bloodlust</b> track sets how far he moves and how hard he hits (move/attack). Every survivor he kills raises it. His behavior line says exactly what he will do on his turn.',
    target: '#killer-panel',
  },
  {
    title: 'The Terror clock',
    text: 'Ten Terror cards, one per turn. When they run out, the <b>Finale</b> begins and he comes for you. Be ready by then.',
    target: '.terror-clock',
  },
  {
    title: 'Your hand',
    text: 'Each card shows its <b>cost</b>, its dice, and three outcomes: <b>2+</b> successes, exactly <b>1</b>, or <b>✗</b>. A die showing 5–6 succeeds; 3–4 is a partial: once per roll you can buy one up by discarding 2 cards. The small <b>discard +1◉</b> on a card trades it for nerve.',
    target: '.hand-row',
  },
  {
    title: 'Search for something useful',
    text: 'You are standing on an item pile. Play <b>Look Around</b> (free). If it succeeds you choose what to keep.',
    target: '[data-kind=search]',
    done: (s) => (s.piles.concession?.cards.length ?? 9) < 6 || s.heroine.items.length + s.heroine.pack.length > 0 || s.round > 1,
  },
  {
    title: 'Someone needs you',
    text: 'A survivor is waiting in <b>Parking Rows A</b>, right next to the <b>Ticket Booth</b> exit. Play <b>Walk</b>. Rosa’s Quick Feet gives her first move card each turn an extra step.',
    target: '[data-card]',
    done: (s) => s.pending?.kind === 'move' || s.heroine.loc !== 'concession' || s.saved > 0 || s.round > 1,
  },
  {
    title: 'Step by step',
    text: 'Click the glowing <b>Parking Rows A</b>. Each step costs one movement point.',
    target: '[data-node=lotA]',
    done: (s) => s.heroine.loc === 'lotA' || s.saved > 0 || s.round > 1,
  },
  {
    title: 'Get them out',
    text: 'Survivors follow you when you move (up to 2), but never into his location. Step onto the <b>Ticket Booth</b> exit: everyone with you there is rescued.',
    target: '[data-node=gate]',
    done: (s) => s.saved > 0 || s.round > 1,
  },
  {
    title: 'Rescue rewards',
    text: 'Each rescue fills the next slot and pays its reward: Rosa’s first is <b>Resolve</b>, +1 die on every attack for the rest of the night. Fill all four to unlock her ability.',
    target: '#heroine-panel .rescue',
  },
  {
    title: 'End your Action phase',
    text: 'Click <b>End Action</b>. Nerve you didn’t spend carries into Planning.',
    target: '[data-act=endAction]',
    done: (s) => s.phase !== 'action' || s.round > 1,
  },
  {
    title: 'Planning: stock up',
    text: 'Buy cards for next turn with the nerve you didn’t spend, as many as you can afford. The <b>Free</b> shelf costs nothing, even when you’re broke. Cards you just played come back after Planning. <b>Peek at the board</b> (B) any time; click <b>Done</b> when you’re set.',
    target: '.shop-meter.m-nerve',
    done: (s) => s.phase === 'hunter' || s.phase === 'upkeep' || s.round > 1,
  },
  {
    title: 'His turn',
    text: 'Everything he did is listed here: his behavior, the Terror card, any panic. Then click <b>Next turn</b>.',
    target: '#overlay-root .killerturn',
    done: (s) => s.round > 1,
  },
  {
    title: 'When he finds you',
    text: 'If he attacks <b>you</b>, you can play a <b>reaction</b> card (like Duck) to soften or cancel that one hit. If survivors share his location, he goes for them first. Attack cards hurt him; a weapon in hand and his lore items add damage.',
    target: '#killer-panel .behavior',
  },
  {
    title: 'You’re on your own now',
    text: 'Search, rescue, then <b>hunt him down</b>, ideally before the Finale. Two hands, one backpack: you can only rearrange when you find an item or in Upkeep. Stuck? Press <b>Hint</b> (H), or open the <b>Map key</b> (bottom right of the map) for every icon. Undo (Z) works until you roll dice. Good luck.',
    target: '.terror-clock',
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
    // A decision overlay (dice, search, reaction, aim) is up and this step isn't about it: step aside.
    const overlay = document.querySelector('#overlay-root .overlay');
    this.root.style.display = overlay && !(el && overlay.contains(el)) ? 'none' : '';
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
