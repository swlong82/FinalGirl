import '@fontsource/oswald/latin-400.css';
import '@fontsource/oswald/latin-600.css';
import '@fontsource/special-elite/latin-400.css';
import '@fontsource/creepster/latin-400.css';
import './ui/style.css';
import { audio } from './audio/audio';
import { heroinePortrait, heroineToken, icon, killerPortrait, mapBackdrop, pip, victimIcon } from './art/art';
import { eventStill, itemIcon, posterFrame } from './art/scenes';
import { startParticles } from './ui/particles';
import { cheapest } from './engine/bot';
import { advise, adviceTarget, currentGoal, planNeeds, type Goal } from './engine/coach';
import { glyph } from './ui/glyphs';
import { TUTORIAL, tutorialGame } from './engine/tutorial';
import { isLegacySave, migrateSave } from './engine/migrate';
import { clearOfBar, LESSONS, teachContent, Tutorial } from './ui/tutorial';
import { buildContent, FEATURES, HEROINES, KILLERS, LOCATIONS, type Feature } from './content/registry';
import {
  abilityUnlocked,
  actionDef,
  bloodlustLevel,
  cardCost,
  buyUpMatters,
  check,
  CONVERT_COST,
  MAX_BUYUPS,
  DIFFICULTY,
  dispatch,
  escortCap,
  eventDef,
  followers,
  followPlan,
  HAND_LIMIT,
  handSlots,
  handsUsed,
  exitOpen,
  gateDown,
  GATE_NAMES,
  haven,
  killerSeen,
  killerShownAt,
  ruleAction,
  SONGS,
  song,
  walkNeighbors,
  hasTag,
  horrorDice,
  isExit,
  isFlooded,
  itemDef,
  killerAttack,
  killerMoveValue,
  loreBonus,
  rollBreakdown,
  autoSplit,
  minionDamage,
  minionsAt,
  npcAt,
  specialDef,
  specialsAt,
  MAX_HORROR,
  neighbors,
  newGame,
  nodeName,
  panicTable,
  predictTarget,
  rating,
  score,
  TERROR_DEAL,
  terrorDef,
  TIEBREAK,
  totalHealth,
  upgradeState,
} from './engine/rules';
import type { Action, ActionCardDef, Content, Difficulty, Effect, GameState, HeldItem, TieBreak } from './engine/types';
import { startGrain, setGrainIntensity } from './ui/grain';
import { fillPronouns } from './engine/pronoun';
import { sym } from './ui/symbols';

// ── App state ───────────────────────────────────────────────────────────────
type Screen = 'title' | 'feature' | 'heroine' | 'intro' | 'game' | 'stats';
const SAVE_KEY = 'lastlight.save.v2';
const PREFS_KEY = 'lastlight.prefs.v1';
const TIPS_KEY = 'lastlight.tips.v2';
const STATS_KEY = 'lastlight.stats.v1';
const TUT_KEY = 'lastlight.tutorial.v2';
const LESSONS_KEY = 'lastlight.lessons.v1';
const tutorial = new Tutorial(() => store(TUT_KEY, true), { taught: (ids) => ids.forEach(markLesson) });
// One-time lessons: each shows the first time its moment comes, then never again.
let lessonGap = 0; // no new lesson before this time (one at a time, with a breath between)
let lessonHeld: GameState | null = null; // ...nor until the game moves on from this state
let tipPhase = ''; // a tip belongs to the phase it was shown in
let lessonDo = false; // the open lesson closes when the player does the thing
const lessons = new Tutorial(
  (finished) => {
    // Never two in a row without the player doing something in between: a lesson the player
    // closed by acting already has that; after "Got it" or Hide, wait for their next move.
    const acted = finished && lessonDo;
    lessonGap = performance.now() + (acted ? 600 : 2500);
    lessonHeld = acted ? null : game;
    setTimeout(() => game && screen === 'game' && syncTeach(game), acted ? 660 : 2560);
  },
  { lesson: true },
);

interface GameRecord {
  at: number;
  heroine: string;
  killer: string;
  location: string;
  difficulty: Difficulty;
  outcome: string;
  score: number;
  saved: number;
  slain: number;
}

interface Prefs {
  sound: boolean;
  volume: number;
  music: number;
  grain: number;
  tips: boolean;
  tiebreak: TieBreak;
  /** Simple: the side panels show only what matters now. Unset: simple for the first few nights. */
  view?: 'simple' | 'full';
}

type Reveal = { kind: 'terror' | 'event'; id: string } | { kind: 'finale' } | { kind: 'power' };

const app = document.getElementById('app')!;
let screen: Screen = 'title';
let feature: Feature = FEATURES[0];
let pick = { location: FEATURES[0].location, killer: FEATURES[0].killer };
let difficulty: Difficulty = 'standard';
let heroineId = HEROINES[0].id;
let history: GameState[] = [];
const cardQueue: Reveal[] = [];
let content: Content | null = null;
let game: GameState | null = null;
let killerLogStart = 0;
/** Her and his numbers when the Killer phase began, for the end-of-turn summary. */
let turnStart: { health: number; slain: number; saved: number; bloodlust: number; killerHealth: number; finale: boolean; minions: number } | null = null;
let lastQuote = '';
let overlayLocked = false; // during the dice animation
let boardBuilt = false;
let lastFinale = false;
let recorded = false;
// UI-only selections
let planHidden = -1;
/** Phone layout: the heroine and killer panels fold into one-line summaries. */
const sideOpen = { left: false, right: false };
const touchOnly = window.matchMedia('(hover: none)');
/** Phone layout: items and the ability live in a sheet opened from the bottom bar. */
const phoneLayout = window.matchMedia('(max-width: 700px)');
let itemsOpen = false;
let upkeepHidden = -1;
let convertDie: number | null = null;
let trayRollKey = '';
let convertPick: number[] = [];
let searchPicks: number[] = [];
let swapFor: number | null = null;
let selItem: number | null = null;
let lastHorrorShown: number | null = null;
let heldGoal: { round: number; goal: Goal } | null = null;
/** The goal on screen: recomputed only when she's free to act (or moving), so a roll or a pick mid-move never flips it. */
function shownGoal(c: Content, s: GameState): Goal | undefined {
  if (s.phase !== 'action' || s.outcome) return undefined;
  if (s.pending && s.pending.kind !== 'move' && heldGoal?.round === s.round) return heldGoal.goal;
  const goal = currentGoal(c, s);
  heldGoal = { round: s.round, goal };
  return goal;
}
let aimMode: 'choose' | 'split' = 'choose';
let splitDraft: Record<number, number> = {};

const prefs: Prefs = { sound: true, volume: 0.8, music: 0.7, grain: 0.6, tips: true, tiebreak: 'adverse', ...load(PREFS_KEY, {}) };
const seenTips = new Set<string>(load(TIPS_KEY, [] as string[]));
// Players with a few nights behind them already know what the lessons teach.
const seenLessons = new Set<string>(load<string[] | null>(LESSONS_KEY, null) ?? (load<unknown[]>(STATS_KEY, []).length >= 3 ? LESSONS.map((l) => l.id!) : []));
let logOpen = false; // Simple view folds the log away until asked for
function simpleView() {
  return (prefs.view ?? (load<unknown[]>(STATS_KEY, []).length < 5 ? 'simple' : 'full')) === 'simple';
}
function markLesson(id: string) {
  seenLessons.add(id);
  store(LESSONS_KEY, [...seenLessons]);
}
/** After every update: advance the tutorial, or the open lesson, or open the next lesson that's due. */
function syncTeach(s: GameState) {
  if (content) teachContent(content);
  tutorial.sync(s);
  if (tutorial.active) return;
  if (lessons.active) return lessons.sync(s);
  if (!prefs.tips || screen !== 'game' || s.outcome || performance.now() < lessonGap || s === lessonHeld) return;
  const next = LESSONS.find((l) => !seenLessons.has(l.id!) && l.trigger!(s));
  if (!next) return;
  markLesson(next.id!);
  lessonDo = !!next.done;
  document.querySelector('.tip-note')?.remove(); // one voice at a time
  lessons.start([next], s);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode — fine */
  }
}
function savePrefs() {
  store(PREFS_KEY, prefs);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ── Audio boot (needs a user gesture) ───────────────────────────────────────
function bootAudio() {
  audio.enabled = prefs.sound;
  audio.volume = prefs.volume;
  audio.musicVolume = prefs.music;
  audio.start();
}
window.addEventListener('pointerdown', bootAudio, { once: true });
window.addEventListener('keydown', bootAudio, { once: true });

// ── Effect text ─────────────────────────────────────────────────────────────
function describeEffect(e: Effect): string {
  switch (e.op) {
    case 'spawn':
      return `+${e.n} survivor${e.n > 1 ? 's' : ''}`;
    case 'rally':
      return `call ${e.n} over`;
    case 'panic':
      return 'survivors panic';
    case 'move':
      return `move ${e.n}`;
    case 'search':
      return `draw ${e.draw}, keep ${e.keep}`;
    case 'horror':
      return e.n > 0 ? `horror +${e.n}` : `horror ${e.n}`;
    case 'heal':
      return `heal ${e.n}`;
    case 'wound':
      return `lose ${e.n} health`;
    case 'nerve':
      return e.n > 0 ? `+${e.n} nerve` : `${e.n} nerve`;
    case 'hide':
      return 'hide';
    case 'barricade':
      return e.at === 'around' ? `barricade ${e.strength} all around` : `barricade ${e.strength}`;
    case 'fuel':
      return 'stoke the campfire';
    case 'gates':
      return 'swap the shutters';
    case 'bus':
      return 'the bus stops now';
    case 'song':
      return 'skip the song';
    case 'reveal':
      return 'see {him} this turn';
    case 'trap':
      return 'a trap is set near you';
    case 'pose':
      return e.who === 'heroine' ? 'poses a mannequin where you stand' : 'poses a mannequin';
    case 'strikePose':
      return 'appears at {his} mannequin and attacks';
    case 'teleportHeroine':
      return 'escape route';
    case 'drawItem':
      return `draw ${e.n} item`;
    case 'resolve':
      return `+${e.n} attack die`;
    case 'mod':
      return (
        {
          damage: `next hit +${e.n} damage`,
          rerollNext: 'next roll rerolls misses',
          rollDice: `next roll +${e.n} die`,
          searchDice: `search ${e.n > 0 ? '+' : ''}${e.n} die`,
          hideDice: `hide +${e.n} dice`,
          attackDice: `attack +${e.n} dice`,
          killerAttack: `{his} attack +${e.n}`,
          killerMove: `{his} move +${e.n}`,
        } as Record<string, string>
      )[e.key];
    case 'warm':
      return 'thaw out';
    case 'endPhase':
      return 'end the phase';
    case 'damage':
      return `${e.n} damage`;
    case 'spawnSpecial':
      return content ? `${content.location.specials.find((x) => x.id === e.id)?.name ?? 'a named survivor'} appears` : 'a named survivor appears';
    case 'spawnMinion':
      return `+${e.n} ${content?.killer.minions ? (e.n > 1 ? content.killer.minions.plural : content.killer.minions.name.replace(/^(A|An) /, '')) : 'minion'}`;
    case 'minionsAct':
      return `the ${content?.killer.minions?.plural ?? 'minions'} act`;
    case 'enemiesAct':
      return '{his} minions, then {he}, act';
    case 'counter':
      return `hit back ${e.n}`;
    case 'killerDamage':
      return `${e.n} damage to {him}`;
    case 'block':
      return e.n >= 99 ? 'block all' : `block ${e.n}`;
    case 'bloodlust':
      return `bloodlust +${e.n}`;
    case 'killerHeal':
      return `{he} heals ${e.n}`;
    case 'killerStun':
      return '{he} loses {his} next move';
    case 'killerMove':
      return e.toward === 'heroine' ? `{he} comes ${e.steps} closer` : e.toward === 'lair' ? `{he} moves ${e.steps} toward {his} lair` : `{he} moves ${e.steps} toward ${content ? nodeName(content, e.toward) : e.toward}`;
    case 'killerTeleport':
      return e.to === 'heroine' ? '{he} appears beside you' : '{he} relocates';
    case 'target':
      return e.who === 'heroine' ? 'targets you' : e.who === 'npc' ? 'targets the closest survivor' : 'targets whoever is closest';
    case 'hunt':
      return e.extra ? `moves (+${e.extra})` : 'moves';
    case 'attack':
      return (e.n ?? 1) > 1 ? `attacks ×${e.n}` : 'attacks';
    case 'revealPower':
      return 'reveals {his} power';
    case 'event':
      return 'new Event';
    case 'if':
      return `if ${condText(e.cond)}: ${describeEffects(e.then)}${e.else?.length ? `; else ${describeEffects(e.else)}` : ''}`;
    default:
      return '';
  }
}
function condText(c: Extract<Effect, { op: 'if' }>['cond']): string {
  switch (c.c) {
    case 'killerHere':
      return '{he} is here';
    case 'killerAdjacent':
      return '{he} is next door';
    case 'heroineAt':
      return `you are at ${content ? nodeName(content, c.node) : c.node}`;
    case 'alone':
      return 'no survivors with you';
    case 'survivorsHere':
      return 'survivors with you';
    case 'finale':
      return 'Finale';
    case 'hurt':
      return 'hurt';
    case 'horrorAtLeast':
      return `horror ${c.n}+`;
  }
}
function describeEffects(effs: Effect[]): string {
  return effs.map(describeEffect).filter(Boolean).join(', ') || 'nothing';
}
/** Effect text as HTML, with horror and nerve changes shown as symbols ("👁+1", "+2⚡"). */
function fxHtml(text: string): string {
  return esc(text)
    .replace(/\bhorror ([+−-]?\d+)/g, (_, n: string) => `${sym('horror')}${n.replace('-', '−')}`)
    .replace(/([+−-]\d+) nerve\b/g, (_, n: string) => `${n.replace('-', '−')}${sym('nerve')}`);
}

/** "4 dice: horror 2 gives 4, Resolve +1, blackout −1" */
function diceWhy(parts: [string, number][]): string {
  const [first, ...rest] = parts;
  const total = Math.max(1, parts.reduce((n, [, v]) => n + v, 0));
  return `${total} dice: ${first[0]} gives ${first[1]}${rest.map(([l, v]) => `, ${l} ${v > 0 ? '+' : '−'}${Math.abs(v)}`).join('')}`;
}

/** Shop shelves: the free basics first, then cards grouped by what they do. */
type ShelfId = 'free' | 'move' | 'fight' | 'search' | 'defend' | 'recover' | 'tricks';
const SHELVES: { id: ShelfId; name: string; blurb: string }[] = [
  { id: 'free', name: 'Free', blurb: 'cost 0, even when you’re out of nerve, while copies last' },
  { id: 'move', name: 'Move', blurb: 'run, reach survivors, get to an exit' },
  { id: 'fight', name: 'Fight', blurb: 'hurt {him}: {he} must be in reach' },
  { id: 'search', name: 'Search', blurb: 'find weapons and items where you stand' },
  { id: 'defend', name: 'Defend', blurb: 'play during {his} attack to block it' },
  { id: 'recover', name: 'Recover', blurb: 'heal wounds, calm your horror' },
  { id: 'tricks', name: 'Tricks', blurb: 'hide, barricade, lure {him}, call survivors' },
];
function shelfOf(c: Content, d: ActionCardDef): ShelfId {
  if (cardCost(c, d) === 0) return 'free';
  if (d.kind === 'reaction') return 'defend';
  const t = d.tags[0];
  if (t === 'move') return 'move';
  if (t === 'attack' || (d.great ?? []).some((e) => e.op === 'mod' && e.key === 'damage')) return 'fight';
  if (t === 'search') return 'search';
  if (t === 'calm' || t === 'heal') return 'recover';
  return 'tricks';
}

function cardHtml(c: Content, s: GameState | null, d: ActionCardDef, attrs: string, extra = '', idx?: number, why?: string): string {
  const bd = s && d.roll ? rollBreakdown(c, s, d) : null;
  const dice = why ? `<span class="whyno">${esc(why)}</span>` : bd ? `<span class="dn" title="${esc(diceWhy(bd.parts))}">${sym('dice', { title: `${bd.total} dice` })}${bd.total}</span>` : d.roll ? `${sym('dice')}roll` : 'no roll';
  const bands = d.roll
    ? `<span class="band"><i class="g">2+</i>${fxHtml(describeEffects(d.great ?? []))}</span><span class="band"><i class="o">1</i>${fxHtml(describeEffects(d.good ?? []))}</span><span class="band"><i class="x">✗</i>${fxHtml(describeEffects(d.fail ?? []))}</span>`
    : `<span class="band"><i class="g">✓</i>${fxHtml(describeEffects(d.always ?? []))}</span>`;
  // Simple view: the best result as one big line; the other rows shrink under it.
  const best = describeEffects((d.roll ? d.great : d.always) ?? []);
  const head = `<span class="fc-head">${d.roll ? '<i class="g" title="2 or more hits">2+</i>' : ''}${fxHtml(best.charAt(0).toUpperCase() + best.slice(1))}</span>`;
  return `<button class="act fcard ${d.kind} tag-${d.tags[0]}" data-kind="${d.tags[0]}" ${attrs}>
    <span class="n" title="${esc(d.name)}">${esc(d.name)}</span>${idx !== undefined && idx < 10 ? `<kbd class="key">${(idx + 1) % 10}</kbd>` : ''}
    <span class="cost"><b>${cardCost(c, d)}</b>${sym('nerve', { title: `costs ${cardCost(c, d)} nerve` })} · ${dice}${d.kind === 'reaction' ? ' · <em>reaction</em>' : ''}</span>
    ${head}<span class="bands">${bands}</span>${extra}
  </button>`;
}

// ── Screens ─────────────────────────────────────────────────────────────────
/** Internal scroll positions on the pick screens survive re-renders (picking re-renders). */
let scrollMemo: { screen: Screen; pos: Record<string, [number, number]> } = { screen: 'title', pos: {} };
/** Lists whose pick changed from elsewhere (a feature, Spin the Reel): glide them to it after the next render. */
let revealLists: string[] = [];
function render() {
  if (screen !== 'game') boardBuilt = false;
  const same = scrollMemo.screen === screen;
  if (same) app.querySelectorAll<HTMLElement>('[data-scroll]').forEach((el) => (scrollMemo.pos[el.dataset.scroll!] = [el.scrollLeft, el.scrollTop]));
  else scrollMemo = { screen, pos: {} };
  renderScreen();
  app.querySelectorAll<HTMLElement>('[data-scroll]').forEach((el) => {
    const p = scrollMemo.pos[el.dataset.scroll!];
    if (p) [el.scrollLeft, el.scrollTop] = p;
    else {
      // First visit: bring the current pick into view inside its own list
      // (innermost lists only, so an outer scroller stays at the top).
      const sel = el.querySelector<HTMLElement>('.sel');
      if (!sel || el.querySelector('[data-scroll]')) return;
      const r = sel.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      if (r.bottom > box.bottom) el.scrollTop += r.bottom - box.bottom + 8;
      if (r.right > box.right) el.scrollLeft += r.right - box.right + 8;
    }
  });
  for (const name of revealLists) {
    const el = app.querySelector<HTMLElement>(`[data-scroll="${name}"]`);
    const sel = el?.querySelector<HTMLElement>('.sel');
    if (!el || !sel) continue;
    const r = sel.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const inView = r.top >= box.top && r.bottom <= box.bottom && r.left >= box.left && r.right <= box.right;
    if (inView) continue;
    // Centre the pick inside its own list only; the page itself doesn't move.
    const dy = el.scrollHeight > el.clientHeight ? r.top - box.top - (box.height - r.height) / 2 : 0;
    const dx = el.scrollWidth > el.clientWidth ? r.left - box.left - (box.width - r.width) / 2 : 0;
    el.scrollBy({ top: dy, left: dx, behavior: 'smooth' });
  }
  revealLists = [];
}
function renderScreen() {
  switch (screen) {
    case 'title':
      return renderTitle();
    case 'feature':
      return renderFeature();
    case 'heroine':
      return renderHeroine();
    case 'intro':
      return renderIntro();
    case 'game':
      return renderGame();
    case 'stats':
      return renderStats();
  }
}

function backdrop() {
  const loc = LOCATIONS.find((l) => l.id === pick.location) ?? LOCATIONS[0];
  return `<div class="backdrop-wrap">${mapBackdrop(loc, false)}</div>`;
}

const LEGACY_SAVE_KEY = 'lastlight.save.v1';
function savedGame(): { ids: [string, string, string]; state: GameState; legacy?: boolean } | null {
  const saved = load<{ ids: [string, string, string]; state: GameState } | null>(SAVE_KEY, null);
  if (saved && saved.state?.version === 2 && !saved.state.outcome) return saved;
  // A night saved under the v0.9 rules: convert it.
  const old = load<{ ids: [string, string, string]; state: unknown } | null>(LEGACY_SAVE_KEY, null);
  if (!old || !isLegacySave(old.state) || old.state.outcome) return null;
  try {
    const [l, k, h] = old.ids;
    const state = migrateSave(buildContent(l, k, h), old.state);
    return state ? { ids: old.ids, state, legacy: true } : null;
  } catch {
    return null;
  }
}

function renderTitle() {
  const saved = savedGame();
  setMood(0, false, false);
  app.innerHTML = `<div class="screen">${backdrop()}
    <h1 class="logo flicker">LAST <span>LIGHT</span></h1>
    <div class="tagline">a solo slasher survival game</div>
    <div class="menu">
      ${saved ? `<button class="btn primary" data-go="continue">Continue: Turn ${saved.state.round}${saved.legacy ? ' (converted from v0.9)' : ''}</button>` : ''}
      ${!load(TUT_KEY, false) ? '<button class="btn primary tut-cta" data-go="tutorial">First Night: Guided Tutorial</button>' : ''}
      <button class="btn ${saved || !load(TUT_KEY, false) ? '' : 'primary'}" data-go="feature">New Night</button>
      ${load(TUT_KEY, false) ? '<button class="btn" data-go="tutorial">Replay Tutorial</button>' : ''}
      <button class="btn" data-go="rules">How to Play</button>
      <button class="btn" data-go="stats">Box Office (Stats)</button>
      <button class="btn" data-go="settings">Sound &amp; Settings</button>
    </div>
    <div class="fineprint">Original game, characters, art &amp; audio. Painted art rendered with Flux; sound generated in code. Headphones recommended.</div>
  </div>`;
}

function comboPoster(locId: string, killerId: string, title?: string): string {
  const loc = LOCATIONS.find((l) => l.id === locId)!;
  const k = KILLERS.find((x) => x.id === killerId)!;
  const curated = FEATURES.find((f) => f.location === locId && f.killer === killerId);
  return posterFrame({
    backdrop: mapBackdrop(loc, false),
    killer: killerPortrait({ art: k.art }),
    title: esc(title ?? (curated ? curated.title.split(':')[1].trim() : `${k.name} at ${loc.name.replace(/^The /, 'the ')}`)),
    sub: esc(curated ? loc.tagline : `A custom double bill · ${loc.era.split(/[—,]/)[0].trim()}`),
    accent: loc.palette.accent,
  });
}

/** Pinned action bar for the pick screens: always on screen, whatever the list length. */
function selBar(back: string, mid: string, primary: string) {
  return `<footer class="sel-bar"><div class="sel-bar-l">${back}</div><div class="sel-bar-m">${mid}</div><div class="sel-bar-r">${primary}</div></footer>`;
}

function renderFeature() {
  const k = KILLERS.find((x) => x.id === pick.killer)!;
  const l = LOCATIONS.find((x) => x.id === pick.location)!;
  const curated = FEATURES.find((f) => f.location === pick.location && f.killer === pick.killer);
  // One horizontal reel, grouped by season: more seasons just extend it sideways.
  const seasons = [...new Set(FEATURES.map((f) => f.season ?? 1))].sort((a, b) => a - b);
  const reel = seasons
    .map(
      (n) => `<div class="season"><div class="season-l">Season ${n}</div><div class="season-row">${FEATURES.filter((f) => (f.season ?? 1) === n)
        .map(
          (f) => `<button class="shelf-item ${f === curated ? 'sel' : ''}" data-feature="${f.id}" ${f.available ? '' : 'disabled'} title="${esc(f.title)} · ${esc(f.subtitle)}">
          ${comboPoster(f.location, f.killer)}
          <span class="shelf-label">${esc(f.title.split(':')[0])}</span>${f === FEATURES[0] ? '<span class="start-here">Start here</span>' : ''}
        </button>`,
        )
        .join('')}</div></div>`,
    )
    .join('');
  app.innerHTML = `<div class="screen fit builder">${backdrop()}
    <header class="sel-head"><h2 class="section">Now Showing</h2><div class="tagline">pick a feature, or build your own double bill</div></header>
    <div class="reel" data-scroll="reel">${reel}</div>
    <div class="builder-grid sel-body" data-scroll="builder">
      <section class="col">
        <h3 class="col-h">Killer <small>${KILLERS.length}</small></h3>
        <div class="cards" data-scroll="killers">${KILLERS.map(
          (x) => `<button class="mini ${x.id === pick.killer ? 'sel' : ''}" data-killer="${x.id}" title="${esc(x.behavior.text)}">
            <span class="mini-art">${killerPortrait({ art: x.art })}</span>
            <b>${esc(x.name)}</b><small>${esc(x.epithet)}</small>
            <span class="mini-stats">♥${x.health} · ${esc(x.power.name)}</span>
          </button>`,
        ).join('')}</div>
      </section>
      <section class="preview">
        <h3 class="col-h">${curated ? esc(curated.title.split(':')[0]) : 'Your Double Bill'}</h3>
        <div class="preview-poster">${comboPoster(pick.location, pick.killer)}</div>
        <p class="preview-txt"><b>${esc(k.name)}</b> at <b>${esc(l.name)}</b>. ${esc(k.lore[0])}</p>
      </section>
      <section class="col">
        <h3 class="col-h">Location <small>${LOCATIONS.length}</small></h3>
        <div class="cards" data-scroll="locations">${LOCATIONS.map(
          (x) => `<button class="mini loc ${x.id === pick.location ? 'sel' : ''}" data-location="${x.id}">
            <span class="mini-art wide">${mapBackdrop(x, false)}</span>
            <b>${esc(x.name)}</b><small>${esc(x.era)}</small>
            <span class="mini-stats">${x.nodes.length} locations · ${x.nodes.filter((n) => n.exit).length} exits · ${esc(x.rule.name)}</span>
          </button>`,
        ).join('')}</div>
      </section>
    </div>
    ${selBar(
      `<button class="btn" data-go="title">Back</button>`,
      `<button class="btn small" data-go="shuffle">${glyph('die')} Spin the Reel</button>`,
      `<button class="btn primary" data-go="heroine">Choose Heroine</button>`,
    )}
  </div>`;
}

function renderHeroine() {
  const h = HEROINES.find((x) => x.id === heroineId) ?? HEROINES[0];
  app.innerHTML = `<div class="screen fit hero-screen">${backdrop()}
    <header class="sel-head"><h2 class="section">Who Survives?</h2><div class="tagline">choose your final heroine</div></header>
    <div class="hero-body sel-body">
      <div class="roster" data-scroll="roster" role="listbox" aria-label="Heroines">
        ${HEROINES.map(
          (x) => `<button class="r-tile ${x.id === h.id ? 'sel' : ''}" data-heroine="${x.id}" role="option" aria-selected="${x.id === h.id}" title="${esc(x.name)}: ${esc(x.title)}">
            ${heroinePortrait(x)}
            <b>${esc(x.name.split(' ')[0])}</b>
            <small class="d-${x.difficulty.toLowerCase()}">${esc(x.difficulty)}</small>
          </button>`,
        ).join('')}
      </div>
      <article class="hero-detail" data-scroll="hero-detail">
        <div class="hd-art">${heroinePortrait(h)}</div>
        <div class="hd-txt">
          <h3>${esc(h.name)}</h3>
          <div class="sub">${esc(h.title)} <span class="tag">${esc(h.difficulty)}</span></div>
          <p class="hd-bio">${esc(h.bio)}</p>
          <div class="hd-stats"><span><b>${h.health}</b> health</span><span><b>${h.rescue.slots.length}</b> rescues to unlock</span></div>
          <div class="passive"><b>${esc(h.passive.name)}:</b> ${esc(h.passive.text)}</div>
          <ol class="hd-rescue">${h.rescue.slots.map((r) => `<li>${esc(r.text)}</li>`).join('')}<li class="rep">Every rescue after: ${esc(h.rescue.repeat.text)}</li></ol>
          <div class="hd-ability">★ <b>${esc(h.ability.name)}</b> ${esc(h.ability.text)}</div>
        </div>
      </article>
    </div>
    ${selBar(
      `<button class="btn" data-go="feature">Back</button>`,
      `<div class="diff">${(Object.keys(DIFFICULTY) as Difficulty[])
        .map((d) => `<button class="chip ${d === difficulty ? 'sel' : ''}" data-difficulty="${d}" title="${esc(DIFFICULTY[d].text)}">${esc(DIFFICULTY[d].label)} <small class="tier">${({ story: 'easy', standard: 'normal', nightmare: 'hard' } as const)[d]}</small></button>`)
        .join('')}</div><p class="diff-note">${esc(DIFFICULTY[difficulty].text)}</p>`,
      `<button class="btn primary" data-go="intro">Roll Film</button>`,
    )}
  </div>`;
}

function renderIntro() {
  const loc = LOCATIONS.find((l) => l.id === pick.location)!;
  const k = KILLERS.find((x) => x.id === pick.killer)!;
  const paras = [...loc.lore, ...k.lore.slice(0, 1)];
  app.innerHTML = `<div class="screen">${backdrop()}
    <div class="crawl">
      <p class="date" style="animation-delay:.1s">${esc(loc.era)} — ${esc(loc.name)}</p>
      ${paras.map((p, i) => `<p style="animation-delay:${0.6 + i * 1.4}s">${esc(p)}</p>`).join('')}
    </div>
    <div class="intro-rules" style="animation-delay:${0.6 + paras.length * 1.4}s">
      <p>${glyph(RULE_GLYPH[loc.rule.kind] ?? 'reel')} <b>${esc(loc.rule.name)}</b>: ${esc(loc.rule.text)}</p>
      ${k.gimmick ? `<p>${glyph(GIMMICK_GLYPH[k.gimmick.kind])} <b>${esc(k.gimmick.name)}</b>: ${esc(k.gimmick.text)}</p>` : ''}
    </div>
    <div class="menu" style="margin-top:20px">
      <button class="btn primary" data-go="start">Begin the Night</button>
    </div>
  </div>`;
}

// ── Game screen ─────────────────────────────────────────────────────────────
function resetUi() {
  history = [];
  recorded = false;
  lastFinale = false;
  cardQueue.length = 0;
  planHidden = upkeepHidden = -1;
  lastQuote = '';
  itemsOpen = false;
  convertDie = null;
  convertPick = [];
  searchPicks = [];
  swapFor = null;
}

function startNewGame() {
  content = buildContent(pick.location, pick.killer, heroineId);
  const seed = (Math.random() * 2 ** 31) | 0;
  game = newGame(content, seed, difficulty, prefs.tiebreak);
  resetUi();
  for (const id of game.events) cardQueue.push({ kind: 'event', id });
  screen = 'game';
  persist();
  render();
}

function startTutorial() {
  pick = { location: TUTORIAL.location, killer: TUTORIAL.killer };
  heroineId = TUTORIAL.heroine;
  difficulty = 'story';
  content = buildContent(pick.location, pick.killer, heroineId);
  game = tutorialGame(content);
  resetUi();
  screen = 'game';
  persist();
  render();
  lessons.stop(false);
  for (const l of LESSONS) seenLessons.delete(l.id!); // a replay teaches it all again
  store(LESSONS_KEY, [...seenLessons]);
  tutorial.start();
  syncTeach(game);
}

function persist() {
  if (!game || !content) return;
  if (game.outcome) {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  } else store(SAVE_KEY, { ids: [pick.location, pick.killer, heroineId], state: game });
  if (game.outcome && !recorded) {
    recorded = true;
    const stats = load<GameRecord[]>(STATS_KEY, []);
    stats.push({ at: Date.now(), heroine: heroineId, killer: pick.killer, location: pick.location, difficulty: game.difficulty, outcome: game.outcome, score: score(game), saved: game.saved, slain: game.slain });
    store(STATS_KEY, stats.slice(-500));
  }
}

function continueGame() {
  const saved = savedGame();
  if (!saved) return;
  const [l, k, h] = saved.ids;
  pick = { location: l, killer: k };
  heroineId = h;
  content = buildContent(l, k, h);
  game = upgradeState(saved.state);
  game.fx = [];
  resetUi();
  // The end-of-turn summary starts at the last Killer phase, not at the top of the night.
  const lastTurn = game.log.map((x) => x.text).lastIndexOf(`${content.killer.name}'s turn.`);
  killerLogStart = lastTurn >= 0 ? lastTurn : game.log.length;
  screen = 'game';
  if (saved.legacy) {
    persist();
    try {
      localStorage.removeItem(LEGACY_SAVE_KEY);
    } catch {
      /* ignore */
    }
  }
  render();
  if (saved.legacy) toast('This night was saved under the old rules and has been converted to v1.0. Positions, health, items and rescues carried over.', 8000);
}

function renderGame() {
  if (!game || !content) return;
  if (!boardBuilt) {
    app.innerHTML = `<div class="game" id="game">
      <header class="topbar"></header>
      <aside class="side left ${sideOpen.left ? '' : 'collapsed'}"><button class="side-toggle" data-go="toggleSide" data-side="left" id="sum-h"></button><div class="panel" id="heroine-panel"></div></aside>
      <main class="stage"><div class="phasebar" id="phasebar"></div><div class="board" id="board"></div><div class="goal-strip" id="goal-strip"></div></main>
      <aside class="side right ${sideOpen.right ? '' : 'collapsed'}"><button class="side-toggle" data-go="toggleSide" data-side="right" id="sum-k"></button><div class="panel" id="killer-panel"></div><div class="panel log-panel"><h4 data-go="toggleLog">What happened</h4><div class="log" id="log"></div></div></aside>
      <footer class="bottombar" id="bottombar"></footer>
      <section class="items-sheet pane" id="items-sheet" hidden aria-label="Items and ability"></section>
    </div><div id="overlay-root"></div>`;
    buildBoard();
    boardBuilt = true;
    audio.setTheme(content!.location.art);
    startParticles(document.getElementById('particles') as HTMLCanvasElement, content!.location.art, () => !!game?.killer.finale);
  }
  updateGame();
}

function buildBoard() {
  const c = content!;
  const board = document.getElementById('board')!;
  const loc = c.location;
  const edges = loc.edges
    .map(([a, b]) => {
      const A = loc.nodes.find((n) => n.id === a)!;
      const B = loc.nodes.find((n) => n.id === b)!;
      // A dark casing under a light core reads on any backdrop, bright snow or black night.
      const xy = `x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" vector-effect="non-scaling-stroke"`;
      return `<g class="edge" data-edge="${a}|${b}"><line class="case" ${xy}/><line class="core" ${xy}/></g>`;
    })
    .join('');
  board.innerHTML = `<div class="bd">${mapBackdrop(loc, game!.killer.finale)}</div>
    <svg class="edges" viewBox="0 0 1000 640" preserveAspectRatio="none">${edges}<line id="threat" class="threat" x1="0" y1="0" x2="0" y2="0" vector-effect="non-scaling-stroke"/></svg>
    <div class="ring here-ring" id="ring-h"></div>
    <div class="ring danger-ring" id="ring-k"></div>
    ${loc.nodes
      .map(
        (n) => `<button class="node ${n.exit ? 'exit' : ''} ${n.id === loc.lair ? 'lair' : ''}" data-node="${n.id}" style="left:${n.x / 10}%;top:${n.y / 6.4}%" title="${esc(n.name)} — ${esc(n.flavor)}">
        <div class="disc">${icon(n.icon)}<div class="badges"></div></div>
        <div class="label">${esc(n.name)}</div>
        <div class="vics"></div>
      </button>`,
      )
      .join('')}
    <div class="token heroine" id="tok-h"><div class="pin">${heroineToken(c.heroine)}</div><span class="tag">${esc(c.heroine.name.split(' ')[0])}</span><span class="tok-fol" id="tok-fol" hidden></span></div>
    <canvas class="particles" id="particles"></canvas>
    <div class="token killer" id="tok-k"><div class="pin">${killerPortrait({ art: c.killer.art })}</div><span class="tag">${esc(c.killer.name.replace(/^The /, ''))}</span><div class="tok-hp" id="tok-khp"><i class="hp"></i><i class="tmp"></i><span></span></div></div>
    ${(loc.rule.gates ?? [])
      .flatMap((set, gi) =>
        set.map(([a, b]) => {
          const A = loc.nodes.find((n) => n.id === a)!;
          const B = loc.nodes.find((n) => n.id === b)!;
          return `<div class="gate-pin g${gi}" data-gate-edge="${a}|${b}" style="left:${(A.x + B.x) / 20}%;top:${(A.y + B.y) / 12.8}%" title="${esc(GATE_NAMES[gi])} shutter">${glyph('lock')}</div>`;
        }),
      )
      .join('')}
    <div class="board-hint" id="board-hint"></div>
    <button class="mapkey-btn" data-go="mapkey">${glyph('key')} Map key</button>
    <div class="inspect" id="inspect" hidden></div>`;
}

function renderStats() {
  const stats = load<GameRecord[]>(STATS_KEY, []);
  const wins = stats.filter((r) => r.outcome === 'slain').length;
  const best = stats.reduce((m, r) => Math.max(m, r.score), 0);
  const byHeroine = HEROINES.map((h) => {
    const rs = stats.filter((r) => r.heroine === h.id);
    const w = rs.filter((r) => r.outcome === 'slain').length;
    return `<tr><td>${esc(h.name)}</td><td>${rs.length}</td><td>${w}</td><td>${rs.length ? Math.round((w / rs.length) * 100) : 0}%</td><td>${rs.reduce((m, r) => Math.max(m, r.score), 0)}</td></tr>`;
  }).join('');
  const byKiller = KILLERS.map((k) => {
    const rs = stats.filter((r) => r.killer === k.id);
    return `<tr><td>${esc(k.name)}</td><td>${rs.length}</td><td>${rs.filter((r) => r.outcome === 'slain').length}</td><td>${rs.filter((r) => r.outcome !== 'slain').length}</td></tr>`;
  }).join('');
  const recent = stats
    .slice(-8)
    .reverse()
    .map((r) => `<tr><td>${new Date(r.at).toLocaleDateString()}</td><td>${esc(HEROINES.find((h) => h.id === r.heroine)?.name ?? r.heroine)}</td><td>${esc(KILLERS.find((k) => k.id === r.killer)?.name ?? r.killer)}</td><td>${esc(DIFFICULTY[r.difficulty]?.label ?? '')}</td><td>${r.outcome === 'slain' ? `killed ${KILLERS.find((k) => k.id === r.killer)?.pronoun === 'she' ? 'her' : 'him'}` : r.outcome === 'died' ? 'died' : 'he escaped'}</td><td>${r.score}</td></tr>`)
    .join('');
  app.innerHTML = `<div class="screen">${backdrop()}
    <h2 class="section">Box Office</h2>
    <div class="tagline">${stats.length} nights · ${wins} killers stopped · best score ${best}</div>
    <div class="modal" style="max-height:none">
      ${stats.length ? `<h3>By heroine</h3><table><tr><th>Heroine</th><th>Played</th><th>Won</th><th>Rate</th><th>Best</th></tr>${byHeroine}</table>
      <h3>By killer</h3><table><tr><th>Killer</th><th>Played</th><th>Killed</th><th>Lost</th></tr>${byKiller}</table>
      <h3>Recent</h3><table><tr><th>Date</th><th>Heroine</th><th>Killer</th><th>Mode</th><th>Ending</th><th>Score</th></tr>${recent}</table>` : '<p>No nights on record yet. Go make some history.</p>'}
    </div>
    <div class="menu" style="margin-top:16px"><button class="btn" data-go="title">Back</button></div>
  </div>`;
}

function ruleChip(): string {
  const s = game!;
  const c = content!;
  const r = c.location.rule;
  let state = '';
  if (r.kind === 'tide') state = s.env.tideHigh ? 'HIGH TIDE' : 'low tide';
  else if (r.kind === 'power') state = s.env.dark ? 'BLACKOUT' : 'power on';
  else if (r.kind === 'cold') state = c.heroine.traits.coldImmune ? 'immune' : `cold ${s.env.cold}/3`;
  else if (r.kind === 'calls') state = s.env.ringing ? `ringing: ${nodeName(c, s.env.ringing)}` : 'quiet';
  else if (r.kind === 'campfire') state = s.killer.finale ? 'out for good' : (s.env.fuel ?? 0) > 0 ? `fire ${s.env.fuel}/3` : 'OUT';
  else if (r.kind === 'shutters') state = `${GATE_NAMES[s.env.gate ?? 0]} down`;
  else if (r.kind === 'bus') {
    const p = r.period ?? 3;
    const wait = s.env.bus ? 0 : (p - (s.round % p)) % p || p;
    state = s.env.bus ? 'BUS HERE' : `bus in ${wait} turn${wait > 1 ? 's' : ''}`;
  } else if (r.kind === 'dj') state = SONGS[song(c, s) ?? 0].name;
  else if (r.kind === 'corn') state = killerSeen(c, s) ? '{he}’s in sight' : 'HIDDEN';
  else if (r.kind === 'intermission') {
    const p = r.period ?? 4;
    const wait = Math.ceil(s.round / p) * p - s.round;
    state = wait === 0 ? 'THIS TURN' : `in ${wait} turn${wait > 1 ? 's' : ''}`;
  }
  const hot =
    s.env.tideHigh ||
    s.env.dark ||
    !!s.env.ringing ||
    s.env.cold >= 2 ||
    (r.kind === 'campfire' && (s.env.fuel ?? 0) <= 1) ||
    (r.kind === 'bus' && !!s.env.bus) ||
    (r.kind === 'corn' && !killerSeen(c, s));
  return `<button class="rulechip ${hot ? 'hot' : ''}" data-go="rules" title="${esc(r.text)}"><b>${esc(r.name)}</b> · ${esc(state)}</button>`;
}

const PHASES: [GameState['phase'], string, string][] = [
  ['action', 'Action', 'Play cards: move, search, rescue, fight.'],
  ['planning', 'Shop', 'Planning: buy cards for next turn with leftover nerve.'],
  ['hunter', '{His} turn', '{He} moves and attacks, then a Terror card flips.'],
  ['panic', 'Panic', 'Survivors near a fresh kill run.'],
  ['upkeep', 'Turn end', 'Upkeep: the location’s rule happens; you may rearrange items.'],
];

function updateGame() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const k = s.killer;
  const killerHere = k.loc === h.loc;
  const killerNear = killerHere || neighbors(c, h.loc).includes(k.loc);
  setMood(h.horror, k.finale, killerNear);
  // Focus: what she can't use right now steps back.
  const simple = simpleView();
  document.body.classList.toggle('view-simple', simple);
  document.body.classList.toggle('focus-act', s.phase === 'action' && !s.pending && !s.outcome);
  document.body.classList.toggle('focus-move', s.pending?.kind === 'move');
  document.querySelector('.log-panel')?.classList.toggle('folded', simple && !logOpen);
  if (tipPhase && tipPhase !== s.phase) document.querySelector('.tip-note')?.remove();
  tipPhase = s.phase;

  if (k.finale !== lastFinale) {
    lastFinale = k.finale;
    const bd = document.querySelector('#board .bd');
    if (bd) bd.innerHTML = mapBackdrop(c.location, k.finale);
    document.querySelector('#tok-k .pin')!.innerHTML = killerPortrait({ finale: k.finale, art: c.killer.art });
  }

  // ── top bar: the Terror clock ──
  const left = s.terrorDeck.length;
  const clock = Array.from({ length: TERROR_DEAL }, (_, i) => `<i class="${i < TERROR_DEAL - left ? 'past' : i === TERROR_DEAL - left ? 'now' : ''}"></i>`).join('');
  document.querySelector('.topbar')!.innerHTML = `
    <div class="title">LAST <span>LIGHT</span></div>
    ${ruleChip()}
    <div class="clock terror-clock" title="Terror cards left. When they run out, the Finale begins.">${clock}<i class="dawn finale-mark ${k.finale ? 'on' : ''}" title="Finale"></i><span style="margin-left:8px">${k.finale ? `<b class="fin">FINALE</b>` : `${left} terror left`} · Turn ${s.round}</span></div>
    <div class="tools">
      <button class="btn small" data-go="rules" title="Rules (R)">Rules</button>
      <button class="btn small" data-go="settings" title="Settings">${prefs.sound ? '♪' : '✕'} Sound</button>
      <button class="btn small" data-go="quit">Menu</button>
    </div>`;
  document.getElementById('phasebar')!.innerHTML = PHASES.map(([p, n, tip], i) => `<span class="ph ${s.phase === p ? 'on' : ''} ${PHASES.findIndex(([q]) => q === s.phase) > i ? 'done' : ''}" title="${tip}">${i + 1} · ${n}</span>`).join('<i>→</i>');

  renderHeroinePanel(c, s);
  renderKillerPanel(c, s);

  const logEl = document.getElementById('log')!;
  logEl.innerHTML = s.log
    .slice(-90)
    .map((l) => `<div class="${l.tone ?? ''}"><span class="r">T${l.round}</span>${esc(l.text)}</div>`)
    .join('');
  logEl.scrollTop = logEl.scrollHeight;

  updateBoard();
  updateBottom();
  updateOverlay();
  syncTeach(s);
}

// ── Side panels ─────────────────────────────────────────────────────────────
// One type system: Oswald for labels and numbers, the typewriter face for
// sentences, Creepster only for names. Every section is a flex row header
// (label left, meta right) above its content; nothing floats.
const sec = (title: string, meta: string, body: string, cls = '') =>
  `<section class="sec ${cls}"><div class="sec-h"><span class="sec-t">${title}</span>${meta ? `<span class="sec-m">${meta}</span>` : ''}</div>${body}</section>`;
const vital = (label: string, num: string, sub: string, cls = '', title = '') =>
  `<div class="vital ${cls}" ${title ? `title="${esc(title)}"` : ''}><span class="v-l">${label}</span><span class="v-n">${num}</span><span class="v-s">${sub}</span></div>`;

function itemFacts(c: Content, it: HeldItem): string[] {
  const d = itemDef(c, it.id);
  const out: string[] = [];
  if (d.damage) out.push(`+${d.damage} dmg`);
  if ((d.range ?? [0]).some((r) => r > 0)) out.push('reach 1');
  if (d.searchDice) out.push(`+${d.searchDice} search`);
  if (d.kind === 'lore') out.push('+1 dmg vs {him}');
  if (it.usesLeft !== undefined) out.push(`${it.usesLeft} left`);
  return out;
}

function itemTile(c: Content, s: GameState, it: HeldItem, where: 'hand' | 'pack', span2 = false): string {
  const d = itemDef(c, it.id);
  const active = where === 'hand' || d.hands === 0;
  const usable = active && !!d.use && check(c, s, { type: 'useItem', uid: it.uid }).ok;
  const hands = d.hands ? `<i class="hb">${d.hands} hand${d.hands > 1 ? 's' : ''}</i>` : '';
  const facts = itemFacts(c, it);
  return `<button class="tile k-${d.kind} ${where} ${active ? '' : 'idle'} ${usable ? 'ready' : ''} ${selItem === it.uid ? 'sel' : ''} ${span2 ? 'span2' : ''}" data-sel="${it.uid}" title="${esc(d.name)}: ${esc(d.text)}${active ? '' : ' (needs to be in hand to work)'}">
    <span class="t-ico">${itemIcon(d)}</span>
    <span class="t-nm">${esc(d.name)}</span>
    <span class="t-f">${hands}${facts.map((f) => `<i>${esc(f)}</i>`).join('')}</span>
  </button>`;
}

/** Scroll the heroine panel so the selected item's card and its buttons are in view. */
function revealItemDetail() {
  document.querySelector(itemsOpen ? '#items-sheet .detail:not(.empty)' : '#heroine-panel .detail:not(.empty)')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function itemDetail(c: Content, s: GameState, rearrangeOk: boolean): string {
  const h = s.heroine;
  const it = [...h.items, ...h.pack].find((x) => x.uid === selItem);
  if (!it) {
    const tip = rearrangeOk && h.pack.some((x) => itemDef(c, x.id).hands > 0) ? 'You can rearrange now: tap an item, then take it in hand or stow it.' : 'Tap an item to read it and use it.';
    return `<div class="detail empty">${tip}</div>`;
  }
  const d = itemDef(c, it.id);
  const inHand = h.items.some((x) => x.uid === it.uid);
  const active = inHand || d.hands === 0;
  const btns: string[] = [];
  if (d.use) {
    const chk = check(c, s, { type: 'useItem', uid: it.uid });
    btns.push(`<button class="btn small ${chk.ok ? 'primary' : ''}" data-item="${it.uid}" ${chk.ok ? '' : `disabled title="${esc(chk.why ?? '')}"`}>${esc(d.use.label)}</button>`);
  }
  if (inHand) btns.push(`<button class="btn small" data-stow="${it.uid}" ${rearrangeOk ? '' : 'disabled title="Only when you gain an item, or at turn end"'}>To backpack</button>`);
  else if (d.hands > 0) btns.push(`<button class="btn small" data-ready="${it.uid}" ${rearrangeOk ? '' : 'disabled title="Only when you gain an item, or at turn end"'}>Take in hand</button>`);
  const where = inHand ? 'In hand' : d.hands === 0 ? 'Backpack · works from here' : 'Backpack · needs hands to work';
  return `<div class="detail">
    <div class="d-h"><span class="d-nm">${esc(d.name)}</span><span class="d-m">${d.hands ? `${d.hands} hand${d.hands > 1 ? 's' : ''}` : 'no hands'}</span></div>
    <div class="d-w ${active ? '' : 'warn'}">${where}${itemFacts(c, it).length ? ` · ${esc(itemFacts(c, it).join(' · '))}` : ''}</div>
    <p class="prose">${esc(d.text)}</p>
    ${d.lore ? `<p class="prose lore">${esc(d.lore)}</p>` : ''}
    ${btns.length ? `<div class="d-a">${btns.join('')}</div>` : ''}
  </div>`;
}

function renderHeroinePanel(c: Content, s: GameState) {
  const h = s.heroine;
  const base = DIFFICULTY[s.difficulty].nerve;
  const track = DIFFICULTY[s.difficulty].track;
  const total = totalHealth(s);
  // Horror climbs left to right; the row under it is what that costs you in dice.
  const htrack = track.map((d, i) => `<i class="${i < h.horror ? 'past' : ''} ${i === h.horror ? 'cur' : ''}" title="Horror ${i}: you roll ${d} dice"><b>${i}</b><b>${d}</b></i>`).join('');
  const slots = c.heroine.rescue.slots;
  const rtrack = slots
    .map((sl, i) => `<span class="rt ${i < h.rescued ? 'done' : i === h.rescued ? 'next' : ''}" title="Rescue ${i + 1}: ${esc(sl.text)}">${i < h.rescued ? '✓' : i + 1}</span>`)
    .join('<i class="rt-link"></i>');
  const unlocked = abilityUnlocked(c, s);
  const abilityChk = check(c, s, { type: 'useAbility' });
  const nextTxt = h.rescued < slots.length ? `<b>Next rescue:</b> ${esc(slots[h.rescued].text)}` : `<b>Each rescue:</b> ${esc(c.heroine.rescue.repeat.text)}`;
  const rearrangeOk = (s.rearrange || s.phase === 'upkeep') && !s.pending;
  const used = handsUsed(c, h.items);
  const handTiles = h.items.map((it) => itemTile(c, s, it, 'hand', itemDef(c, it.id).hands === 2)).join('') + Array(Math.max(0, handSlots(c) - used)).fill('<div class="tile empty">Empty hand</div>').join('');
  const bag = h.pack.map((it) => itemTile(c, s, it, 'pack')).join('') || '<div class="bag-empty">Nothing stored yet.</div>';
  const abilityBox = `<div class="ability ${unlocked ? 'on' : ''}" title="${esc(c.heroine.ability.text)}"><div class="ab-h"><span class="ab-n">★ ${esc(c.heroine.ability.name)}</span>${unlocked ? `<button class="btn small ${abilityChk.ok ? 'primary' : ''}" data-act="useAbility" ${abilityChk.ok ? '' : `disabled title="${esc(abilityChk.why ?? '')}"`}>Use</button>` : `<span class="ab-l">unlocks at ${slots.length} rescues</span>`}</div>${unlocked ? `<p class="prose small">${esc(c.heroine.ability.text)}</p>` : ''}</div>`;
  const invSecs = `${sec('Hands', `${used}/${handSlots(c)}${rearrangeOk ? ' · <b class="ok">rearrange now</b>' : ''}`, `<div class="hands">${handTiles}</div>`, 'inv')}
    ${sec(`${glyph('pack')} Backpack`, `${h.pack.length} item${h.pack.length === 1 ? '' : 's'}`, `<div class="bag">${bag}</div>${itemDetail(c, s, rearrangeOk)}`, 'inv')}`;
  // Phone: the same ability and inventory in a sheet, so they're one tap from the hand.
  const sheet = document.getElementById('items-sheet');
  if (sheet) {
    sheet.hidden = !itemsOpen;
    sheet.innerHTML = itemsOpen
      ? `<header class="is-h"><b>${glyph('pack')} Items &amp; ability</b><button class="btn small" data-go="closeItems">Done</button></header>${abilityBox}${invSecs}`
      : '';
  }
  const sumH = document.getElementById('sum-h');
  if (sumH)
    sumH.innerHTML = `<b>${esc(c.heroine.name.split(' ')[0])}</b><span>${sym('health')}${h.health}/${h.maxHealth}${h.token !== null ? '+?' : ''}</span><span>${sym('horror')}${h.horror}</span><span>${h.rescued} rescued</span><span>${h.items.length + h.pack.length} items</span><i>${sideOpen.left ? 'hide' : 'details'}</i>`;
  document.getElementById('heroine-panel')!.innerHTML = `<div class="pane">
    <header class="p-id">${heroinePortrait(c.heroine, { grim: h.horror / 6, hurt: 1 - total / (h.maxHealth + 1) })}
      <div><div class="p-name">${esc(c.heroine.name)}</div><div class="p-role">${esc(c.heroine.title)}</div></div></header>
    <div class="vitals">
      ${vital(sym('health', { big: true }), `${h.health}<small>/${h.maxHealth}</small>`, h.token === null ? 'no 2nd chance' : `+<span class="tok">?</span> 2nd chance`, `hp ${h.health <= 2 ? 'bad' : ''}`, h.token === null ? 'Second-chance token used: the next time she runs out of health, she dies.' : 'Health, plus a hidden second-chance token (the final-health token). When her health runs out the token is revealed: a number gets her back up with that much health, a blank means death.')}
      ${vital(sym('horror', { big: true }), `${h.horror}<small>/${MAX_HORROR}</small>`, `${sym('dice')} ${horrorDice(s)} a roll`, h.horror >= 4 ? 'bad' : '', 'The higher your horror, the fewer dice you roll. Past 6, it feeds {his} bloodlust (at most once a turn).')}
      ${vital(sym('nerve', { big: true }), String(h.nerve), h.nerve < 0 ? 'in debt' : `${base} each turn`, h.nerve < 0 ? 'bad' : 'gold', `Nerve pays for cards. Each turn starts at ${base}, plus bonuses from rescues, being perfectly calm (horror 0) and some events. Discard a card for +1. Below zero ends your Action phase.`)}
    </div>
    <div class="htrack" title="Horror track: as horror rises, you roll fewer dice"><span class="ht-k"><b>${sym('horror')}</b><b>${sym('dice')}</b></span>${htrack}</div>
    ${sec('Rescues', `${h.rescued} saved${h.resolve ? ` · +${h.resolve} attack die` : ''}`, `<div class="rtrack" title="Fill every slot to unlock ${esc(c.heroine.ability.name)}">${rtrack}<i class="rt-link"></i><span class="rt ab ${unlocked ? 'done' : ''}" title="${esc(c.heroine.ability.name)}: ${esc(c.heroine.ability.text)}">★</span></div><p class="prose small next-rescue">${nextTxt}</p>
      ${abilityBox}`, 'rescue')}
    ${invSecs}
    ${sec('Passive', esc(c.heroine.passive.name), `<p class="prose small">${esc(c.heroine.passive.text)}</p>`, 'passive')}
    ${viewSwitch()}
  </div>`;
}

/** Bottom of each side panel: switch between the simple and the full screen. */
function viewSwitch(): string {
  return simpleView()
    ? `<button class="view-sw" data-go="toggleView" title="Show every detail: horror table, bloodlust, events, the log">Show all details ▾</button>`
    : `<button class="view-sw" data-go="toggleView" title="Show only what matters right now">Simple view ▴</button>`;
}

function renderKillerPanel(c: Content, s: GameState) {
  const k = s.killer;
  const h = s.heroine;
  const lv = c.killer.bloodlust.levels;
  const cur = bloodlustLevel(c, s);
  const btrack = lv
    .map((l, i) => `<i class="${i < k.bloodlust ? 'past' : ''} ${i === k.bloodlust ? 'cur' : ''} ${i === c.killer.bloodlust.revealAt ? 'mark' : ''}" title="Bloodlust ${i}${l.name ? `: ${esc(l.name)}` : ''}. Move ${l.move}, attack ${l.attack}.${l.text ? ' ' + esc(l.text) : ''}"><b>${l.move}</b><b>${l.attack}</b></i>`)
    .join('');
  const beh = k.finale ? c.killer.finale.behavior : c.killer.behavior;
  const kSeen = killerSeen(c, s);
  const target = predictTarget(c, s);
  const nextTxt = !kSeen && !k.posed ? '?' : target === h.loc ? 'you' : nodeName(c, target);
  const g = c.killer.gimmick;
  let gState = '';
  if (g?.kind === 'traps') gState = `${s.traps?.length ?? 0}/${g.max} set`;
  else if (g?.kind === 'pose') gState = k.posed ? `next: ${esc(nodeName(c, k.posed))}` : 'nothing posed';
  else if (g?.kind === 'captives') gState = s.captives?.length ? `${s.captives.length} held · ${Math.min(...s.captives.map((x) => x.timer))} turn${Math.min(...s.captives.map((x) => x.timer)) > 1 ? 's' : ''} left` : 'none held';
  else if (g?.kind === 'fear') gState = h.horror >= 6 ? 'feeding: move +1, hits +1, heals' : h.horror >= 5 ? 'feeding: move +1' : 'quiet';
  else if (g?.kind === 'stalk') gState = `you walked ${h.stepsThisTurn ?? 0}`;
  const gimmickSec = g ? sec(esc(g.name), gState, `<p class="prose small">${esc(g.text)}</p>`, `gimmick ${g.kind}`) : '';
  const power =
    k.power === 'hidden'
      ? `<p class="prose small">Hidden until bloodlust ${c.killer.bloodlust.revealAt}, or the Finale.</p>`
      : k.power === 'active'
        ? `<div class="hpbar temp" title="Temporary health"><div style="width:${(k.powerHealth / Math.max(1, c.killer.power.health)) * 100}%"></div></div><p class="prose small">${esc(c.killer.power.text)}</p>`
        : `<p class="prose small spent">Broken.</p>`;
  const mdef = c.killer.minions;
  const minions = mdef
    ? sec(esc(mdef.plural), `${s.minions.length}/${mdef.max} out`, `<div class="facts"><i>${mdef.health} hp</i><i>move ${mdef.move}</i><i>attack ${mdef.attack}</i><i>${mdef.order === 'before' ? 'acts first' : 'acts after {him}'}</i></div><p class="prose small">${esc(mdef.text.split('. ')[0])}.</p>`)
    : '';
  const named = s.specials.length || s.specialsGone.length
    ? sec('Named survivors', '', `<ul class="list">${[...s.specials.map((x) => `<li><b>${esc(specialDef(c, x.id).name)}</b> · ${esc(nodeName(c, x.at))}<br><span>${esc(specialDef(c, x.id).text)}</span></li>`), ...s.specialsGone.map((x) => `<li class="gone"><b>${esc(specialDef(c, x.id).name)}</b> · ${x.how}</li>`)].join('')}</ul>`)
    : '';
  const sumK = document.getElementById('sum-k');
  if (sumK)
    sumK.innerHTML = `<b>${esc(c.killer.name.replace(/^The /, ''))}</b><span>${sym('health')}${k.health}/${k.maxHealth}${k.token !== null ? '+?' : ''}</span><span>move ${killerMoveValue(c, s)} · atk ${killerAttack(c, s)}</span><span>next: ${esc(nextTxt)}</span><i>${sideOpen.right ? 'hide' : 'details'}</i>`;
  document.getElementById('killer-panel')!.innerHTML = `<div class="pane dark">
    <header class="p-id">${killerPortrait({ finale: k.finale, art: c.killer.art })}
      <div><div class="p-name">${esc(c.killer.name)}</div><div class="p-role">${esc(c.killer.epithet)}</div></div></header>
    <div class="boss-hp ${k.health <= k.maxHealth / 3 ? 'low' : ''}" title="${k.token === null ? '{His} second-chance token is used. Next time {he} hits zero, {he} is dead.' : '{He} has a hidden second-chance token (final-health token). When a hit takes {him} below zero it is revealed: a number gets {him} back up with that much health, a blank means {he} is dead.'}">
      <div class="bh-top"><span class="bh-l">Health</span><span class="bh-n">${k.health}<small>/${k.maxHealth}</small></span>${k.power === 'active' && k.powerHealth ? `<span class="bh-tmp">+${k.powerHealth} shield</span>` : ''}<span class="bh-tok ${k.token === null ? 'used' : ''}">${k.token === null ? 'no 2nd chance' : '+ ? 2nd chance'}</span></div>
      <div class="bh-bar" style="--n:${k.maxHealth}"><i style="width:${(k.health / Math.max(1, k.maxHealth)) * 100}%"></i>${k.power === 'active' ? `<b style="width:${Math.min(100, (k.powerHealth / Math.max(1, k.maxHealth)) * 100)}%"></b>` : ''}</div>
      ${k.health === 0 && k.token !== null ? '<div class="bh-note">Down at 0: the next hit reveals {his} second-chance token. Blank = dead; a number = {he} gets up.</div>' : ''}
    </div>
    <div class="vitals two">
      ${vital('Move', String(killerMoveValue(c, s)), k.stunned ? 'stunned' : g?.kind === 'stalk' ? 'as far as you walk' : 'per turn', k.stunned ? 'good' : '')}
      ${vital('Attack', String(killerAttack(c, s)), 'damage per attack', '')}
    </div>
    ${sec(k.finale ? `Finale: ${esc(c.killer.finale.name)}` : '{His} turn', `next: <b>${esc(nextTxt)}</b>`, `<p class="prose small">${esc(beh.text)}</p>`, `next ${k.finale ? 'fin' : ''}`)}
    ${gimmickSec}
    ${sec(`Bloodlust ${k.bloodlust}`, esc(cur.name ?? ''), `<p class="prose small bl-why">Every kill feeds it: {he} moves farther and hits harder.</p><div class="btrack"><span class="bt-k"><b>move</b><b>attack</b></span>${btrack}</div>`, 'bloodlust')}
    ${sec(k.power === 'hidden' ? 'Power' : esc(c.killer.power.name), k.power === 'active' ? `${k.powerHealth} temp hp` : k.power === 'spent' ? 'spent' : 'hidden', power, `power ${k.power}`)}
    ${minions}
    ${named}
    ${sec('Ongoing events', '', `<ul class="list">${s.events.map((id) => `<li><b>${esc(eventDef(c, id).name)}</b><br><span>${esc(eventSummary(c, id))}</span></li>`).join('') || '<li>None.</li>'}</ul>`, s.events.length ? 'events' : 'events empty')}
    ${sec('Weakness', `lore ${loreBonus(c, s)}/${c.killer.items.length}`, `<p class="prose small">${esc(c.killer.weakness.text)}</p>`, 'weakness')}
    ${lastQuote ? `<p class="quote">${esc(lastQuote)}</p>` : ''}
    <div class="tally"><span><b class="good">${s.saved}</b> saved</span><span><b class="bad">${s.slain}</b> slain</span><span><b>${s.victimPool}</b> out there</span></div>
    ${viewSwitch()}
  </div>`;
}

function eventSummary(c: Content, id: string): string {
  const ev = eventDef(c, id);
  const parts: string[] = [];
  for (const [key, n] of Object.entries(ev.ongoing ?? {})) parts.push(describeEffect({ op: 'mod', key: key as never, n: n as number }));
  if (ev.upkeep?.length) parts.push(`each turn end: ${describeEffects(ev.upkeep)}`);
  return parts.join('; ') || ev.text;
}

function updateBoard() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const moving = s.pending?.kind === 'move';
  const reach = moving ? walkNeighbors(c, s, h.loc) : [];
  const goal = shownGoal(c, s);
  const kSeen = killerSeen(c, s);
  const kAt = killerShownAt(c, s);
  // Who walks with her on her next step: lit green on the map, counted under her token.
  const hereN = s.outcome ? 0 : npcAt(s, h.loc);
  const lead = followPlan(c, s, h.loc, '');
  document.querySelectorAll<HTMLButtonElement>('.node').forEach((el) => {
    const id = el.dataset.node!;
    el.classList.toggle('reach', reach.includes(id));
    el.classList.toggle('goal', !!goal?.node && goal.node === id && id !== h.loc);
    el.classList.toggle('here', id === h.loc);
    const badges: string[] = [];
    const pile = s.piles[id];
    if (pile) badges.push(`<span class="badge search ${pile.cards.length ? '' : 'empty'}" title="Item pile: ${pile.cards.length} left${pile.up && pile.cards.length ? `. Top card: ${esc(itemDef(c, pile.cards[0]).name)}` : ''}">${glyph('search')}${pile.cards.length}</span>`);
    if (isExit(c, id)) badges.push(exitOpen(c, s, id) ? `<span class="badge exitb" title="Exit: survivors here with you are rescued">EXIT</span>` : `<span class="badge exitb shut" title="Bus stop: an exit only while the bus waits">BUS</span>`);
    if (moving && hereN && reach.includes(id)) {
      const f = followers(c, s, h.loc, id);
      badges.push(id === s.killer.loc
        ? `<span class="badge fol none" title="Survivors won’t follow you into {his} location">${glyph('person')}✕</span>`
        : `<span class="badge fol" title="${f ? `${f} survivor${f > 1 ? 's' : ''} follow${f > 1 ? '' : 's'} you here` : 'No one follows you'}">${glyph('person')}+${f}</span>`);
    }
    if ((s.barricades[id] ?? 0) > 0) badges.push(`<span class="badge barr" title="Barricade: costs {him} ${s.barricades[id]} movement">${glyph('barricade')}${s.barricades[id]}</span>`);
    const rk = c.location.rule.kind;
    if (rk === 'cold' && hasTag(c, id, 'outdoor')) badges.push(`<span class="badge env" title="Outdoors: ending a turn here adds cold">${glyph('snow')}</span>`);
    if (rk === 'cold' && hasTag(c, id, 'warm')) badges.push(`<span class="badge env warm" title="Warm: ending a turn here thaws you">${glyph('fire')}</span>`);
    if (rk === 'tide' && hasTag(c, id, 'shore')) badges.push(`<span class="badge env" title="Shore: floods at high tide">${glyph(isFlooded(c, s, id) ? 'wave' : 'ripple')}</span>`);
    if (rk === 'calls' && hasTag(c, id, 'phone')) badges.push(`<span class="badge env ${s.env.ringing === id ? 'ringing' : ''}" title="${s.env.ringing === id ? 'Ringing! Answer it here.' : 'Phone'}">${glyph('phone')}</span>`);
    if (rk === 'campfire' && hasTag(c, id, 'fire')) badges.push(haven(c, s, id) ? `<span class="badge env warm" title="Campfire: a haven while it burns. Fuel ${s.env.fuel}/3. Stoke it here.">${glyph('fire')}${s.env.fuel}</span>` : `<span class="badge env out" title="The fire is out: no shelter here">${glyph('fire')}✕</span>`);
    if (rk === 'shutters' && hasTag(c, id, 'switch')) badges.push(`<span class="badge env" title="Security Office: override the shutters here">${glyph('lock')}</span>`);
    if (rk === 'bus' && hasTag(c, id, 'bus')) badges.push(`<span class="badge env ${s.env.bus ? 'ringing' : ''}" title="${s.env.bus ? 'The bus is here: everyone waiting leaves on it at the end of your Action phase' : 'The bus stops here every 3rd turn'}">${glyph('bus')}</span>`);
    if (rk === 'dj' && hasTag(c, id, 'booth')) badges.push(`<span class="badge env" title="DJ Booth: skip the song here">${glyph('music')}</span>`);
    if (rk === 'corn' && hasTag(c, id, 'corn')) badges.push(`<span class="badge env corn" title="Corn: {he} can’t be seen here from more than 1 step away">${glyph('corn')}</span>`);
    if (rk === 'corn' && hasTag(c, id, 'lookout')) badges.push(`<span class="badge env" title="Look out over the maze from here (free, once a turn)">${glyph('eye')}</span>`);
    if (s.traps?.includes(id)) badges.push(`<span class="badge trap" title="A steel trap: step in and lose 1 health, and your move ends">${glyph('trap')}</span>`);
    if (s.killer.posed === id) badges.push(`<span class="badge posed" title="{His} mannequin: {he} strikes here next turn. A barricade keeps {him} out.">${glyph('mannequin')}next</span>`);
    if (id === c.location.lair && s.captives?.length) badges.push(`<span class="badge captive" title="${s.captives.length} held here. The next dies ${Math.min(...s.captives.map((x) => x.timer)) <= 1 ? 'at the end of this turn' : `in ${Math.min(...s.captives.map((x) => x.timer))} turns`}. Reach this place to free them.">${glyph('lock')}${s.captives.length}·${Math.min(...s.captives.map((x) => x.timer))}</span>`);
    el.classList.toggle('flooded', isFlooded(c, s, id));
    el.classList.toggle('ringing', s.env.ringing === id || (rk === 'bus' && !!s.env.bus && hasTag(c, id, 'bus')));
    el.classList.toggle('haven', haven(c, s, id));
    el.classList.toggle('trapped', !!s.traps?.includes(id));
    el.classList.toggle('posed', s.killer.posed === id);
    el.querySelector('.badges')!.innerHTML = badges.join('');
    const mine = id === h.loc && hereN > 0;
    const tag = (on: boolean) => (mine ? (on ? ' fol' : ' stay') : '');
    const named = specialsAt(s, id).map((x) => `<span class="named${tag(lead.specials.includes(x.id))}" title="${esc(specialDef(c, x.id).name)}: ${esc(specialDef(c, x.id).text)}">${victimIcon()}<i>${esc(specialDef(c, x.id).name.split(',')[0].trim().split(' ').pop()!)}</i></span>`);
    const mins = minionsAt(s, id).length;
    el.querySelector('.vics')!.innerHTML =
      Array.from({ length: s.victims[id] ?? 0 }, (_, i) => `<span class="vw${tag(i < lead.regular)}">${victimIcon()}</span>`).join('') + named.join('') + (mins ? `<span class="minion" title="${mins} ${esc(mins > 1 ? c.killer.minions!.plural : c.killer.minions!.name)}">${'☠'.repeat(mins)}</span>` : '');
    // On touch, every location stays tappable (a tap reads it); with a mouse, hover does that.
    el.disabled = !touchOnly.matches && !reach.includes(id) && id !== h.loc;
  });
  document.querySelectorAll<SVGGElement>('svg.edges [data-edge]').forEach((ln) => {
    const [a, b] = ln.dataset.edge!.split('|');
    ln.classList.toggle('hot', (a === h.loc && reach.includes(b)) || (b === h.loc && reach.includes(a)));
  });
  const pos = (id: string) => c.location.nodes.find((n) => n.id === id)!;
  const hp = pos(h.loc);
  const kp = pos(kAt);
  const same = h.loc === kAt;
  const X = (x: number) => x / 10;
  const Y = (y: number) => y / 6.4;
  const th = document.getElementById('tok-h')!;
  th.style.left = `${X(hp.x) - (same ? 3.4 : 0)}%`;
  th.style.top = `${Y(hp.y) - 8.5}%`;
  th.classList.toggle('hidden', h.hidden);
  const fol = document.getElementById('tok-fol')!;
  fol.hidden = !hereN;
  fol.classList.toggle('part', lead.count < hereN);
  fol.innerHTML = `${glyph('person')}${lead.count < hereN ? `${lead.count} of ${hereN} follow` : `${lead.count} follow${lead.count > 1 ? '' : 's'}`}`;
  const rh = document.getElementById('ring-h')!;
  rh.style.left = `${X(hp.x)}%`;
  rh.style.top = `${Y(hp.y)}%`;
  const tk = document.getElementById('tok-k')!;
  tk.style.left = `${X(kp.x) + (same ? 3.4 : 0)}%`;
  tk.style.top = `${Y(kp.y) - 9}%`;
  tk.classList.toggle('stunned', s.killer.stunned > 0);
  tk.classList.toggle('ghost', !kSeen);
  tk.querySelector('.tag')!.textContent = kSeen ? c.killer.name.replace(/^The /, '') : 'last seen';
  document.querySelectorAll<HTMLElement>('.gate-pin').forEach((g) => {
    const [a, b] = g.dataset.gateEdge!.split('|');
    const down = gateDown(c, s, a, b);
    g.classList.toggle('down', down);
    g.title = `${down ? 'Shutter DOWN' : 'Shutter up'}: ${GATE_NAMES[g.classList.contains('g1') ? 1 : 0]} set`;
  });
  document.querySelectorAll<SVGGElement>('svg.edges [data-edge]').forEach((ln) => {
    const [a, b] = ln.dataset.edge!.split('|');
    ln.classList.toggle('shut', gateDown(c, s, a, b));
  });
  const khp = document.getElementById('tok-khp');
  if (khp) {
    const k = s.killer;
    const max = Math.max(1, k.maxHealth);
    (khp.querySelector('.hp') as HTMLElement).style.width = `${(k.health / max) * 100}%`;
    (khp.querySelector('.tmp') as HTMLElement).style.width = k.power === 'active' ? `${Math.min(100, (k.powerHealth / max) * 100)}%` : '0';
    khp.querySelector('span')!.textContent = `${k.health}/${k.maxHealth}${k.power === 'active' && k.powerHealth ? ` +${k.powerHealth}` : ''}`;
    khp.title = `${c.killer.name}: ${k.health} of ${k.maxHealth} health${k.power === 'active' && k.powerHealth ? `, plus ${k.powerHealth} temporary` : ''}${k.token !== null ? ', and a hidden final-health token' : ''}`;
    khp.classList.toggle('low', k.health <= max / 3);
  }
  tk.classList.toggle('finale', s.killer.finale);
  const rk = document.getElementById('ring-k')!;
  rk.style.left = `${X(kp.x)}%`;
  rk.style.top = `${Y(kp.y)}%`;
  rk.classList.toggle('same', same);
  const thr = document.getElementById('threat') as unknown as SVGLineElement;
  const adjacent = !same && kSeen && neighbors(c, h.loc).includes(kAt);
  thr.setAttribute('x1', String(hp.x));
  thr.setAttribute('y1', String(hp.y));
  thr.setAttribute('x2', String(kp.x));
  thr.setAttribute('y2', String(kp.y));
  thr.classList.toggle('on', adjacent);
  const board = document.getElementById('board')!;
  board.classList.toggle('dark', s.env.dark || (c.location.rule.kind === 'dj' && song(c, s) === 1));
  board.classList.toggle('strobe', c.location.rule.kind === 'dj' && song(c, s) === 2);
  const hint = document.getElementById('board-hint')!;
  if (moving) {
    const p = s.pending as { kind: 'move'; left: number };
    const here = npcAt(s, h.loc);
    const cap = escortCap(c);
    const named = specialsAt(s, h.loc)
      .map((x) => `<button class="btn tiny ${(h.leave ?? []).includes(x.id) ? '' : 'sel'}" data-follow="${x.id}" title="${(h.leave ?? []).includes(x.id) ? 'Staying put: click to bring' : 'Coming with you: click to leave behind'}">${esc(specialDef(c, x.id).name.split(',')[0].trim().split(' ').pop()!)} ${(h.leave ?? []).includes(x.id) ? 'stays' : 'comes'}</button>`)
      .join('');
    const bring = here ? `<span class="hint-group">Survivors coming with you: <span class="bring">${Array.from({ length: Math.min(cap, here) + 1 }, (_, n) => `<button class="btn tiny ${Math.min(h.bring, here) === n ? 'sel' : ''}" data-bring="${n}">${n}</button>`).join('')}</span>${here > cap ? ` <span class="dim">of ${here} (you can lead ${cap})</span>` : ''}${named ? ` ${named}` : ''}</span>` : '';
    hint.innerHTML = `<span class="hint-group"><b class="steps">${p.left}</b> step${p.left > 1 ? 's' : ''} left: click a glowing location, or stop here</span>${bring}`;
  } else hint.innerHTML = '';
  const strip = document.getElementById('goal-strip')!;
  strip.innerHTML = goal ? goalBar(goal) : '';
  strip.classList.toggle('on', !!goal);
}

/** Phone only: the backpack button. Glows when an item or the ability can be used now. */
function itemsButton(c: Content, s: GameState): string {
  const h = s.heroine;
  const n = h.items.length + h.pack.length;
  const ready = [...h.items, ...h.pack].some((it) => check(c, s, { type: 'useItem', uid: it.uid }).ok) || (abilityUnlocked(c, s) && check(c, s, { type: 'useAbility' }).ok);
  return `<button class="btn small items-btn ${ready ? 'ready' : ''} ${itemsOpen ? 'on' : ''}" data-go="toggleItems" title="Items and ability">${glyph('pack')}<b>${n}</b></button>`;
}

/** Waiting bonuses (Psych Up, Steady Hands, events) as chips, so a "next hit +2" is never invisible. */
function buffChips(s: GameState): string {
  const m = s.mods;
  const out: string[] = [];
  if (m.damage) out.push(`next hit +${m.damage}`);
  if (m.rerollNext) out.push('next roll: reroll misses');
  if (m.rollDice) out.push(`rolls ${m.rollDice > 0 ? '+' : '−'}${Math.abs(m.rollDice)} die`);
  if (m.attackDice) out.push(`attacks +${m.attackDice} die`);
  if (m.searchDice) out.push(`search ${m.searchDice > 0 ? '+' : '−'}${Math.abs(m.searchDice)} die`);
  if (m.hideDice) out.push(`hide +${m.hideDice} die`);
  return out.length ? `<div class="st-buffs">${out.map((x) => `<i>${esc(x)}</i>`).join('')}</div>` : '';
}

function shortWhy(why?: string): string | undefined {
  if (!why) return undefined;
  const map: [RegExp, string][] = [
    [/^The killer must be here/, 'needs killer'],
    [/^Not with the killer/, 'killer here'],
    [/^Only at a search/, 'no search'],
    [/^Nothing left to find/, 'searched out'],
    [/^\{He\} must be here/, 'out of reach'],
    [/^Reactions are played/, '{his} turn'],
    [/^Out of nerve/, 'out of nerve'],
  ];
  return map.find(([re]) => re.test(why))?.[1] ?? why.toLowerCase();
}

function updateBottom() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const cards = h.hand
    .map((card, i) => {
      const d = actionDef(c, card.id);
      const chk = check(c, s, { type: 'playCard', uid: card.uid });
      const disc = s.phase === 'action' && !s.pending && h.nerve >= 0 ? `<span class="disc" data-discard="${card.uid}" title="Discard this card for +1 nerve">discard +1${sym('nerve')}</span>` : '';
      const warn = chk.ok && h.nerve - chk.cost < 0 ? ' · ends your turn' : '';
      // Say why a card is greyed out right on it (tooltips never show on touch).
      const why = !chk.ok && s.phase === 'action' && !s.pending ? shortWhy(chk.why) : undefined;
      return cardHtml(c, s, d, `data-card="${card.uid}" ${chk.ok ? '' : 'disabled'} title="${esc((chk.why ? chk.why + '. ' : '') + d.flavor + warn)}"`, disc, i, why);
    })
    .join('');
  const answer =
    c.location.rule.kind === 'calls' && s.phase === 'action'
      ? (() => {
          const chk = check(c, s, { type: 'answer' });
          return `<button class="act answer" data-act="answer" data-kind="answer" ${chk.ok ? '' : 'disabled'} title="${esc(chk.why ?? 'Answer the ringing phone')}"><span class="n">Answer <kbd>A</kbd></span><span class="c"><b>${chk.cost}◉</b> ${esc(s.env.ringing ? `ringing at ${nodeName(c, s.env.ringing)}` : 'no phone ringing')}</span></button>`;
        })()
      : '';
  const ra = ruleAction(c);
  const ruleBtn =
    ra && s.phase === 'action'
      ? (() => {
          const chk = check(c, s, { type: 'ruleAct' });
          return `<button class="act answer" data-act="ruleAct" data-kind="answer" ${chk.ok ? '' : 'disabled'} title="${esc(chk.why ?? ra.text)}"><span class="n">${esc(ra.label)} <kbd>A</kbd></span><span class="c"><b>${chk.cost}◉</b> ${esc(chk.ok ? ra.text : chk.why ?? '')}</span></button>`;
        })()
      : '';
  const track = DIFFICULTY[s.difficulty].track;
  const rose = lastHorrorShown !== null && h.horror > lastHorrorShown;
  const fell = lastHorrorShown !== null && h.horror < lastHorrorShown;
  lastHorrorShown = h.horror;
  const pile = `<div class="status ${rose ? 'up' : fell ? 'down' : ''}" title="Horror ${h.horror}: every Horror Roll uses ${horrorDice(s)} dice before bonuses">
    <div class="st-h"><span class="st-l">${sym('horror', { big: true })}<em>horror</em></span><span class="st-v ${h.horror >= 4 ? 'bad' : ''}">${h.horror}<small>/${MAX_HORROR}</small></span></div>
    <div class="st-m">${track.map((_, i) => `<i class="${i <= h.horror && i > 0 ? 'on' : ''} ${i === h.horror ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="st-row"><span title="Dice per roll">${sym('dice')}<b>${horrorDice(s)}</b><em>dice</em></span><span class="${h.nerve < 0 ? 'bad' : ''}" title="Nerve to spend">${sym('nerve')}<b>${h.nerve}</b><em>nerve</em></span></div>
    <div class="st-row dim"><span>${h.hand.length}/${HAND_LIMIT} cards</span><span>${s.discard.length} used</span></div>
    ${buffChips(s)}
  </div>`;
  let main = '';
  if (s.pending?.kind === 'move')
    main = `<button class="endturn stop" data-act="stopMove">Stop here <small style="display:block;font-size:10px;opacity:.8">${(s.pending as { left: number }).left} step${(s.pending as { left: number }).left > 1 ? 's' : ''} unused · S</small></button>`;
  else if (s.phase === 'action')
    main = `<button class="endturn" data-act="endAction" ${check(c, s, { type: 'endAction' }).ok ? '' : 'disabled'}>End Action <small style="display:block;font-size:10px;opacity:.7">${h.nerve}${sym('nerve')} → Shop · E</small></button>`;
  else if (s.phase === 'planning')
    main = `<button class="endturn shop-btn" data-go="openPlan">Shop <small style="display:block;font-size:10px;opacity:.8">${h.nerve}${sym('nerve')} · B</small></button><button class="endturn" data-act="endPlanning">Done <small style="display:block;font-size:10px;opacity:.7">{his} turn · E</small></button>`;
  else if (s.phase === 'upkeep')
    main = `<button class="endturn" data-act="endUpkeep" ${check(c, s, { type: 'endUpkeep' }).ok ? '' : 'disabled'}>Next turn <small style="display:block;font-size:10px;opacity:.7">E</small></button>`;
  else main = `<button class="endturn" disabled>{His} turn…</button>`;
  const bar = document.getElementById('bottombar')!;
  const keepX = bar.querySelector<HTMLElement>('.hand-row')?.scrollLeft ?? 0;
  const goal = shownGoal(c, s);
  const mini = goal ? `<div class="goal-mini">${glyph('target')}<b>${esc(goal.title)}</b><span>${esc(goal.detail)}</span><button class="btn tiny gb-show" data-go="hint">Show me</button></div>` : '';
  bar.innerHTML = `
    <div>${pile}<div class="hand-wrap"><div class="actions hand-row">${cards}${answer}${ruleBtn}</div><button class="hand-more l" data-hscroll="-1" aria-label="Scroll hand left"></button><button class="hand-more r" data-hscroll="1" aria-label="Scroll hand right"></button></div></div>
    <div class="endcol"><div class="endtools">${itemsButton(c, s)}<button class="btn small" data-go="undo" ${canUndo() ? '' : 'disabled'} title="Undo (Z): not after dice rolls or draws">${glyph('undo')} Undo</button><button class="btn small" data-go="hint" ${s.phase === 'action' || s.phase === 'planning' ? '' : 'disabled'} title="What would a survivor do? (H)">${glyph('bulb')} Hint</button></div>
    ${main}</div>${mini}`;
  const row = bar.querySelector<HTMLElement>('.hand-row')!;
  row.scrollLeft = keepX;
  row.addEventListener('scroll', syncHandMore, { passive: true });
  syncHandMore();
}

/** Show "+N" arrows when part of the hand is scrolled out of view. */
function syncHandMore() {
  const row = document.querySelector<HTMLElement>('#bottombar .hand-row');
  if (!row) return;
  const box = row.getBoundingClientRect();
  const cards = [...row.children] as HTMLElement[];
  const hidL = cards.filter((x) => x.getBoundingClientRect().left < box.left - 4).length;
  const hidR = cards.filter((x) => x.getBoundingClientRect().right > box.right + 4).length;
  const set = (side: 'l' | 'r', n: number) => {
    const b = row.parentElement!.querySelector<HTMLElement>(`.hand-more.${side}`)!;
    b.hidden = n === 0;
    b.textContent = side === 'l' ? `◂ ${n}` : `${n} more ▸`;
  };
  set('l', hidL);
  set('r', hidR);
}

function itemCard(c: Content, id: string, extra = '') {
  const x = itemDef(c, id);
  return `<div class="itemcard ${x.kind} ${extra}">${itemIcon(x)}<b>${esc(x.name)}</b><span>${esc(x.text)}</span></div>`;
}

function updateOverlay() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const root = document.getElementById('overlay-root')!;
  if (overlayLocked) return;
  if (cardQueue.length) {
    const r = cardQueue[0];
    let kind = '';
    let name = '';
    let text = '';
    let fx = '';
    let still = '';
    let cls = 'killer';
    if (r.kind === 'terror') {
      const t = terrorDef(c, r.id);
      kind = `Terror · ${s.terrorDeck.length} left`;
      name = t.name;
      text = t.text;
      fx = describeEffects(t.effects);
      still = eventStill(t, 'terror');
      cls = t.tone === 'calm' ? 'calm' : t.tone === 'victim' ? '' : 'killer terror';
    } else if (r.kind === 'event') {
      const ev = eventDef(c, r.id);
      kind = 'Event · stays in play';
      name = ev.name;
      text = ev.text;
      fx = eventSummary(c, r.id);
      still = eventStill(ev, 'event');
      cls = ev.tone === 'calm' ? 'calm' : '';
    } else if (r.kind === 'finale') {
      kind = 'Finale';
      name = c.killer.finale.name;
      text = c.killer.finale.text;
      fx = `New behavior: ${c.killer.finale.behavior.text}`;
      cls = 'killer terror';
    } else {
      kind = '{His} power is revealed';
      name = c.killer.power.name;
      text = c.killer.power.text;
      cls = 'killer terror';
    }
    root.innerHTML = `<div class="overlay"><div class="card ${cls}">
      <div class="face">
        ${still ? `<div class="still-wrap">${still}</div>` : ''}
        <div class="kind">${esc(kind)}</div>
        <h2>${esc(name)}</h2>
        <p>${esc(text)}</p>
        ${fx ? `<div class="fxline">${esc(fx)}</div>` : ''}
        <button class="btn primary" data-go="ackCard">Continue <small>(space)</small></button>
      </div></div></div>`;
    return;
  }
  const p = s.pending;
  if (p?.kind === 'roll' && s.rolling) {
    const r = s.rolling;
    const d = actionDef(c, r.card);
    const succ = r.dice.filter((x) => x >= 5).length + r.converted.length;
    const bandOf = (n: number) => (n >= 2 ? 'great' : n === 1 ? 'good' : 'fail') as 'great' | 'good' | 'fail';
    const band = bandOf(succ);
    // Would spending cards change anything? Only if a partial is left, the one
    // buy-up is unused, and she isn't already on the best row.
    const hasPartial = r.dice.some((v, i) => v >= 3 && v <= 4 && !r.converted.includes(i));
    const buyLeft = r.converted.length < MAX_BUYUPS;
    const helps = hasPartial && buyLeft && succ < 2 && buyUpMatters(c, s);
    const canBuy = helps && h.hand.length >= CONVERT_COST;
    const up = bandOf(succ + 1);
    const fx = (b: 'great' | 'good' | 'fail') => describeEffects(d[b] ?? []);
    const dice = r.dice
      .map((v, i) => {
        const conv = r.converted.includes(i);
        const cls = v >= 5 || conv ? 'hit' : v >= 3 ? 'part' : 'miss';
        const can = cls === 'part' && canBuy;
        const tag = conv ? 'bought' : cls === 'hit' ? 'hit' : cls === 'part' ? (can ? 'buy up' : 'almost') : 'miss';
        return `<button class="die ${cls} ${conv ? 'conv' : ''} ${can ? 'offer' : ''} ${convertDie === i ? 'sel' : ''}" ${can ? `data-die="${i}" title="Spend ${CONVERT_COST} cards to make this a success"` : 'disabled'}>${pip(v)}<span class="dtag">${tag}</span></button>`;
      })
      .join('');
    // The card's three rows: where she stands now, and where a buy-up would take her.
    const rows = (['great', 'good', 'fail'] as const)
      .map((b) => `<div class="lrow b-${b} ${b === band ? 'cur' : ''} ${canBuy && b === up ? 'up' : ''}"><i>${b === 'great' ? '2+' : b === 'good' ? '1' : '✗'}</i><span>${fxHtml(fx(b))}</span>${b === band ? '<em>now</em>' : canBuy && b === up ? '<em>buy up</em>' : ''}</div>`)
      .join('');
    let offer = '';
    if (convertDie !== null)
      offer = `<div class="buy-pick"><p>Discard <b>${CONVERT_COST}</b> cards (least useful picked; tap to change):</p><div class="conv-hand">${h.hand
        .map((x) => `<button class="chip ${convertPick.includes(x.uid) ? 'sel' : ''}" data-cpick="${x.uid}">${esc(actionDef(c, x.id).name)}</button>`)
        .join('')}</div><button class="btn buy-go" data-go="doConvert" ${convertPick.length === CONVERT_COST ? '' : 'disabled'}>Discard &amp; buy up → ${fxHtml(fx(up))}</button></div>`;
    else if (canBuy) offer = `<button class="btn buy-go" data-go="buyUp">Spend ${CONVERT_COST} cards: <b>${fxHtml(fx(up))}</b> instead of ${fxHtml(fx(band))}</button>`;
    else if (helps) offer = `<p class="buy-note">A buy-up would help, but it needs ${CONVERT_COST} cards in hand.</p>`;
    else if (hasPartial && succ >= 2) offer = '<p class="buy-note good">Already the best row: no need to spend cards.</p>';
    else if (hasPartial && buyLeft && !buyUpMatters(c, s)) offer = '<p class="buy-note good">This already blocks the whole hit: no need to spend cards.</p>';
    else if (hasPartial && !buyLeft) offer = '<p class="buy-note">One buy-up per roll: used.</p>';
    else if (band !== 'great') offer = '<p class="buy-note">No 3 or 4 to buy up this time.</p>';
    // Tumble the dice once per roll, not on every re-render while choosing cards.
    const rollKey = `${r.uid}:${r.dice.join('')}`;
    const settled = rollKey === trayRollKey;
    trayRollKey = rollKey;
    root.innerHTML = `<div class="overlay"><div class="dicetray live ${r.reaction ? 'react' : ''} ${settled ? 'settled' : ''}">
      <h5>${esc(d.name)} · 5–6 hit · 3–4 almost</h5>
      ${s.lastRoll?.parts ? `<div class="why">${esc(diceWhy(s.lastRoll.parts))}</div>` : ''}
      <div class="dice">${dice}</div>
      <div class="res-tag b-${band}">${succ} success${succ === 1 ? '' : 'es'}: ${band === 'great' ? 'best row' : band === 'good' ? 'middle row' : 'fail row'}</div>
      <div class="ladder">${rows}</div>
      ${offer}
      <button class="btn primary take" data-act="resolveRoll">Keep it: ${fxHtml(fx(band))} <small>(space)</small></button>
    </div></div>`;
    return;
  }
  if (p?.kind === 'search') {
    root.innerHTML = `<div class="overlay"><div class="swap search-ov">
      <div class="kind">Search · ${esc(nodeName(c, p.node))}</div>
      <h2>Keep up to ${p.keep}</h2>
      <p>The rest go back on top of the pile, face up.</p>
      <div class="swap-row">${p.drawn.map((id, i) => `<button class="swap-opt ${searchPicks.includes(i) ? 'sel' : ''}" data-spick="${i}">${itemCard(c, id)}<small>${searchPicks.includes(i) ? 'Keeping' : 'Keep'}</small></button>`).join('')}</div>
      <button class="btn primary" data-go="keepPicks">Keep ${searchPicks.length} <small>(space)</small></button>
    </div></div>`;
    return;
  }
  if (p?.kind === 'aim') {
    const def = c.killer.minions!;
    const mins = minionsAt(s, h.loc);
    const total = minionDamage(c, s, p.base);
    const one = def.name.replace(/^(A|An) /, '');
    if (!p.killer || aimMode === 'split') {
      // Divide the damage between the minions here.
      if (!Object.keys(splitDraft).length || Object.keys(splitDraft).some((u) => !mins.some((m) => m.uid === +u))) splitDraft = autoSplit(c, s, p.base);
      const assigned = Object.values(splitDraft).reduce((n, v) => n + v, 0);
      const rows = mins
        .map((m, i) => {
          const v = splitDraft[m.uid] ?? 0;
          return `<div class="split-row"><span class="sr-n">${esc(one)} ${i + 1}</span><span class="sr-h">${'■'.repeat(m.health)}<small>${m.health} hp</small></span>
            <span class="sr-c"><button class="btn tiny" data-split="${m.uid}" data-d="-1" ${v <= 0 ? 'disabled' : ''}>−</button><b>${v}</b><button class="btn tiny" data-split="${m.uid}" data-d="1" ${assigned >= total ? 'disabled' : ''}>+</button></span>
            <span class="sr-r ${v >= m.health ? 'kill' : ''}">${v >= m.health ? 'destroyed' : v ? `${m.health - v} hp left` : ''}</span></div>`;
        })
        .join('');
      root.innerHTML = `<div class="overlay"><div class="draft react-ov aim-ov">
        <div class="kind">Divide the damage</div>
        <h2>${total} damage on the ${esc(def.plural)}</h2>
        <p>Your weapon adds to it; lore doesn't. Damage you don't assign, or that's more than one needs, is lost.</p>
        <div class="split">${rows}</div>
        <div class="split-sum">${assigned} of ${total} assigned${assigned < total ? ` · ${total - assigned} will be lost` : ''}</div>
        <div class="row-btns">${p.killer ? '<button class="btn" data-go="aimBack">Back</button>' : ''}<button class="btn primary" data-go="aimSplit">Strike</button></div>
      </div></div>`;
      return;
    }
    root.innerHTML = `<div class="overlay"><div class="draft react-ov aim-ov">
      <div class="kind">Choose a target</div>
      <h2>${p.base} damage: ${esc(c.killer.name)}, or them?</h2>
      <p>Hit <b>${esc(c.killer.name)}</b> (weapon and lore add to it), or the <b>${mins.length} ${esc(mins.length > 1 ? def.plural : one)}</b> here (weapon adds to it; you divide it between them). Not both.</p>
      <div class="row-btns" style="justify-content:center"><button class="btn primary" data-aim="killer">Hit ${esc(c.killer.name)}</button><button class="btn" ${mins.length > 1 ? 'data-go="aimMinions"' : 'data-aim="minions"'}>Hit the ${esc(mins.length > 1 ? def.plural : one)}</button></div>
    </div></div>`;
    return;
  }
  if (p?.kind === 'reaction') {
    const dmg = s.attack?.damage ?? 0;
    const reacts = h.hand
      .filter((x) => actionDef(c, x.id).kind === 'reaction')
      .map((x) => {
        const chk = check(c, s, { type: 'react', uid: x.uid });
        return cardHtml(c, s, actionDef(c, x.id), `data-react="${x.uid}" ${chk.ok ? '' : `disabled title="${esc(chk.why ?? '')}"`}`);
      })
      .join('');
    root.innerHTML = `<div class="overlay"><div class="draft react-ov">
      <div class="kind">Reaction</div>
      <h2>${esc(s.attack?.by !== undefined ? (c.killer.minions?.name ?? 'A minion') : c.killer.name)} attacks: ${dmg} damage</h2>
      <p>You have <b>${h.health}</b> health${h.token !== null ? ', plus your hidden second-chance token' : ' and no second-chance token left'}. A reaction card costs nerve from next turn and protects against this one attack.</p>
      <div class="draft-row">${reacts}</div>
      <button class="btn primary" data-act="takeHit">Take the hit (${dmg})</button>
    </div></div>`;
    return;
  }
  if (swapFor !== null && (s.rearrange || s.phase === 'upkeep')) {
    const it = h.pack.find((x) => x.uid === swapFor);
    if (it) {
      root.innerHTML = `<div class="overlay"><div class="swap">
        <div class="kind">Hands full</div><h2>Put one away</h2>
        <div class="swap-new">${itemCard(c, it.id, 'new')}</div>
        <div class="swap-row">${h.items.map((x) => `<button class="swap-opt" data-swap="${it.uid}" data-out="${x.uid}">${itemCard(c, x.id)}<small>Put this away</small></button>`).join('')}</div>
        <button class="btn" data-go="cancelSwap">Cancel</button></div></div>`;
      return;
    }
  }
  if (s.phase === 'planning' && planHidden === s.round) {
    // Peeking at the board: a slim banner keeps the way back to the shop in plain sight.
    root.innerHTML = `<div class="peek-banner" role="status">
      <span class="pb-k">Shop</span>
      <span class="pb-v">${sym('nerve')}<b class="${h.nerve <= 0 ? 'bad' : ''}">${h.nerve}</b> to spend</span>
      <span class="pb-v"><b class="${h.hand.length >= HAND_LIMIT ? 'bad' : ''}">${h.hand.length}</b>/${HAND_LIMIT} cards</span>
      <button class="btn primary" data-go="openPlan">${glyph('pack')} Back to the shop <small>(B)</small></button>
    </div>`;
    return;
  }
  if (s.phase === 'planning') {
    const keep = root.querySelector<HTMLElement>('.shop-body')?.scrollTop ?? 0;
    const full = h.hand.length >= HAND_LIMIT;
    const resetTo = DIFFICULTY[s.difficulty].nerve;
    const shelves = SHELVES.map((sh) => {
      const cards = c.actions
        .filter((d) => shelfOf(c, d) === sh.id)
        .map((d) => {
          const chk = check(c, s, { type: 'buy', id: d.id });
          const left = s.tableau[d.id] ?? 0;
          const held = h.hand.filter((x) => x.id === d.id).length;
          const used = s.discard.includes(d.id);
          const poor = left > 0 && !full && !chk.ok;
          const status = poor
            ? `<span class="pilecount poor">need ${cardCost(c, d)}${sym('nerve')}</span>`
            : left > 0
              ? `<span class="pilecount">${left} left</span>`
              : `<span class="pilecount out">${used ? 'back next turn' : held ? 'in your hand' : 'none left'}</span>`;
          const nudge = chk.ok && d.id === 'ac-walk' && !h.hand.some((x) => actionDef(c, x.id).tags.includes('move')) ? 'suggest' : '';
          return cardHtml(c, s, d, `data-buy="${d.id}" ${chk.ok ? '' : `disabled title="${esc(chk.why ?? '')}"`}`, status).replace('class="act fcard', `class="act fcard ${nudge}`);
        })
        .join('');
      return cards ? `<section class="shop-shelf sh-${sh.id}"><h3><span class="sh-n">${sh.name}</span><span class="sh-d">${sh.blurb}</span></h3><div class="shelf-cards">${cards}</div></section>` : '';
    }).join('');
    const counts = new Map<string, number>();
    for (const x of h.hand) counts.set(x.id, (counts.get(x.id) ?? 0) + 1);
    const handChips = [...counts].map(([id, n]) => `<i class="chip-c sh-${shelfOf(c, actionDef(c, id))}">${esc(actionDef(c, id).name)}${n > 1 ? ` ×${n}` : ''}</i>`).join('');
    const note = full
      ? 'Your hand is full. Play or discard cards next turn to make room.'
      : h.nerve <= 0
        ? 'Out of nerve. You can still take the free cards, or press Done.'
        : `Cards you played went back to the shop, not your hand: buy what you’ll need next turn. Unspent nerve is lost (it resets to ${resetTo}).`;
    // The classic first-game trap: ending Planning with no way to move.
    const canMove = h.hand.some((x) => actionDef(c, x.id).tags.includes('move'));
    const walkLeft = (s.tableau['ac-walk'] ?? 0) > 0;
    const goal = currentGoal(c, s);
    const needs = full ? [] : planNeeds(c, s);
    const moveWarn = canMove || full ? '' : `<div class="shop-warn">${walkLeft ? 'No movement card for next turn. Take a free <b>Walk</b>.' : 'No movement card for next turn. Buy one from the <b>Move</b> shelf.'}</div>`;
    root.innerHTML = `<div class="overlay draft-ov shop-ov"><div class="draft tableau shop">
      <header class="shop-head">
        <div class="shop-title">
          <div class="kind">Turn ${s.round} · Shop</div>
          <h2>Stock up</h2>
          <p class="shop-goal" ${tutorial.active ? 'hidden' : ''}>${glyph('target')} Next turn: <b>${esc(goal.title)}</b>. ${needs.length ? `You still need ${needs.join(' and ')}.` : 'Your hand covers it.'}</p>
          <p>${note}</p>
        </div>
        <div class="shop-meter m-nerve ${h.nerve <= 0 ? 'empty' : ''}"><span class="ml">${sym('nerve', { big: true })} Nerve to spend</span><span class="mv">${h.nerve}</span><span class="ms">resets to ${resetTo} next turn</span></div>
        <div class="shop-meter m-hand ${full ? 'full' : ''}"><span class="ml">Cards in hand</span><span class="mv">${h.hand.length}<small>/${HAND_LIMIT}</small></span><span class="ms">${full ? 'hand full' : `room for ${HAND_LIMIT - h.hand.length} more`}</span></div>
      </header>
      <div class="shop-body" data-scroll="shop">${shelves}</div>
      <footer class="shop-foot">${moveWarn}
        <div class="shop-hand"><span class="sh-l">Your hand</span>${handChips || '<i class="chip-c">empty</i>'}</div>
        <div class="row-btns"><button class="btn" data-go="undo" ${canUndo() ? '' : 'disabled'} title="Undo your last buy (Z)">${glyph('undo')} Undo</button><button class="btn" data-go="hint" title="What should I buy? (H)">${glyph('bulb')} Hint</button><button class="btn" data-go="hidePlan">Peek at the board <small>(B)</small></button><button class="btn primary" data-act="endPlanning">Done: {his} turn <small>(E)</small></button></div>
      </footer>
    </div></div>`;
    const body = root.querySelector<HTMLElement>('.shop-body');
    if (body) body.scrollTop = keep;
    return;
  }
  if (s.phase === 'upkeep' && upkeepHidden !== s.round) {
    // Collapse repeats ("He heals 1." ×3) so a long late-game turn stays readable.
    const counts = new Map<string, { n: number; tone?: string }>();
    for (const l of s.log.slice(killerLogStart)) {
      if (/^.+'s turn\.$/.test(l.text)) continue;
      const e = counts.get(l.text);
      if (e) e.n++;
      else counts.set(l.text, { n: 1, tone: l.tone });
    }
    const lines = [...counts].map(([t, e]) => `<li class="${e.tone ?? ''} ${/^(TERROR|FINALE|POWER|EVENT)/.test(t) ? 'big' : ''}">${esc(t)}${e.n > 1 ? ` <b class="x">×${e.n}</b>` : ''}</li>`).join('');
    const chips: string[] = [];
    if (turnStart) {
      const dh = totalHealth(s) - turnStart.health;
      if (dh < 0) chips.push(`<span class="chip-s bad">−${-dh} health</span>`);
      const dk = s.slain - turnStart.slain;
      if (dk > 0) chips.push(`<span class="chip-s bad">${dk} survivor${dk > 1 ? 's' : ''} killed</span>`);
      const db = s.killer.bloodlust - turnStart.bloodlust;
      if (db > 0) chips.push(`<span class="chip-s warn">bloodlust +${db}</span>`);
      const dkh = s.killer.health - turnStart.killerHealth;
      if (dkh > 0) chips.push(`<span class="chip-s warn">{he} healed ${dkh}</span>`);
      const dm = s.minions.length - turnStart.minions;
      if (dm > 0) chips.push(`<span class="chip-s warn">+${dm} ${esc(dm > 1 ? c.killer.minions?.plural ?? 'minions' : (c.killer.minions?.name ?? 'minion').replace(/^(A|An) /, ''))}</span>`);
      if (s.killer.finale && !turnStart.finale) chips.push('<span class="chip-s bad">the Finale begins</span>');
      if (!chips.length) chips.push('<span class="chip-s good">you came through untouched</span>');
    }
    if (s.lastTerror && s.log.slice(killerLogStart).some((l) => l.text.startsWith('TERROR'))) chips.push(`<span class="chip-s">Terror: ${esc(terrorDef(c, s.lastTerror).name)}</span>`);
    // One plain line first: what that turn meant for her. Details below for whoever wants them.
    const headline = (() => {
      if (!turnStart) return '';
      const hurt = turnStart.health - totalHealth(s);
      const dead = s.slain - turnStart.slain;
      const parts: string[] = [];
      if (dead > 0) parts.push(`{He} killed ${dead > 1 ? `${dead} survivors` : 'a survivor'}.`);
      if (hurt > 0) parts.push(`{He} hurt you: −${hurt} health.`);
      if (s.killer.finale && !turnStart.finale) parts.push('The Finale begins: {he} hunts only you now.');
      if (!parts.length) parts.push(s.killer.loc === s.heroine.loc ? 'You’re safe, but {he}’s right next to you.' : 'You’re safe this turn.');
      return parts.join(' ');
    })();
    root.innerHTML = `<div class="overlay"><div class="killerturn">
      <h2>${esc(c.killer.name)}</h2>
      ${headline ? `<p class="kt-head">${headline}</p>` : ''}
      <div class="kt-sum">${chips.join('')}</div>
      <ul class="kt-log">${lines || '<li>{He} waits in the dark.</li>'}</ul>
      <p class="dim">Turn end: you may move items between your hands and backpack now.</p>
      <div class="row-btns"><button class="btn" data-go="hideUpkeep">Rearrange items</button><button class="btn primary" data-act="endUpkeep">Next turn <small>(space)</small></button></div>
    </div></div>`;
    return;
  }
  if (s.phase === 'over') {
    const r = rating(s);
    const win = s.outcome === 'slain';
    const title = win ? 'THE END' : 'CUT TO BLACK';
    const sub = win ? `${c.heroine.name} stands over what is left of ${c.killer.name}.` : `${c.heroine.name} does not make it to the credits.`;
    const lore = c.killer.items.filter((i) => s.foundLore.includes(i.id));
    // On a loss: the last blows, and one thing to try next time.
    const why = win
      ? ''
      : (() => {
          const lines = s.log
            .filter((l) => l.round >= s.round - 1 && (l.tone === 'killer' || l.tone === 'bad') && !/'s turn\.$/.test(l.text))
            .slice(-5)
            .map((l) => `<li><span class="r">T${l.round}</span> ${esc(l.text)}</li>`)
            .join('');
          const hasReaction = h.hand.some((x) => actionDef(c, x.id).kind === 'reaction');
          const tip =
            h.horror >= 4
              ? 'High horror means fewer dice on every roll. Buy from the <b>Recover</b> shelf (Steady Yourself, Deep Breath) to calm down.'
              : !hasReaction
                ? 'Keep a <b>Defend</b> card (Duck, Brace, Dodge) in hand: it blocks {his} attack during {his} turn.'
                : s.killer.bloodlust >= 4
                  ? 'Every survivor {he} kills raises {his} <b>bloodlust</b>, and {he} hits harder. Get them out before {he} reaches them.'
                  : 'When your health is low, stay out of {his} reach: the killer panel shows where {he} goes next.';
          return `<div class="end-why"><h4>What happened</h4><ul>${lines}</ul><p class="tip">${glyph('bulb')} ${tip}</p></div>`;
        })();
    root.innerHTML = `<div class="overlay"><div class="modal ending ${win ? 'win' : 'lose'}">
      <div class="end-poster">${comboPoster(c.location.id, c.killer.id)}</div>
      <div class="end-body">
        <div class="end-kicker">${win ? `You win: ${esc(c.killer.name)} is dead` : 'You died'}</div>
        <h2>${title}</h2>
        <p>${esc(sub)}</p>
        <div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
        <p><i>${esc(r.blurb)}</i></p>
        ${why}
        <table><tr><td>Survivors saved</td><td>${s.saved}</td></tr><tr><td>Survivors slain</td><td>${s.slain}</td></tr><tr><td>Turns</td><td>${s.round}</td></tr><tr><td>Reached the Finale</td><td>${s.killer.finale ? 'yes' : 'no'}</td></tr><tr><td>Score</td><td>${score(s)}</td></tr></table>
        ${lore.length ? `<div class="lore-list">${lore.map((l) => `<p><b>${esc(l.name)}.</b> ${esc(l.lore ?? '')}</p>`).join('')}</div>` : ''}
      </div>
      <div class="end-btns">
        <button class="btn primary" data-go="again">Play Again</button>
        <button class="btn" data-go="heroine">Other Heroine</button>
        <button class="btn" data-go="quit">Menu</button>
      </div>
    </div></div>`;
    return;
  }
  root.innerHTML = '';
}

// ── Dispatch + FX ───────────────────────────────────────────────────────────
function act(a: Action) {
  if (!game || !content || overlayLocked) return;
  clearCoach();
  if (a.type === 'endAction' && game.heroine.nerve > 0 && !confirmEnd()) return;
  if (a.type === 'endAction') document.querySelector('.toast')?.remove();
  if (a.type === 'endPlanning') {
    killerLogStart = game.log.length;
    turnStart = { health: totalHealth(game), slain: game.slain, saved: game.saved, bloodlust: game.killer.bloodlust, killerHealth: game.killer.health, finale: game.killer.finale, minions: game.minions.length };
  }
  const prev = game;
  const next = dispatch(content, game, a);
  if (next === game) return;
  game = next;
  if (a.type !== 'convert') {
    convertDie = null;
    convertPick = [];
  }
  if (a.type === 'keep') searchPicks = [];
  if (game.pending?.kind !== 'aim') {
    aimMode = 'choose';
    splitDraft = {};
  }
  // Show the item she just picked up.
  const had = new Set([...prev.heroine.items, ...prev.heroine.pack].map((x) => x.uid));
  const gained = [...game.heroine.items, ...game.heroine.pack].filter((x) => !had.has(x.uid));
  if (gained.length) {
    selItem = gained[gained.length - 1].uid;
    // On a phone the inventory is folded away: open it on the new find.
    if (phoneLayout.matches && !tutorial.active) itemsOpen = true; // the tutorial says what she found; keep the hand in view
    setTimeout(revealItemDetail, 50);
  }
  else if (selItem !== null && ![...game.heroine.items, ...game.heroine.pack].some((x) => x.uid === selItem)) selItem = null;
  swapFor = null;
  // Snapshot before each card or buy. Steps of a decision already under way (moving, choosing)
  // keep the snapshot from before the card, so a finished Walk can still be undone.
  const samePhase = (prev.phase === 'action' || prev.phase === 'planning') && prev.phase === game.phase;
  if (!samePhase) history = [];
  else if (!prev.pending) history.push(prev);
  if (a.type === 'step') inspectNode(null); // she moved: the card about where she was is stale
  if (a.type === 'step' && prev.heroine.loc !== game.heroine.loc) {
    const left = npcAt(game, prev.heroine.loc);
    const came = followPlan(content, prev, prev.heroine.loc, game.heroine.loc).count;
    if (left && came > 0) showTip('leftbehind', `${left} survivor${left > 1 ? 's' : ''} stayed at ${esc(nodeName(content, prev.heroine.loc))}: you can lead only ${escortCap(content)} at a time. Come back for them.`);
  }
  persist();
  runFx(game);
  updateGame();
  if (a.type === 'resolveRoll' && prev.rolling) showRollResult(actionDef(content, prev.rolling.card), prev.rolling.dice.filter((v) => v >= 5).length + prev.rolling.converted.length);
  else if (game.lastRoll && game.lastRoll.id !== prev.lastRoll?.id && game.pending?.kind !== 'roll') {
    // A roll with nothing to decide resolves on the spot, with no tray: still say how it went.
    const card = content.actions.find((d) => d.name === game!.lastRoll!.label);
    if (card) showRollResult(card, game.lastRoll.successes);
  }
  contextualTips();
}

/**
 * After "Keep it": one line saying how the roll went and what it did, so a
 * miss never looks like nothing happened. Fades on its own; never blocks.
 */
function showRollResult(d: ActionCardDef, hits: number) {
  const { band, html } = rollOutcome(d, hits);
  const mark = band === 'great' ? '✓' : band === 'good' ? '◐' : '✗';
  document.querySelector('.roll-result')?.remove();
  const el = document.createElement('div');
  el.className = `roll-result b-${band}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<i>${mark}</i><b>${esc(d.name)}</b><span>${html}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

/** "no hits → horror +1 · you don't move": how a roll on this card went, in plain words. */
function rollOutcome(d: ActionCardDef, hits: number): { band: 'great' | 'good' | 'fail'; html: string } {
  const band = hits >= 2 ? 'great' : hits === 1 ? 'good' : 'fail';
  const effs = d[band] ?? [];
  const has = (b: Effect[] | undefined, op: Effect['op']) => (b ?? []).some((e) => e.op === op);
  // What the better row would have done and this one doesn't.
  const missed: string[] = [];
  if (band !== 'great') {
    if (has(d.great, 'move') && !has(effs, 'move')) missed.push('you don’t move');
    if (has(d.great, 'search') && !has(effs, 'search')) missed.push('you find nothing');
    if (has(d.great, 'damage') && !has(effs, 'damage')) missed.push('no damage');
    if (has(d.great, 'block') && !has(effs, 'block')) missed.push('no block');
  }
  const did = effs.length ? fxHtml(describeEffects(effs)) : '';
  const what = [did, ...missed].filter(Boolean).join(' · ') || 'nothing happens';
  const hitTxt = hits === 0 ? 'no hits' : `${hits} hit${hits > 1 ? 's' : ''}`;
  return { band, html: `${hitTxt} → ${what}` };
}

let endWarned = -1;
function confirmEnd(): boolean {
  // Only a nudge when a card could still be played; never during the guided night (it just asked for this).
  if (endWarned === game!.round || tutorial.active) return true;
  // Show me / Hint would say end here too: don't second-guess it.
  if (advise(content!, game!).action.type === 'endAction') return true;
  const playable = game!.heroine.hand.some((x) => check(content!, game!, { type: 'playCard', uid: x.uid }).ok);
  if (!playable) return true;
  endWarned = game!.round;
  toast(`You could still play a card. Unspent nerve (${game!.heroine.nerve}) carries into the Shop for buying. Press End Action again to move on.`);
  return false;
}

function readyItem(uid: number) {
  if (!game || !content) return;
  const c = content;
  const h = game.heroine;
  const it = h.pack.find((x) => x.uid === uid);
  if (!it) return;
  const need = itemDef(c, it.id).hands;
  const free = handSlots(c) - handsUsed(c, h.items);
  if (free >= need) return act({ type: 'ready', uid });
  if (need === 2 || h.items.length === 1) return act({ type: 'ready', uid, swapOut: h.items.map((x) => x.uid) });
  swapFor = uid;
  updateOverlay();
}

/** The symbol for each location rule and killer mechanic (map key, intro). */
const RULE_GLYPH: Record<string, string> = { cold: 'snow', tide: 'wave', calls: 'phone', intermission: 'reel', power: 'bulb', campfire: 'fire', shutters: 'lock', bus: 'bus', dj: 'music', corn: 'corn' };
const GIMMICK_GLYPH: Record<string, string> = { traps: 'trap', pose: 'mannequin', captives: 'lock', fear: 'eye', stalk: 'corn' };

function showMapKey() {
  const c = content;
  const ruleTxt = c ? `<tr><td>${glyph(RULE_GLYPH[c.location.rule.kind] ?? 'reel')}</td><td><b>${esc(c.location.rule.name)}</b>: ${esc(c.location.rule.text)}</td></tr>` : '';
  const g = c?.killer.gimmick;
  const gTxt = g ? `<tr><td>${glyph(GIMMICK_GLYPH[g.kind])}</td><td><b>${esc(g.name)}</b> (${esc(c!.killer.name)}): ${esc(g.text)}</td></tr>` : '';
  modal(`<h2>Map key</h2><table class="keytable">
    <tr><td><span class="kpin you"></span></td><td><b>You</b>: the white pin with your name.</td></tr>
    <tr><td><span class="kpin him"></span></td><td><b>The killer</b>: the red pin. A red dashed line means {he} is <b>one step away</b>.</td></tr>
    <tr><td>${glyph('person')}</td><td><b>Survivors</b>: when you move, up to ${c ? escortCap(c) : 2} come with you (never into {his} location): the green tag under you counts them. Get them to an exit.</td></tr>
    <tr><td><span class="badge exitb">EXIT</span></td><td><b>Exit</b> (green ring): survivors here with you are rescued, and each one fills a rescue slot.</td></tr>
    <tr><td><span class="badge search">${glyph('search')}4</span></td><td><b>Item pile</b>: search cards draw from it. Hover to see the top card when it is face up.</td></tr>
    <tr><td><span class="badge barr">${glyph('barricade')}2</span></td><td><b>Barricade</b>: each point costs {him} 1 movement.</td></tr>
    <tr><td><span class="named">${victimIcon()}<i>Name</i></span></td><td><b>Named survivor</b>: follows the survivor rules with one exception (hover to read it). Rescuing them pays an extra reward; losing them costs you.</td></tr>
    <tr><td><span class="minion">☠</span></td><td><b>Minions</b>: some killers bring help. They have their own health, move and attack. Survivors will follow you into their location, just not into {his}.</td></tr>
    <tr><td><span class="kring lair"></span></td><td><b>Red ring</b>: {his} lair.</td></tr>
    <tr><td><span class="kring reach"></span></td><td><b>Glowing gold</b>: where you can step while a move card is resolving.</td></tr>
    ${ruleTxt}
    ${gTxt}
  </table><p>Hover over (or tap) any location to see its panic table and everything else about it.</p>`);
}

function inspectNode(id: string | null) {
  const el = document.getElementById('inspect');
  if (!el || !game || !content) return;
  if (!id) {
    el.hidden = true;
    return;
  }
  const s = game;
  const c = content;
  const n = c.location.nodes.find((x) => x.id === id)!;
  const v = s.victims[id] ?? 0;
  const lines: string[] = [];
  if (id === s.heroine.loc) lines.push('<b>You are here.</b>');
  if (id === s.killer.loc && killerSeen(c, s)) lines.push(`<b class="bad">${esc(c.killer.name)} is here.</b>`);
  else if (!killerSeen(c, s) && id === s.env.seen) lines.push(`<b class="bad">You last saw ${esc(c.killer.name)} here.</b> {He} could be anywhere in the corn by now.`);
  if (n.exit && exitOpen(c, s, id)) lines.push('<b class="good">Exit</b>: survivors here with you are rescued.');
  else if (n.exit) lines.push('<b>Bus stop</b>: an exit only while the bus waits (every 3rd turn). Survivors waiting here get on with or without you.');
  if (id === c.location.lair) lines.push('<b>{His} lair.</b>');
  if (v) lines.push(`${v} survivor${v > 1 ? 's' : ''}.`);
  if (id === s.heroine.loc && npcAt(s, id)) {
    const f = followPlan(c, s, id, '').count;
    lines.push(`<b class="good">${f} of ${npcAt(s, id)} follow you</b> when you move (you can lead ${escortCap(c)}).`);
  }
  for (const x of specialsAt(s, id)) lines.push(`<b>${esc(specialDef(c, x.id).name)}</b>: ${esc(specialDef(c, x.id).text)}`);
  const mins = minionsAt(s, id);
  if (mins.length) lines.push(`<b class="bad">${mins.length} ${esc(mins.length > 1 ? c.killer.minions!.plural : c.killer.minions!.name)}</b> (health ${mins.map((x) => x.health).join(', ')}).`);
  const pile = s.piles[id];
  if (pile) lines.push(`Item pile: ${pile.cards.length} left${pile.up && pile.cards.length ? `, top card <b>${esc(itemDef(c, pile.cards[0]).name)}</b>` : pile.cards.length ? ' (top face down)' : ''}.`);
  if ((s.barricades[id] ?? 0) > 0) lines.push(`Barricaded (${s.barricades[id]}).`);
  if (n.tags?.includes('outdoor') && c.location.rule.kind === 'cold') lines.push('Outdoors: ending your turn here adds cold.');
  if (n.tags?.includes('warm')) lines.push('Warm: ending your turn here thaws you.');
  if (n.tags?.includes('shore')) lines.push(isFlooded(c, s, id) ? 'Flooded: +1 nerve to enter.' : 'Shore: floods at high tide.');
  if (n.tags?.includes('phone')) lines.push(s.env.ringing === id ? '<b class="bad">The phone is ringing.</b>' : 'Has a phone.');
  if (n.tags?.includes('fire')) lines.push(haven(c, s, id) ? `<b class="good">Campfire</b> (fuel ${s.env.fuel}/3): no enemy can come in while it burns. Stoke it here (1 nerve).` : 'The campfire is out: no shelter.');
  if (n.tags?.includes('switch')) lines.push('<b>Shutter override</b>: swap the shutters from here (1 nerve).');
  if (n.tags?.includes('booth')) lines.push(`<b>DJ Booth</b>: skip the song from here (1 nerve). Now playing: ${esc(SONGS[song(c, s) ?? 0].name)}.`);
  if (n.tags?.includes('corn')) lines.push('<b>Corn</b>: {he} can’t be seen here from more than 1 step away. Hide rolls +1 die.');
  if (n.tags?.includes('lookout')) lines.push('<b>Look-out</b>: climb up to see {him} until the turn ends (free).');
  if (s.traps?.includes(id)) lines.push('<b class="bad">A steel trap</b>: step in and lose 1 health, and your move ends here.');
  if (s.killer.posed === id) lines.push('<b class="bad">{His} mannequin</b>: {he} strikes here next turn. A barricade here keeps {him} out.');
  if (id === c.location.lair && s.captives?.length) lines.push(`<b class="bad">${s.captives.length} held captive</b>. Reach this place to cut them loose.`);
  const shut = neighbors(c, id).filter((x) => gateDown(c, s, id, x));
  if (shut.length) lines.push(`Shutter down toward ${shut.map((x) => esc(nodeName(c, x))).join(', ')}.`);
  const t = panicTable(c, id);
  lines.push(`<span class="dim">Panic (d6): ${t.map((x, i) => `${i + 1}${x ? `→${esc(nodeName(c, x))}` : ' freeze'}`).join(' · ')}</span>`);
  if (s.pending?.kind === 'move' && walkNeighbors(c, s, s.heroine.loc).includes(id)) {
    const f = followers(c, s, s.heroine.loc, id);
    lines.push(`Step here${f ? ` with ${f} survivor${f > 1 ? 's' : ''}` : ''}${isFlooded(c, s, id) ? ' (+1 nerve)' : ''}.`);
  }
  el.innerHTML = `<h5>${esc(n.name)}</h5><p class="fl">${esc(n.flavor)}</p>${lines.map((l) => `<p>${l}</p>`).join('')}`;
  el.hidden = false;
  el.dataset.at = id;
  const left = n.x / 10;
  const top = n.y / 6.4;
  el.style.left = left > 60 ? '' : `calc(${left}% + 6%)`;
  el.style.right = left > 60 ? `calc(${100 - left}% + 6%)` : '';
  el.style.top = `${Math.min(top, 62)}%`;
}

/** The goal banner on the map: what she's after right now, and a way to be shown. */
function goalBar(g: Goal): string {
  return `<span class="gb-k">${glyph('target')} Goal</span><b class="gb-t">${esc(g.title)}</b><span class="gb-d">${esc(g.detail)}</span><button class="btn tiny gb-show" data-go="hint" title="${esc(g.why ?? 'Show me the next move')} (H)">Show me</button>`;
}

// ── Coach pointer: Hint / Show me rings the thing to click and says why ──
let coach: { sel: string; why: string; until: number } | null = null;
function showHint() {
  if (!game || !content || game.outcome) return;
  if (game.phase !== 'action' && game.phase !== 'planning' && !game.pending) return;
  const { action, why } = advise(content, game);
  if (!why) return;
  const sel = adviceTarget(action);
  if (!sel || !document.querySelector(sel)) {
    clearCoach();
    return toast(`${glyph('bulb', 'tip')} ${why}`, 6000);
  }
  document.querySelector('.toast')?.remove();
  const mine = { sel, why, until: performance.now() + 7000 };
  coach = mine;
  const el = document.querySelector<HTMLElement>(sel)!;
  if (!clearOfBar(el)) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  // One loop per Show me: it stops when this pointer expires or a newer one replaces it.
  const tick = () => {
    if (coach === mine && placeCoach()) requestAnimationFrame(tick);
  };
  tick();
}
/** Keep the ring on its target while it moves or re-renders; false once it has expired. */
function placeCoach(): boolean {
  let ring = document.getElementById('coach-ring');
  if (!coach || performance.now() > coach.until) {
    clearCoach();
    return false;
  }
  const el = document.querySelector<HTMLElement>(coach.sel);
  // The target can vanish for a frame during a re-render: hide the ring and keep waiting.
  if (!el || !el.getClientRects().length) {
    ring?.remove();
    return true;
  }
  if (!ring) {
    ring = document.createElement('div');
    ring.id = 'coach-ring';
    ring.innerHTML = `<span class="cr-tip">${glyph('bulb')}<span>${coach.why}</span></span>`;
    document.body.appendChild(ring);
  }
  const r = el.getBoundingClientRect();
  ring.style.cssText = `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
  // The callout sits above the target (below if there's no room), kept on screen.
  const tip = ring.querySelector<HTMLElement>('.cr-tip')!;
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const above = r.top - 6 - th - 10 > 8;
  const x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2));
  tip.style.left = `${x - (r.left - 6)}px`;
  tip.style.top = above ? `${-th - 10}px` : `${r.height + 12 + 10}px`;
  return true;
}
function clearCoach() {
  coach = null;
  document.getElementById('coach-ring')?.remove();
}

function canUndo(): boolean {
  if (!game || !history.length || (game.phase !== 'action' && game.phase !== 'planning') || game.pending) return false;
  const prev = history[history.length - 1];
  // Only undo deterministic actions: no dice, no cards drawn.
  return prev.rng === game.rng && prev.spare.length === game.spare.length && JSON.stringify(prev.piles) === JSON.stringify(game.piles);
}

function undo() {
  if (!canUndo()) return;
  game = history.pop()!;
  game.fx = [];
  persist();
  audio.play('click');
  updateGame();
}

function runFx(s: GameState) {
  const c = content!;
  let diceShown = false;
  for (const f of s.fx) {
    switch (f.t) {
      case 'terror':
        cardQueue.push({ kind: 'terror', id: f.id });
        audio.play('card');
        break;
      case 'event':
        cardQueue.push({ kind: 'event', id: f.id });
        audio.play('card');
        break;
      case 'power':
        cardQueue.push({ kind: 'power' });
        audio.play('killer');
        flash(false);
        break;
      case 'env':
        audio.play(/High Tide/i.test(f.text) ? 'tide' : /Blackout|Fire out|Shutters/i.test(f.text) ? 'blackout' : /ringing|Bus/i.test(f.text) ? 'ring' : /Trap|Taken|Posed/i.test(f.text) ? 'killer' : /freed|stoked/i.test(f.text) ? 'saved' : 'card');
        toast(`<b>${esc(c.location.rule.name)}</b>: ${esc(f.text)}`, 3500);
        break;
      case 'revive':
        audio.play('finale');
        flash(true);
        shake();
        banner(f.who === 'killer' ? c.killer.revive.name.toUpperCase() : 'NOT YET');
        break;
      case 'bloodlust':
        audio.play('killer');
        break;
      case 'unlock':
        toast(`<b>${esc(c.heroine.ability.name)}</b> unlocked. Use it once per turn.`, 5000);
        break;
      case 'damage':
        showTally(f.parts, f.light);
        break;
      case 'dice':
        if (!diceShown && s.lastRoll && s.pending?.kind !== 'roll') {
          diceShown = true;
          showDice(s);
        } else audio.play('dice');
        break;
      case 'card':
        audio.play('card');
        break;
      case 'move':
        audio.play('move');
        break;
      case 'item':
        audio.play('item');
        break;
      case 'killerAppears':
        audio.play('killer');
        lastQuote = c.killer.quotes[Math.floor(Math.random() * c.killer.quotes.length)];
        flash(false);
        break;
      case 'wound':
        audio.play('wound');
        flash(false);
        shake();
        break;
      case 'hit':
        audio.play('hit');
        shake();
        break;
      case 'victimSlain':
        audio.play('slain');
        flash(false);
        break;
      case 'saved':
        audio.play('saved');
        break;
      case 'hide':
        audio.play('hide');
        break;
      case 'minion':
        audio.play('killer');
        break;
      case 'stun':
        audio.play('stun');
        break;
      case 'finale':
        cardQueue.push({ kind: 'finale' });
        audio.play('finale');
        flash(true);
        banner(c.killer.finale.name.toUpperCase());
        break;
      case 'win':
        audio.play('win');
        break;
      case 'lose':
        audio.play('lose');
        break;
    }
  }
}

function showDice(s: GameState) {
  const r = s.lastRoll!;
  const card = content?.actions.find((d) => d.name === r.label);
  const outcome = card ? rollOutcome(card, r.successes) : null;
  audio.play('dice');
  overlayLocked = true;
  const el = document.createElement('div');
  el.className = 'dicetray';
  el.innerHTML = `<h5>${esc(r.label)} · 5–6 hit · 3–4 almost${r.rerolled ? ' · rerolled' : ''}</h5>${r.parts ? `<div class="why">${esc(diceWhy(r.parts))}</div>` : ''}
    <div class="dice">${r.dice.map((d, i) => `<div class="die ${d >= 5 || r.converted.includes(i) ? 'hit' : d >= 3 ? 'part' : 'miss'}" style="animation-delay:${i * 0.08}s">${pip(d)}</div>`).join('')}</div>
    <div class="res">${r.successes} success${r.successes === 1 ? '' : 'es'}${r.parts ? ` <span class="row-hit b-${r.successes >= 2 ? 'great' : r.successes === 1 ? 'good' : 'fail'}">→ ${r.successes >= 2 ? 'best row (2+)' : r.successes === 1 ? 'middle row (1)' : 'fail row (✗)'}</span>` : ''}${outcome ? `<div class="res-what b-${outcome.band}">${outcome.html}</div>` : ''}<small>click to continue</small></div>`;
  // A transparent catcher under the tray swallows clicks, so a click meant to
  // dismiss it never lands on the map or a card behind it.
  const catcher = document.createElement('div');
  catcher.className = 'dice-catch';
  catcher.appendChild(el);
  document.body.appendChild(catcher);
  const done = () => {
    if (!catcher.isConnected) return;
    catcher.remove();
    guardClicks();
    overlayLocked = false;
    updateOverlay();
    if (game) syncTeach(game);
  };
  catcher.addEventListener('click', done);
  setTimeout(done, 1500 + r.dice.length * 80);
}

/** A short-lived tally beside his health: how her hit added up. */
function showTally(parts: [string, number][], light: boolean) {
  document.querySelector('.dmg-tally')?.remove();
  const total = parts.reduce((n, [, v]) => n + v, 0);
  const el = document.createElement('div');
  el.className = 'dmg-tally';
  el.innerHTML = `<b>${total} damage</b><span>${
    light
      ? `${esc(parts[0][0])} is light: weapon, lore and Psych Up don't add`
      : parts.map(([l, v], i) => `${i ? '<i>+</i>' : ''}${esc(l)} <em>${v}</em>`).join(' ')
  }</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5200);
}

function flash(white: boolean) {
  const f = document.getElementById('flash')!;
  f.className = '';
  void f.offsetWidth;
  f.className = `on ${white ? 'white' : ''}`;
}
function shake() {
  const g = document.getElementById('game');
  if (!g) return;
  g.classList.remove('shake');
  void g.offsetWidth;
  g.classList.add('shake');
}
function banner(text: string) {
  const b = document.createElement('div');
  b.className = 'banner';
  b.textContent = text;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 2300);
}

let toastTimer = 0;
/** Briefly ignore clicks after something under the pointer vanishes, so a click aimed at it can't fall through. */
let clickGuardUntil = 0;
function guardClicks(ms = 350) {
  clickGuardUntil = performance.now() + ms;
}
function toast(html: string, ms = 5000) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${html}</span><button class="btn small">OK</button>`;
  t.querySelector('button')!.addEventListener('click', () => t.remove());
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (t.matches(':hover')) guardClicks();
    t.remove();
  }, ms);
}

function showTip(id: string, html: string) {
  if (tutorial.active || lessons.active) return;
  if (!prefs.tips || seenTips.has(id)) return;
  seenTips.add(id);
  store(TIPS_KEY, [...seenTips]);
  setTimeout(() => tipNote(html), 600);
}

/**
 * A tip that never gets in the way: clicks pass straight through it, it sits
 * clear of the hand and the shop's buttons, and it fades on its own (× to
 * dismiss sooner). Only one at a time.
 */
function tipNote(html: string, ms = 10000) {
  document.querySelector('.tip-note')?.remove();
  const el = document.createElement('div');
  el.className = 'tip-note';
  el.setAttribute('role', 'status');
  el.innerHTML = `${glyph('bulb', 'tip')}<span>${html}</span><button class="tn-x" aria-label="Dismiss tip">×</button>`;
  el.querySelector('button')!.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('fading'), ms - 600);
  setTimeout(() => el.remove(), ms);
}

function contextualTips() {
  const s = game!;
  const c = content!;
  if (s.pending?.kind === 'roll') showTip('partial', 'A <b>3 or 4</b> is <b>almost</b> a hit. When the better result matters, spend 2 cards to make one count (once per roll).');
  else if (s.phase !== 'action') return;
  // The bigger moments (his attack, the Shop, survivors, the fight) are lessons; tips cover the small print.
  else if ((s.victims[s.heroine.loc] ?? 0) > escortCap(c) && !isExit(c, s.heroine.loc)) showTip('escortcap', `Only ${escortCap(c)} survivors can follow you at once, and never into {his} location. Come back for the rest.`);
  else if (s.killer.loc === s.heroine.loc && s.victims[s.heroine.loc]) showTip('killer', 'When {he} attacks here, <b>survivors die first</b>. Get them away from {him}.');
  else if (s.minions.some((x) => x.loc === s.heroine.loc)) showTip('minions', `${esc(c.killer.minions?.plural ?? 'Minions')} are here. Attack cards can hit them (damage is split between them). If {he} is here too, you choose: {him} or them.`);
  else if (s.specials.length) showTip('named', 'A <b>named survivor</b> is on the board. They follow the normal rules with one exception (hover them on the map), and pay an extra reward when rescued.');
  else if (s.killer.bloodlust >= 2) showTip('bloodlust', 'Every death feeds {his} <b>bloodlust</b>, which sets how far {he} moves and how hard {he} hits.');
}

function setMood(horror: number, finale: boolean, near: boolean) {
  document.documentElement.style.setProperty('--horror', String(Math.min(1, horror / 6 + (finale ? 0.25 : 0))));
  document.body.classList.toggle('pulse', horror >= 3 || near || finale);
  setGrainIntensity(prefs.grain * (0.7 + horror / 10 + (finale ? 0.3 : 0)));
  audio.setMood({ horror, finale, killerNear: near });
}

// ── Modals ──────────────────────────────────────────────────────────────────
function modal(html: string) {
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="modal">${html}<div style="text-align:right;margin-top:16px"><button class="btn" data-close>Close</button></div></div>`;
  o.addEventListener('click', (e) => {
    if (e.target === o || (e.target as HTMLElement).closest('[data-close]')) o.remove();
    const go = (e.target as HTMLElement).closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go) {
      o.remove();
      navigate(go);
    }
  });
  document.body.appendChild(o);
  return o;
}

function showRules() {
  const dv = DIFFICULTY[game?.difficulty ?? difficulty];
  const t = dv.track;
  modal(`<h2>How to Play</h2>
  <p><button class="btn small primary" data-go="tutorial">▶ Play the guided first night</button></p>
  <p><b>Goal: kill the killer.</b> You win if {he} dies, you lose if you do, and if you both fall in the same moment, you win. There is no dawn: the night ends when one of you does.</p>
  <h3>A turn has five phases</h3>
  <p><b>1 · Action.</b> Play action cards from your hand, paying their nerve cost. You may also discard any card for +1 nerve. If nerve drops below zero, finish that card and your Action phase ends. Items and your ability can be used here too.<br>
  <b>2 · Planning (the Shop).</b> Spend leftover nerve in the <b>shop</b> (the face-up tableau of card piles), as many cards as you can afford (hand limit ${HAND_LIMIT}). Its shelves group cards by job: Free, Move, Fight, Search, Defend, Recover, Tricks. Only the three Free basics (Walk, Look Around, Duck) cost 0, and can be taken even at negative nerve. Peek at the board any time with <b>B</b>. <b>Cards you play don't come back to your hand</b>: they go back to their shop piles when Planning ends (so they can't be rebought this Planning). Buy what you'll need next turn, starting with a way to move. Nerve then resets to ${dv.nerve} (${esc(dv.label)}), plus any bonuses.<br>
  <b>3 · Killer ({his} turn).</b> {He} follows {his} <b>behavior</b> (pick a target, move, attack), then a <b>Terror</b> card is drawn.<br>
  <b>4 · Panic.</b> If anyone died this turn, survivors in {his} location roll a die and run along that location's panic table.<br>
  <b>5 · Upkeep (turn end).</b> The location's rule and ongoing Events resolve, and you may rearrange your items.</p>
  <h3>Horror Rolls</h3>
  <p>Most cards roll dice. Your <b>Horror Level</b> sets how many (${esc(dv.label)}, horror→dice: ${t.map((d, i) => `${i}→${d}`).join(', ')}). <b>5–6</b> is a success, <b>3–4</b> a partial ("almost"), <b>1–2</b> nothing. Once per roll, you may turn one partial into a success by discarding 2 cards. Then the card's matching row happens: <b>2+</b> means two or more successes, <b>1</b> exactly one, <b>✗</b> none. Failures can hurt.</p>
  <h3>The Terror clock and the Finale</h3>
  <p>The Terror deck holds ${TERROR_DEAL} cards. When it runs out, the <b>Finale</b> is revealed in Upkeep: {his} behavior changes, {his} power is revealed, and every Upkeep after that raises {his} bloodlust.</p>
  <h3>Bloodlust</h3>
  <p>{His} track sets {his} <b>move</b> and <b>attack</b>. Every survivor {he} kills adds 1, and so does horror pushed past the top of your track (at most once a turn). Some levels trigger effects, and at bloodlust ${content?.killer.bloodlust.revealAt ?? 4} {his} special power (with temporary health) is revealed.</p>
  <h3>Survivors</h3>
  <p>When you leave a location, up to 2 survivors there come with you, but they won't walk into {his} location. Anywhere you stand on an <b>exit</b> during your Action phase, survivors with you are rescued. Each rescue fills a <b>rescue slot</b> and pays its reward; fill them all to unlock your heroine's ability. When {he} attacks, survivors in {his} location are attacked <b>before you</b>.</p>
  <h3>Attacking, damage, and final health</h3>
  <p>Attack cards need {him} in your location, unless a weapon in hand reaches farther. If a <b>heavy</b> attack (Full Swing, Desperate Strike) deals at least 1, your best reaching weapon, each lore item you've found, and focus (Psych Up's “next hit +damage”) add damage. <b>Light</b> attacks (Shove, Swing) are flat. Both of you have a hidden <b>second-chance token</b> (final-health token, the ?): when health runs out it's revealed. A number means getting back up with that much health, and the current phase ends at once. A blank means death.</p>
  <h3>Named survivors and minions</h3>
  <p>Some survivors have names. They follow all the survivor rules except one printed exception (hover them on the map), come along before the crowd, and pay an extra reward when rescued, or cost you when they die. Some killers also bring <b>minions</b> with their own health, move and attack. If {he} and {his} minions are both in reach, an attack hits one or the other: {him} (weapon and lore add damage) or the minions (weapon adds damage, split between them, leftovers lost). Survivors will follow you into a room with minions, never into {his}.</p>
  <h3>Reactions</h3>
  <p>When {he} attacks <b>you</b>, you may play reaction cards against that one attack. They cost nerve from your next turn.</p>
  <h3>Items</h3>
  <p>Two hands: a two-handed item fills both. The backpack holds anything, but items needing hands don't work from it. You may rearrange only when you gain an item and during Upkeep. Search cards draw from the item pile at your location; whatever you don't keep goes back on top, face up.</p>
  <h3>Ties</h3>
  <p>If the rules leave a genuine tie (two equally close targets with as many survivors, two equally short routes, or a named survivor standing with the crowd when {he} strikes), the tie-break policy decides (Settings): <b>${esc(TIEBREAK[prefs.tiebreak].label)}</b>. ${esc(TIEBREAK[prefs.tiebreak].text)} The Script logs each tie-break.</p>
  <h3>This location: ${content ? esc(content.location.rule.name) : 'Location rules'}</h3><p>${content ? esc(content.location.rule.text) : 'Every location has one signature rule: Intermission (Drive-In), The Tide (Tide Cabins), Rolling Blackouts (Saint Agatha), Whiteout cold (Kettle Peak), Request Line phones (KXRL), and in Season 2 The Campfire, Security Shutters, The Last Bus, The DJ’s Set and The Corn.'}</p>
  ${content?.killer.gimmick ? `<h3>This killer: ${esc(content.killer.gimmick.name)}</h3><p>${esc(content.killer.gimmick.text)}</p>` : ''}
  <h3>Keys</h3><p>1–0 play cards · S stop moving · A answer the phone, or this location’s action · H hint · Z undo · E end phase · Space continue · R rules</p>`);
}

function showSettings() {
  const o = modal(`<h2>Settings</h2>
    <div class="row"><span>Sound</span><button class="btn small" id="s-sound">${prefs.sound ? 'On' : 'Off'}</button></div>
    <div class="row"><span>Master volume</span><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${prefs.volume}"></div>
    <div class="row"><span>Music &amp; ambience</span><input type="range" id="s-music" min="0" max="1" step="0.05" value="${prefs.music}"></div>
    <div class="row"><span>Film grain</span><input type="range" id="s-grain" min="0" max="1" step="0.05" value="${prefs.grain}"></div>
    <div class="row"><span>Tie-break policy (new games)</span><button class="btn small" id="s-tie" title="${esc(TIEBREAK[prefs.tiebreak].text)}">${esc(TIEBREAK[prefs.tiebreak].label)}</button></div>
    <div class="row"><span>Screen</span><button class="btn small" id="s-view" title="Simple: only what matters right now. Full: every detail.">${simpleView() ? 'Simple' : 'Full'}</button></div>
    <div class="row"><span>Tutorial tips</span><button class="btn small" id="s-tips">${prefs.tips ? 'On' : 'Off'}</button></div>
    <div class="row"><span>Reset tips</span><button class="btn small" id="s-reset">Reset</button></div>`);
  o.querySelector('#s-sound')!.addEventListener('click', (e) => {
    prefs.sound = !prefs.sound;
    audio.setEnabled(prefs.sound);
    (e.target as HTMLElement).textContent = prefs.sound ? 'On' : 'Off';
    savePrefs();
    if (screen === 'game') updateGame();
  });
  o.querySelector('#s-tie')!.addEventListener('click', (e) => {
    const order: TieBreak[] = ['adverse', 'plausible', 'comedic', 'random'];
    prefs.tiebreak = order[(order.indexOf(prefs.tiebreak) + 1) % order.length];
    (e.target as HTMLElement).textContent = TIEBREAK[prefs.tiebreak].label;
    (e.target as HTMLElement).title = TIEBREAK[prefs.tiebreak].text;
    savePrefs();
  });
  o.querySelector('#s-view')!.addEventListener('click', (e) => {
    prefs.view = simpleView() ? 'full' : 'simple';
    (e.target as HTMLElement).textContent = prefs.view === 'simple' ? 'Simple' : 'Full';
    savePrefs();
    if (game && screen === 'game') updateGame();
  });
  o.querySelector('#s-tips')!.addEventListener('click', (e) => {
    prefs.tips = !prefs.tips;
    (e.target as HTMLElement).textContent = prefs.tips ? 'On' : 'Off';
    savePrefs();
  });
  o.querySelector('#s-reset')!.addEventListener('click', () => {
    seenTips.clear();
    store(TIPS_KEY, []);
    seenLessons.clear();
    store(LESSONS_KEY, []);
  });
  o.querySelector<HTMLInputElement>('#s-vol')!.addEventListener('input', (e) => {
    prefs.volume = +(e.target as HTMLInputElement).value;
    audio.setVolume(prefs.volume);
    savePrefs();
  });
  o.querySelector<HTMLInputElement>('#s-music')!.addEventListener('input', (e) => {
    prefs.music = +(e.target as HTMLInputElement).value;
    audio.setMusicVolume(prefs.music);
    savePrefs();
  });
  o.querySelector<HTMLInputElement>('#s-grain')!.addEventListener('input', (e) => {
    prefs.grain = +(e.target as HTMLInputElement).value;
    setGrainIntensity(prefs.grain);
    savePrefs();
  });
}

// ── Input ───────────────────────────────────────────────────────────────────
/** Clicks inside the game screen or the overlay root. Returns true if handled. */
function handleGameClick(t: HTMLElement): boolean {
  if (!game) return false;
  const d = (attr: string) => t.closest<HTMLElement>(`[data-${attr}]`)?.dataset[attr.replace(/-([a-z])/g, (_, x) => x.toUpperCase())];
  const hs = d('hscroll');
  if (hs) {
    const row = document.querySelector<HTMLElement>('#bottombar .hand-row');
    row?.scrollBy({ left: +hs * row.clientWidth * 0.8, behavior: 'smooth' });
    return true;
  }
  const disc = d('discard');
  if (disc) return act({ type: 'discardForNerve', uid: +disc }), true;
  const node = d('node');
  if (node && touchOnly.matches && game.pending?.kind !== 'move') {
    // No hover on touch: a tap reads the location (tap again to close).
    const open = !document.getElementById('inspect')?.hidden && document.getElementById('inspect')?.dataset.at === node;
    inspectNode(open ? null : node);
    return true;
  }
  if (node) inspectNode(null);
  if (node && node !== game.heroine.loc) return act({ type: 'step', to: node }), true;
  if (node && game.pending?.kind === 'move') return act({ type: 'stopMove' }), true; // click yourself to stop
  const sel = d('sel');
  if (sel) {
    selItem = selItem === +sel ? null : +sel;
    updateGame();
    revealItemDetail();
    return true;
  }
  const follow = d('follow');
  if (follow) return act({ type: 'toggleFollow', id: follow }), true;
  const split = t.closest<HTMLElement>('[data-split]');
  if (split) {
    const uid = +split.dataset.split!;
    splitDraft = { ...splitDraft, [uid]: Math.max(0, (splitDraft[uid] ?? 0) + +split.dataset.d!) };
    updateOverlay();
    return true;
  }
  const bring = d('bring');
  if (bring !== undefined) return act({ type: 'setBring', n: +bring }), true;
  const a = d('act');
  if (a) return act({ type: a } as Action), true;
  const item = d('item');
  if (item) return act({ type: 'useItem', uid: +item }), true;
  const stowUid = d('stow');
  if (stowUid) return act({ type: 'stow', uid: +stowUid }), true;
  const readyUid = d('ready');
  if (readyUid) return readyItem(+readyUid), true;
  const swapBtn = t.closest<HTMLElement>('[data-swap]');
  if (swapBtn) return act({ type: 'ready', uid: +swapBtn.dataset.swap!, swapOut: [+swapBtn.dataset.out!] }), true;
  const aim = d('aim');
  if (aim) return act({ type: 'aim', at: aim as 'killer' | 'minions' }), true;
  const react = d('react');
  if (react) return act({ type: 'react', uid: +react }), true;
  const buy = d('buy');
  if (buy) return act({ type: 'buy', id: buy }), true;
  const die = d('die');
  if (die !== undefined) {
    convertDie = convertDie === +die ? null : +die;
    convertPick = convertDie === null ? [] : cheapest(content!, game, CONVERT_COST);
    updateOverlay();
    return true;
  }
  const cp = d('cpick');
  if (cp) {
    const uid = +cp;
    convertPick = convertPick.includes(uid) ? convertPick.filter((x) => x !== uid) : [...convertPick, uid].slice(-CONVERT_COST);
    updateOverlay();
    return true;
  }
  const sp = d('spick');
  if (sp !== undefined && game.pending?.kind === 'search') {
    const i = +sp;
    const keep = game.pending.keep;
    searchPicks = searchPicks.includes(i) ? searchPicks.filter((x) => x !== i) : [...searchPicks, i].slice(-keep);
    updateOverlay();
    return true;
  }
  const cardUid = d('card');
  if (cardUid) return act({ type: 'playCard', uid: +cardUid }), true;
  return false;
}

app.addEventListener('click', (e) => {
  if (performance.now() < clickGuardUntil) return;
  const t = e.target as HTMLElement;
  const goEl = t.closest<HTMLElement>('[data-go]');
  const go = goEl?.dataset.go;
  if (go) {
    audio.play('click');
    return navigate(go, goEl ?? undefined);
  }
  const f = t.closest<HTMLElement>('[data-feature]')?.dataset.feature;
  if (f) {
    feature = FEATURES.find((x) => x.id === f)!;
    pick = { location: feature.location, killer: feature.killer };
    revealLists = ['killers', 'locations'];
    audio.play('click');
    return render();
  }
  const kId = t.closest<HTMLElement>('[data-killer]')?.dataset.killer;
  if (kId) {
    pick.killer = kId;
    revealLists = ['reel'];
    audio.play('click');
    return render();
  }
  const lId = t.closest<HTMLElement>('[data-location]')?.dataset.location;
  if (lId) {
    pick.location = lId;
    revealLists = ['reel'];
    audio.play('click');
    return render();
  }
  const dId = t.closest<HTMLElement>('[data-difficulty]')?.dataset.difficulty as Difficulty | undefined;
  if (dId) {
    difficulty = dId;
    audio.play('click');
    return render();
  }
  const hId = t.closest<HTMLElement>('[data-heroine]')?.dataset.heroine;
  if (hId) {
    heroineId = hId;
    audio.play('click');
    return render();
  }
  handleGameClick(t);
});
// A mouse wheel scrolls the sideways lists (the feature reel, the phone roster) sideways.
app.addEventListener(
  'wheel',
  (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.reel, .roster, .builder-grid .cards, .hand-row');
    if (!el || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const sideways = el.scrollWidth > el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
    if (!sideways) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  },
  { passive: false },
);
document.body.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (app.contains(t) || !t.closest('#overlay-root')) return;
  const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
  if (go) return navigate(go);
  handleGameClick(t);
});

function navigate(go: string, el?: HTMLElement) {
  switch (go) {
    case 'rules':
      return showRules();
    case 'settings':
      return showSettings();
    case 'continue':
      return continueGame();
    case 'undo':
      return undo();
    case 'toggleItems':
      itemsOpen = !itemsOpen;
      if (game) updateGame();
      if (itemsOpen) revealItemDetail();
      return;
    case 'closeItems':
      itemsOpen = false;
      if (game) updateGame();
      return;
    case 'toggleView':
      prefs.view = simpleView() ? 'full' : 'simple';
      savePrefs();
      if (game) updateGame();
      return;
    case 'toggleLog':
      logOpen = !logOpen;
      if (game) updateGame();
      return;
    case 'toggleSide': {
      const side = el?.dataset.side === 'right' ? 'right' : 'left';
      sideOpen[side] = !sideOpen[side];
      document.querySelector(`.side.${side}`)?.classList.toggle('collapsed', !sideOpen[side]);
      if (game) updateGame();
      return;
    }
    case 'hidePlan':
      if (game) planHidden = game.round;
      return updateOverlay();
    case 'openPlan':
      planHidden = -1;
      return updateOverlay();
    case 'hideUpkeep':
      if (game) upkeepHidden = game.round;
      return updateOverlay();
    case 'cancelSwap':
      swapFor = null;
      return updateOverlay();
    case 'buyUp': {
      const r = game?.rolling;
      const i = r ? r.dice.findIndex((v, j) => v >= 3 && v <= 4 && !r.converted.includes(j)) : -1;
      if (!game || !content || i < 0) return;
      convertDie = i;
      convertPick = cheapest(content, game, CONVERT_COST);
      return updateOverlay();
    }
    case 'doConvert':
      if (convertDie !== null && convertPick.length === CONVERT_COST) act({ type: 'convert', die: convertDie, discard: [convertPick[0], convertPick[1]] });
      return;
    case 'aimMinions':
      aimMode = 'split';
      splitDraft = {};
      return updateOverlay();
    case 'aimBack':
      aimMode = 'choose';
      return updateOverlay();
    case 'aimSplit':
      return act({ type: 'aim', at: 'minions', split: { ...splitDraft } });
    case 'keepPicks':
      return act({ type: 'keep', picks: [...searchPicks] });
    case 'mapkey':
      return showMapKey();
    case 'hint':
      return showHint();
    case 'shuffle': {
      const prev = `${pick.killer}|${pick.location}`;
      for (let i = 0; i < 10 && `${pick.killer}|${pick.location}` === prev; i++)
        pick = { killer: KILLERS[(Math.random() * KILLERS.length) | 0].id, location: LOCATIONS[(Math.random() * LOCATIONS.length) | 0].id };
      revealLists = ['killers', 'locations', 'reel'];
      audio.play('card');
      return render();
    }
    case 'ackCard':
      cardQueue.shift();
      audio.play('card');
      updateOverlay();
      if (game) syncTeach(game);
      return;
    case 'start':
    case 'again':
      return startNewGame();
    case 'tutorial':
      document.querySelector('.modal')?.closest('.overlay')?.remove();
      return startTutorial();
    case 'quit':
      tutorial.stop(false);
      lessons.stop(false);
      screen = 'title';
      game = null;
      document.getElementById('overlay-root')?.remove();
      return render();
    default:
      screen = go as Screen;
      return render();
  }
}

app.addEventListener('mouseover', (e) => {
  if (touchOnly.matches) return; // a tap fakes a hover; taps open the details themselves
  const n = (e.target as HTMLElement).closest<HTMLElement>('[data-node]')?.dataset.node;
  inspectNode(n ?? null);
});
app.addEventListener('focusin', (e) => {
  // Keyboard focus only: a mouse click on a location shouldn't pin its tooltip open.
  const t = e.target as HTMLElement;
  const n = t.closest<HTMLElement>('[data-node]')?.dataset.node;
  if (n && t.matches(':focus-visible')) inspectNode(n);
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (document.querySelector('.modal:not(.ending)')) {
    if (e.key === 'Escape') document.querySelector('.modal')?.closest('.overlay')?.remove();
    return;
  }
  if (e.key === 'r' || e.key === 'R') return showRules();
  if (!game || screen !== 'game') return;
  if (document.querySelector('.dicetray:not(.live)')) {
    if (e.key === ' ' || e.key === 'Enter') (document.querySelector('.dicetray') as HTMLElement).click();
    e.preventDefault();
    return;
  }
  const s = game;
  if ((e.key === 'z' || e.key === 'Z') && !e.metaKey) return undo();
  if (e.key === 'h' || e.key === 'H') return showHint();
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (cardQueue.length) return navigate('ackCard');
    if (s.pending?.kind === 'roll') return act({ type: 'resolveRoll' });
    if (s.pending?.kind === 'search') return act({ type: 'keep', picks: [...searchPicks] });
    if (s.phase === 'upkeep') return act({ type: 'endUpkeep' });
    return;
  }
  if (e.key === 's' || e.key === 'S') return act({ type: 'stopMove' });
  if ((e.key === 'b' || e.key === 'B') && s.phase === 'planning') return navigate(planHidden === s.round ? 'openPlan' : 'hidePlan');
  if (/^[0-9]$/.test(e.key)) {
    const card = s.heroine.hand[(Number(e.key) + 9) % 10];
    if (card) act({ type: 'playCard', uid: card.uid });
    return;
  }
  if (e.key === 'a' || e.key === 'A') return act({ type: game && content?.location.rule.kind === 'calls' ? 'answer' : 'ruleAct' });
  if (e.key === 'e' || e.key === 'E') {
    if (s.phase === 'action') return act({ type: 'endAction' });
    if (s.phase === 'planning') return act({ type: 'endPlanning' });
    if (s.phase === 'upkeep') return act({ type: 'endUpkeep' });
  }
});

// ── Killer pronouns ─────────────────────────────────────────────────────────
// Text about the killer carries {he}/{him}/{his} placeholders (engine logs,
// shared location text, UI copy). Rather than fill them at each of the many
// places HTML is built, fill them once as they reach the page, in text and
// in tooltips, for the killer on screen (or the one being picked).
const PRONOUN_TOKEN = /\{(?:he|He|him|Him|his|His)\}/;
function screenPronoun() {
  return (screen === 'game' && content ? content.killer.pronoun : KILLERS.find((k) => k.id === pick.killer)?.pronoun) ?? 'he';
}
function fillNode(n: Node) {
  const p = screenPronoun();
  if (n.nodeType === Node.TEXT_NODE) {
    if (n.nodeValue && PRONOUN_TOKEN.test(n.nodeValue)) n.nodeValue = fillPronouns(n.nodeValue, p);
    return;
  }
  if (!(n instanceof Element)) return;
  for (const el of [n, ...n.querySelectorAll('[title]')]) {
    const t = el.getAttribute('title');
    if (t && PRONOUN_TOKEN.test(t)) el.setAttribute('title', fillPronouns(t, p));
  }
  const walk = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
  for (let t = walk.nextNode(); t; t = walk.nextNode()) if (t.nodeValue && PRONOUN_TOKEN.test(t.nodeValue)) t.nodeValue = fillPronouns(t.nodeValue, p);
}
new MutationObserver((muts) => {
  for (const m of muts) {
    if (m.type === 'childList') m.addedNodes.forEach(fillNode);
    else fillNode(m.target);
  }
}).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title'] });

window.addEventListener('resize', syncHandMore);
startGrain(document.getElementById('grain') as HTMLCanvasElement);
setGrainIntensity(prefs.grain);
render();

