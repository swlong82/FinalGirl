import '@fontsource/oswald/latin-400.css';
import '@fontsource/oswald/latin-600.css';
import '@fontsource/special-elite/latin-400.css';
import '@fontsource/creepster/latin-400.css';
import './ui/style.css';
import { audio } from './audio/audio';
import { heroinePortrait, heroineToken, icon, killerPortrait, mapBackdrop, pip, victimIcon } from './art/art';
import { eventStill, itemIcon, posterFrame } from './art/scenes';
import { startParticles } from './ui/particles';
import { botAction } from './engine/bot';
import { glyph } from './ui/glyphs';
import { TUTORIAL, tutorialGame } from './engine/tutorial';
import { isLegacySave, migrateSave } from './engine/migrate';
import { Tutorial } from './ui/tutorial';
import { buildContent, FEATURES, HEROINES, KILLERS, LOCATIONS, type Feature } from './content/registry';
import {
  abilityUnlocked,
  actionDef,
  activeItems,
  bloodlustLevel,
  canConvert,
  cardCost,
  check,
  CONVERT_COST,
  DIFFICULTY,
  dispatch,
  escortCap,
  eventDef,
  followers,
  HAND_LIMIT,
  HAND_SLOTS,
  handsUsed,
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

// ── App state ───────────────────────────────────────────────────────────────
type Screen = 'title' | 'feature' | 'heroine' | 'intro' | 'game' | 'stats';
const SAVE_KEY = 'lastlight.save.v2';
const PREFS_KEY = 'lastlight.prefs.v1';
const TIPS_KEY = 'lastlight.tips.v2';
const STATS_KEY = 'lastlight.stats.v1';
const TUT_KEY = 'lastlight.tutorial.v2';
const tutorial = new Tutorial((finished) => {
  store(TUT_KEY, true);
  if (finished) toast('Tutorial complete. The night is yours. Press <b>H</b> any time for a hint.', 6000);
});

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
let upkeepHidden = -1;
let convertDie: number | null = null;
let convertPick: number[] = [];
let searchPicks: number[] = [];
let swapFor: number | null = null;
let selItem: number | null = null;
let lastHorrorShown: number | null = null;
let aimMode: 'choose' | 'split' = 'choose';
let splitDraft: Record<number, number> = {};

const prefs: Prefs = { sound: true, volume: 0.8, music: 0.7, grain: 0.6, tips: true, tiebreak: 'adverse', ...load(PREFS_KEY, {}) };
const seenTips = new Set<string>(load(TIPS_KEY, [] as string[]));

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
      return `barricade ${e.strength}`;
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
          killerAttack: `his attack +${e.n}`,
          killerMove: `his move +${e.n}`,
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
      return 'his minions, then he, act';
    case 'counter':
      return `hit back ${e.n}`;
    case 'killerDamage':
      return `${e.n} damage to him`;
    case 'block':
      return e.n >= 99 ? 'block all' : `block ${e.n}`;
    case 'bloodlust':
      return `bloodlust +${e.n}`;
    case 'killerHeal':
      return `he heals ${e.n}`;
    case 'killerStun':
      return 'he loses his next move';
    case 'killerMove':
      return e.toward === 'heroine' ? `he comes ${e.steps} closer` : e.toward === 'lair' ? `he moves ${e.steps} toward his lair` : `he moves ${e.steps} toward ${content ? nodeName(content, e.toward) : e.toward}`;
    case 'killerTeleport':
      return e.to === 'heroine' ? 'he appears beside you' : 'he relocates';
    case 'target':
      return e.who === 'heroine' ? 'targets you' : e.who === 'npc' ? 'targets the closest survivor' : 'targets whoever is closest';
    case 'hunt':
      return e.extra ? `moves (+${e.extra})` : 'moves';
    case 'attack':
      return (e.n ?? 1) > 1 ? `attacks ×${e.n}` : 'attacks';
    case 'revealPower':
      return 'reveals his power';
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
      return 'he is here';
    case 'killerAdjacent':
      return 'he is next door';
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
  { id: 'fight', name: 'Fight', blurb: 'hurt him: he must be in reach' },
  { id: 'search', name: 'Search', blurb: 'find weapons and items where you stand' },
  { id: 'defend', name: 'Defend', blurb: 'play during his attack to block it' },
  { id: 'recover', name: 'Recover', blurb: 'heal wounds, calm your horror' },
  { id: 'tricks', name: 'Tricks', blurb: 'hide, barricade, lure him, call survivors' },
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
  const dice = why ? `<span class="whyno">${esc(why)}</span>` : bd ? `<span class="dn" title="${esc(diceWhy(bd.parts))}">${bd.total} dice</span>` : d.roll ? 'Horror Roll' : 'no roll';
  const bands = d.roll
    ? `<span class="band"><i class="g">2+</i>${esc(describeEffects(d.great ?? []))}</span><span class="band"><i class="o">1</i>${esc(describeEffects(d.good ?? []))}</span><span class="band"><i class="x">✗</i>${esc(describeEffects(d.fail ?? []))}</span>`
    : `<span class="band"><i class="g">✓</i>${esc(describeEffects(d.always ?? []))}</span>`;
  return `<button class="act fcard ${d.kind} tag-${d.tags[0]}" data-kind="${d.tags[0]}" ${attrs}>
    <span class="n" title="${esc(d.name)}">${esc(d.name)}</span>${idx !== undefined && idx < 10 ? `<kbd class="key">${(idx + 1) % 10}</kbd>` : ''}
    <span class="cost"><b>${cardCost(c, d)}</b>◉ · ${dice}${d.kind === 'reaction' ? ' · <em>reaction</em>' : ''}</span>
    <span class="bands">${bands}</span>${extra}
  </button>`;
}

// ── Screens ─────────────────────────────────────────────────────────────────
/** Internal scroll positions on the pick screens survive re-renders (picking re-renders). */
let scrollMemo: { screen: Screen; pos: Record<string, [number, number]> } = { screen: 'title', pos: {} };
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
    <div class="fineprint">Original game, characters, art &amp; audio. All visuals and sound are generated in code. Headphones recommended.</div>
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
  showTip('start', 'Each turn: play cards with <b>nerve</b>, buy new ones in <b>Planning</b>, then he moves and a <b>Terror</b> card flips. When the 10 Terror cards run out, the <b>Finale</b> begins.');
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
  tutorial.start();
  tutorial.sync(game);
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
      <aside class="side left"><div class="panel" id="heroine-panel"></div></aside>
      <main class="stage"><div class="phasebar" id="phasebar"></div><div class="board" id="board"></div></main>
      <aside class="side right"><div class="panel" id="killer-panel"></div><div class="panel log-panel"><h4>Script</h4><div class="log" id="log"></div></div></aside>
      <footer class="bottombar" id="bottombar"></footer>
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
      return `<line data-edge="${a}|${b}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    })
    .join('');
  board.innerHTML = `<div class="bd">${mapBackdrop(loc, game!.killer.finale)}</div>
    <svg class="edges" viewBox="0 0 1000 640" preserveAspectRatio="none">${edges}<line id="threat" class="threat" x1="0" y1="0" x2="0" y2="0"/></svg>
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
    <div class="token heroine" id="tok-h"><div class="pin">${heroineToken(c.heroine)}</div><span class="tag">${esc(c.heroine.name.split(' ')[0])}</span></div>
    <canvas class="particles" id="particles"></canvas>
    <div class="token killer" id="tok-k"><div class="pin">${killerPortrait({ art: c.killer.art })}</div><span class="tag">${esc(c.killer.name.replace(/^The /, ''))}</span><div class="tok-hp" id="tok-khp"><i class="hp"></i><i class="tmp"></i><span></span></div></div>
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
    .map((r) => `<tr><td>${new Date(r.at).toLocaleDateString()}</td><td>${esc(HEROINES.find((h) => h.id === r.heroine)?.name ?? r.heroine)}</td><td>${esc(KILLERS.find((k) => k.id === r.killer)?.name ?? r.killer)}</td><td>${esc(DIFFICULTY[r.difficulty]?.label ?? '')}</td><td>${r.outcome === 'slain' ? 'killed him' : r.outcome === 'died' ? 'died' : 'he escaped'}</td><td>${r.score}</td></tr>`)
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
  else if (r.kind === 'intermission') {
    const p = r.period ?? 4;
    const wait = Math.ceil(s.round / p) * p - s.round;
    state = wait === 0 ? 'THIS TURN' : `in ${wait} turn${wait > 1 ? 's' : ''}`;
  }
  const hot = s.env.tideHigh || s.env.dark || !!s.env.ringing || s.env.cold >= 2;
  return `<button class="rulechip ${hot ? 'hot' : ''}" data-go="rules" title="${esc(r.text)}"><b>${esc(r.name)}</b> · ${esc(state)}</button>`;
}

const PHASES: [GameState['phase'], string][] = [
  ['action', 'Action'],
  ['planning', 'Planning'],
  ['hunter', 'Killer'],
  ['panic', 'Panic'],
  ['upkeep', 'Upkeep'],
];

function updateGame() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const k = s.killer;
  const killerHere = k.loc === h.loc;
  const killerNear = killerHere || neighbors(c, h.loc).includes(k.loc);
  setMood(h.horror, k.finale, killerNear);

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
  document.getElementById('phasebar')!.innerHTML = PHASES.map(([p, n], i) => `<span class="ph ${s.phase === p ? 'on' : ''} ${PHASES.findIndex(([q]) => q === s.phase) > i ? 'done' : ''}">${i + 1} · ${n}</span>`).join('<i>→</i>');

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
  tutorial.sync(s);
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
  if (d.kind === 'lore') out.push('+1 dmg vs him');
  if (it.usesLeft !== undefined) out.push(`${it.usesLeft} left`);
  return out;
}

function itemTile(c: Content, s: GameState, it: HeldItem, where: 'hand' | 'pack', span2 = false): string {
  const d = itemDef(c, it.id);
  const active = where === 'hand' || d.hands === 0;
  const usable = active && !!d.use && check(c, s, { type: 'useItem', uid: it.uid }).ok;
  const hands = d.hands ? `<i class="hb">${d.hands}H</i>` : '';
  const facts = itemFacts(c, it);
  return `<button class="tile k-${d.kind} ${where} ${active ? '' : 'idle'} ${usable ? 'ready' : ''} ${selItem === it.uid ? 'sel' : ''} ${span2 ? 'span2' : ''}" data-sel="${it.uid}" title="${esc(d.name)}: ${esc(d.text)}${active ? '' : ' (needs to be in hand to work)'}">
    <span class="t-ico">${itemIcon(d)}</span>
    <span class="t-nm">${esc(d.name)}</span>
    <span class="t-f">${hands}${facts.map((f) => `<i>${esc(f)}</i>`).join('')}</span>
  </button>`;
}

/** Scroll the heroine panel so the selected item's card and its buttons are in view. */
function revealItemDetail() {
  document.querySelector('#heroine-panel .detail:not(.empty)')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
  if (inHand) btns.push(`<button class="btn small" data-stow="${it.uid}" ${rearrangeOk ? '' : 'disabled title="Only when you gain an item, or in Upkeep"'}>Stow</button>`);
  else if (d.hands > 0) btns.push(`<button class="btn small" data-ready="${it.uid}" ${rearrangeOk ? '' : 'disabled title="Only when you gain an item, or in Upkeep"'}>Take in hand</button>`);
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
  const handTiles = h.items.map((it) => itemTile(c, s, it, 'hand', itemDef(c, it.id).hands === 2)).join('') + Array(Math.max(0, HAND_SLOTS - used)).fill('<div class="tile empty">Empty hand</div>').join('');
  const bag = h.pack.map((it) => itemTile(c, s, it, 'pack')).join('') || '<div class="bag-empty">Nothing stored yet.</div>';
  document.getElementById('heroine-panel')!.innerHTML = `<div class="pane">
    <header class="p-id">${heroinePortrait(c.heroine, { grim: h.horror / 6, hurt: 1 - total / (h.maxHealth + 1) })}
      <div><div class="p-name">${esc(c.heroine.name)}</div><div class="p-role">${esc(c.heroine.title)}</div></div></header>
    <div class="vitals">
      ${vital('Health', `${h.health}<small>/${h.maxHealth}</small>`, h.token === null ? 'no backup' : `+ <span class="tok">?</span> backup`, h.health <= 2 ? 'bad' : '', h.token === null ? 'Backup token used: the next time she runs out of health, she dies.' : 'Health, plus a hidden backup token (the final-health token). When her health runs out the token is revealed: a number gets her back up with that much health, a blank means death.')}
      ${vital('Horror', `${h.horror}<small>/${MAX_HORROR}</small>`, `${horrorDice(s)} dice a roll`, h.horror >= 4 ? 'bad' : '', 'The higher your horror, the fewer dice you roll. Past 6, it feeds his bloodlust.')}
      ${vital('Nerve', String(h.nerve), h.nerve < 0 ? 'in debt' : `base ${base} a turn`, h.nerve < 0 ? 'bad' : 'gold', `Pays for cards (◉ is nerve). Each turn starts at ${base}, plus bonuses from rescues, being perfectly calm (horror 0) and some events. Discard a card for +1. Below zero ends your Action phase.`)}
    </div>
    <div class="htrack" title="Horror track: as horror rises, you roll fewer dice"><span class="ht-k"><b>horror</b><b>dice</b></span>${htrack}</div>
    ${sec('Rescues', `${h.rescued} saved${h.resolve ? ` · +${h.resolve} attack die` : ''}`, `<div class="rtrack" title="Fill every slot to unlock ${esc(c.heroine.ability.name)}">${rtrack}<i class="rt-link"></i><span class="rt ab ${unlocked ? 'done' : ''}" title="${esc(c.heroine.ability.name)}: ${esc(c.heroine.ability.text)}">★</span></div><p class="prose small">${nextTxt}</p>
      <div class="ability ${unlocked ? 'on' : ''}" title="${esc(c.heroine.ability.text)}"><div class="ab-h"><span class="ab-n">★ ${esc(c.heroine.ability.name)}</span>${unlocked ? `<button class="btn small ${abilityChk.ok ? 'primary' : ''}" data-act="useAbility" ${abilityChk.ok ? '' : `disabled title="${esc(abilityChk.why ?? '')}"`}>Use</button>` : `<span class="ab-l">unlocks at ${slots.length}</span>`}</div>${unlocked ? `<p class="prose small">${esc(c.heroine.ability.text)}</p>` : ''}</div>`)}
    ${sec('Hands', `${used}/${HAND_SLOTS}${rearrangeOk ? ' · <b class="ok">rearrange now</b>' : ''}`, `<div class="hands">${handTiles}</div>`, 'inv')}
    ${sec(`${glyph('pack')} Backpack`, `${h.pack.length} item${h.pack.length === 1 ? '' : 's'}`, `<div class="bag">${bag}</div>${itemDetail(c, s, rearrangeOk)}`, 'inv')}
    ${sec('Passive', esc(c.heroine.passive.name), `<p class="prose small">${esc(c.heroine.passive.text)}</p>`)}
  </div>`;
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
  const target = predictTarget(c, s);
  const power =
    k.power === 'hidden'
      ? `<p class="prose small">Hidden until bloodlust ${c.killer.bloodlust.revealAt}, or the Finale.</p>`
      : k.power === 'active'
        ? `<div class="hpbar temp" title="Temporary health"><div style="width:${(k.powerHealth / Math.max(1, c.killer.power.health)) * 100}%"></div></div><p class="prose small">${esc(c.killer.power.text)}</p>`
        : `<p class="prose small spent">Broken.</p>`;
  const mdef = c.killer.minions;
  const minions = mdef
    ? sec(esc(mdef.plural), `${s.minions.length}/${mdef.max} out`, `<div class="facts"><i>${mdef.health} hp</i><i>move ${mdef.move}</i><i>attack ${mdef.attack}</i><i>${mdef.order === 'before' ? 'acts first' : 'acts after him'}</i></div><p class="prose small">${esc(mdef.text.split('. ')[0])}.</p>`)
    : '';
  const named = s.specials.length || s.specialsGone.length
    ? sec('Named survivors', '', `<ul class="list">${[...s.specials.map((x) => `<li><b>${esc(specialDef(c, x.id).name)}</b> · ${esc(nodeName(c, x.at))}<br><span>${esc(specialDef(c, x.id).text)}</span></li>`), ...s.specialsGone.map((x) => `<li class="gone"><b>${esc(specialDef(c, x.id).name)}</b> · ${x.how}</li>`)].join('')}</ul>`)
    : '';
  document.getElementById('killer-panel')!.innerHTML = `<div class="pane dark">
    <header class="p-id">${killerPortrait({ finale: k.finale, art: c.killer.art })}
      <div><div class="p-name">${esc(c.killer.name)}</div><div class="p-role">${esc(c.killer.epithet)}</div></div></header>
    <div class="boss-hp ${k.health <= k.maxHealth / 3 ? 'low' : ''}" title="${k.token === null ? 'His backup token is used. Next time he hits zero, he is dead.' : 'He has a hidden backup token (final-health token). When a hit takes him below zero it is revealed: a number gets him back up with that much health, a blank means he is dead.'}">
      <div class="bh-top"><span class="bh-l">Health</span><span class="bh-n">${k.health}<small>/${k.maxHealth}</small></span>${k.power === 'active' && k.powerHealth ? `<span class="bh-tmp">+${k.powerHealth} shield</span>` : ''}<span class="bh-tok ${k.token === null ? 'used' : ''}">${k.token === null ? 'no backup' : '+ ? backup'}</span></div>
      <div class="bh-bar" style="--n:${k.maxHealth}"><i style="width:${(k.health / Math.max(1, k.maxHealth)) * 100}%"></i>${k.power === 'active' ? `<b style="width:${Math.min(100, (k.powerHealth / Math.max(1, k.maxHealth)) * 100)}%"></b>` : ''}</div>
      ${k.health === 0 && k.token !== null ? '<div class="bh-note">Down at 0: the next hit reveals his backup token. Blank = dead; a number = he gets up.</div>' : ''}
    </div>
    <div class="vitals two">
      ${vital('Move', String(killerMoveValue(c, s)), k.stunned ? 'stunned' : 'per turn', k.stunned ? 'good' : '')}
      ${vital('Attack', String(killerAttack(c, s)), 'damage per attack', '')}
    </div>
    ${sec(k.finale ? `Finale: ${esc(c.killer.finale.name)}` : 'His turn', `next: <b>${esc(target === h.loc ? 'you' : nodeName(c, target))}</b>`, `<p class="prose small">${esc(beh.text)}</p>`, `next ${k.finale ? 'fin' : ''}`)}
    ${sec(`Bloodlust ${k.bloodlust}`, esc(cur.name ?? ''), `<div class="btrack"><span class="bt-k"><b>move</b><b>attack</b></span>${btrack}</div>`)}
    ${sec(k.power === 'hidden' ? 'Power' : esc(c.killer.power.name), k.power === 'active' ? `${k.powerHealth} temp hp` : k.power === 'spent' ? 'spent' : 'hidden', power, `power ${k.power}`)}
    ${minions}
    ${named}
    ${sec('Ongoing events', '', `<ul class="list">${s.events.map((id) => `<li><b>${esc(eventDef(c, id).name)}</b><br><span>${esc(eventSummary(c, id))}</span></li>`).join('') || '<li>None.</li>'}</ul>`)}
    ${sec('Weakness', `lore ${loreBonus(c, s)}/${c.killer.items.length}`, `<p class="prose small">${esc(c.killer.weakness.text)}</p>`)}
    ${lastQuote ? `<p class="quote">${esc(lastQuote)}</p>` : ''}
    <div class="tally"><span><b class="good">${s.saved}</b> saved</span><span><b class="bad">${s.slain}</b> slain</span><span><b>${s.victimPool}</b> out there</span></div>
  </div>`;
}

function eventSummary(c: Content, id: string): string {
  const ev = eventDef(c, id);
  const parts: string[] = [];
  for (const [key, n] of Object.entries(ev.ongoing ?? {})) parts.push(describeEffect({ op: 'mod', key: key as never, n: n as number }));
  if (ev.upkeep?.length) parts.push(`each Upkeep: ${describeEffects(ev.upkeep)}`);
  return parts.join('; ') || ev.text;
}

function updateBoard() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const moving = s.pending?.kind === 'move';
  const reach = moving ? neighbors(c, h.loc) : [];
  document.querySelectorAll<HTMLButtonElement>('.node').forEach((el) => {
    const id = el.dataset.node!;
    el.classList.toggle('reach', reach.includes(id));
    el.classList.toggle('here', id === h.loc);
    const badges: string[] = [];
    const pile = s.piles[id];
    if (pile) badges.push(`<span class="badge search ${pile.cards.length ? '' : 'empty'}" title="Item pile: ${pile.cards.length} left${pile.up && pile.cards.length ? `. Top card: ${esc(itemDef(c, pile.cards[0]).name)}` : ''}">${glyph('search')}${pile.cards.length}</span>`);
    if (isExit(c, id)) badges.push(`<span class="badge exitb" title="Exit: survivors here with you are rescued">EXIT</span>`);
    if ((s.barricades[id] ?? 0) > 0) badges.push(`<span class="badge barr" title="Barricade: costs him ${s.barricades[id]} movement">${glyph('barricade')}${s.barricades[id]}</span>`);
    const rk = c.location.rule.kind;
    if (rk === 'cold' && hasTag(c, id, 'outdoor')) badges.push(`<span class="badge env" title="Outdoors: ending a turn here adds cold">${glyph('snow')}</span>`);
    if (rk === 'cold' && hasTag(c, id, 'warm')) badges.push(`<span class="badge env warm" title="Warm: ending a turn here thaws you">${glyph('fire')}</span>`);
    if (rk === 'tide' && hasTag(c, id, 'shore')) badges.push(`<span class="badge env" title="Shore: floods at high tide">${glyph(isFlooded(c, s, id) ? 'wave' : 'ripple')}</span>`);
    if (rk === 'calls' && hasTag(c, id, 'phone')) badges.push(`<span class="badge env ${s.env.ringing === id ? 'ringing' : ''}" title="${s.env.ringing === id ? 'Ringing! Answer it here.' : 'Phone'}">${glyph('phone')}</span>`);
    el.classList.toggle('flooded', isFlooded(c, s, id));
    el.classList.toggle('ringing', s.env.ringing === id);
    el.querySelector('.badges')!.innerHTML = badges.join('');
    const named = specialsAt(s, id).map((x) => `<span class="named" title="${esc(specialDef(c, x.id).name)}: ${esc(specialDef(c, x.id).text)}">${victimIcon()}<i>${esc(specialDef(c, x.id).name.split(',')[0].trim().split(' ').pop()!)}</i></span>`);
    const mins = minionsAt(s, id).length;
    el.querySelector('.vics')!.innerHTML =
      Array(s.victims[id] ?? 0).fill(victimIcon()).join('') + named.join('') + (mins ? `<span class="minion" title="${mins} ${esc(mins > 1 ? c.killer.minions!.plural : c.killer.minions!.name)}">${'☠'.repeat(mins)}</span>` : '');
    el.disabled = !reach.includes(id) && id !== h.loc;
  });
  document.querySelectorAll<SVGLineElement>('svg.edges line[data-edge]').forEach((ln) => {
    const [a, b] = ln.dataset.edge!.split('|');
    ln.classList.toggle('hot', (a === h.loc && reach.includes(b)) || (b === h.loc && reach.includes(a)));
  });
  const pos = (id: string) => c.location.nodes.find((n) => n.id === id)!;
  const hp = pos(h.loc);
  const kp = pos(s.killer.loc);
  const same = h.loc === s.killer.loc;
  const X = (x: number) => x / 10;
  const Y = (y: number) => y / 6.4;
  const th = document.getElementById('tok-h')!;
  th.style.left = `${X(hp.x) - (same ? 3.4 : 0)}%`;
  th.style.top = `${Y(hp.y) - 8.5}%`;
  th.classList.toggle('hidden', h.hidden);
  const rh = document.getElementById('ring-h')!;
  rh.style.left = `${X(hp.x)}%`;
  rh.style.top = `${Y(hp.y)}%`;
  const tk = document.getElementById('tok-k')!;
  tk.style.left = `${X(kp.x) + (same ? 3.4 : 0)}%`;
  tk.style.top = `${Y(kp.y) - 9}%`;
  tk.classList.toggle('stunned', s.killer.stunned > 0);
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
  const adjacent = !same && neighbors(c, h.loc).includes(s.killer.loc);
  thr.setAttribute('x1', String(hp.x));
  thr.setAttribute('y1', String(hp.y));
  thr.setAttribute('x2', String(kp.x));
  thr.setAttribute('y2', String(kp.y));
  thr.classList.toggle('on', adjacent);
  document.getElementById('board')!.classList.toggle('dark', s.env.dark);
  const hint = document.getElementById('board-hint')!;
  if (moving) {
    const p = s.pending as { kind: 'move'; left: number };
    const here = npcAt(s, h.loc);
    const cap = escortCap(c);
    const named = specialsAt(s, h.loc)
      .map((x) => `<button class="btn tiny ${(h.leave ?? []).includes(x.id) ? '' : 'sel'}" data-follow="${x.id}" title="${(h.leave ?? []).includes(x.id) ? 'Staying put: click to bring' : 'Coming with you: click to leave behind'}">${esc(specialDef(c, x.id).name.split(',')[0].trim().split(' ').pop()!)} ${(h.leave ?? []).includes(x.id) ? 'stays' : 'comes'}</button>`)
      .join('');
    const bring = here ? `<span class="hint-group">Bring up to <span class="bring">${Array.from({ length: cap + 1 }, (_, n) => `<button class="btn tiny ${h.bring === n ? 'sel' : ''}" data-bring="${n}">${n}</button>`).join('')}</span> of ${here}${named ? ` ${named}` : ''}</span>` : '';
    hint.innerHTML = `<span class="hint-group"><b class="steps">${p.left}</b> step${p.left > 1 ? 's' : ''} left: click a glowing location, or stop here</span>${bring}`;
  } else if (s.phase === 'action') hint.innerHTML = 'Play a card from your hand. Hover a location for details.';
  else hint.innerHTML = '';
}

function shortWhy(why?: string): string | undefined {
  if (!why) return undefined;
  const map: [RegExp, string][] = [
    [/^The killer must be here/, 'needs killer'],
    [/^Not with the killer/, 'killer here'],
    [/^Only at a search/, 'no search'],
    [/^Nothing left to find/, 'searched out'],
    [/^He must be here/, 'out of reach'],
    [/^Reactions are played/, 'his turn'],
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
      const disc = s.phase === 'action' && !s.pending && h.nerve >= 0 ? `<span class="disc" data-discard="${card.uid}" title="Discard this card for +1 nerve">discard +1◉</span>` : '';
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
  const track = DIFFICULTY[s.difficulty].track;
  const rose = lastHorrorShown !== null && h.horror > lastHorrorShown;
  const fell = lastHorrorShown !== null && h.horror < lastHorrorShown;
  lastHorrorShown = h.horror;
  const pile = `<div class="status ${rose ? 'up' : fell ? 'down' : ''}" title="Horror ${h.horror}: every Horror Roll uses ${horrorDice(s)} dice before bonuses">
    <div class="st-h"><span class="st-l">Horror</span><span class="st-v ${h.horror >= 4 ? 'bad' : ''}">${h.horror}<small>/${MAX_HORROR}</small></span></div>
    <div class="st-m">${track.map((_, i) => `<i class="${i <= h.horror && i > 0 ? 'on' : ''} ${i === h.horror ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="st-row"><span><b>${horrorDice(s)}</b> dice</span><span class="${h.nerve < 0 ? 'bad' : ''}"><b>${h.nerve}</b> nerve</span></div>
    <div class="st-row dim"><span>${h.hand.length}/${HAND_LIMIT} cards</span><span>${s.discard.length} used</span></div>
  </div>`;
  let main = '';
  if (s.pending?.kind === 'move')
    main = `<button class="endturn stop" data-act="stopMove">Stop here <small style="display:block;font-size:10px;opacity:.8">${(s.pending as { left: number }).left} step${(s.pending as { left: number }).left > 1 ? 's' : ''} unused · S</small></button>`;
  else if (s.phase === 'action')
    main = `<button class="endturn" data-act="endAction" ${check(c, s, { type: 'endAction' }).ok ? '' : 'disabled'}>End Action <small style="display:block;font-size:10px;opacity:.7">${h.nerve} nerve → Planning · E</small></button>`;
  else if (s.phase === 'planning')
    main = `<button class="endturn shop-btn" data-go="openPlan">Shop <small style="display:block;font-size:10px;opacity:.8">${h.nerve} nerve · B</small></button><button class="endturn" data-act="endPlanning">Done <small style="display:block;font-size:10px;opacity:.7">his turn · E</small></button>`;
  else if (s.phase === 'upkeep')
    main = `<button class="endturn" data-act="endUpkeep" ${check(c, s, { type: 'endUpkeep' }).ok ? '' : 'disabled'}>Next turn <small style="display:block;font-size:10px;opacity:.7">E</small></button>`;
  else main = `<button class="endturn" disabled>His turn…</button>`;
  const bar = document.getElementById('bottombar')!;
  const keepX = bar.querySelector<HTMLElement>('.hand-row')?.scrollLeft ?? 0;
  bar.innerHTML = `
    <div>${pile}<div class="hand-wrap"><div class="actions hand-row">${cards}${answer}</div><button class="hand-more l" data-hscroll="-1" aria-label="Scroll hand left"></button><button class="hand-more r" data-hscroll="1" aria-label="Scroll hand right"></button></div></div>
    <div class="endcol"><div class="endtools"><button class="btn small" data-go="undo" ${canUndo() ? '' : 'disabled'} title="Undo (Z): not after dice rolls or draws">${glyph('undo')} Undo</button><button class="btn small" data-go="hint" ${s.phase === 'action' || s.phase === 'planning' ? '' : 'disabled'} title="What would a survivor do? (H)">${glyph('bulb')} Hint</button></div>
    ${main}</div>`;
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
      kind = 'His power is revealed';
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
    const band = succ >= 2 ? 'great' : succ === 1 ? 'good' : 'fail';
    const dice = r.dice
      .map((v, i) => {
        const conv = r.converted.includes(i);
        const cls = v >= 5 || conv ? 'hit' : v >= 3 ? 'part' : 'miss';
        const can = cls === 'part' && h.hand.length >= CONVERT_COST;
        return `<button class="die ${cls} ${conv ? 'conv' : ''} ${convertDie === i ? 'sel' : ''}" ${can ? `data-die="${i}" title="Discard ${CONVERT_COST} cards to make this a success"` : 'disabled'}>${pip(v)}</button>`;
      })
      .join('');
    const pickHand =
      convertDie !== null
        ? `<p>Discard <b>${CONVERT_COST}</b> cards to buy die ${convertDie + 1} up to a success:</p><div class="conv-hand">${h.hand
            .map((x) => `<button class="chip ${convertPick.includes(x.uid) ? 'sel' : ''}" data-cpick="${x.uid}">${esc(actionDef(c, x.id).name)}</button>`)
            .join('')}</div><button class="btn small primary" data-go="doConvert" ${convertPick.length === CONVERT_COST ? '' : 'disabled'}>Discard &amp; convert</button>`
        : canConvert(s)
          ? `<p class="dim">Click a <b>3 or 4</b> to buy it up to a success by discarding ${CONVERT_COST} cards.</p>`
          : '';
    root.innerHTML = `<div class="overlay"><div class="dicetray live ${r.reaction ? 'react' : ''}">
      <h5>${esc(d.name)} · 5–6 hit · 3–4 partial</h5>
      ${s.lastRoll?.parts ? `<div class="why">${esc(diceWhy(s.lastRoll.parts))}</div>` : ''}
      <div class="dice">${dice}</div>
      <div class="res">${succ} success${succ === 1 ? '' : 'es'} → <b>${esc(describeEffects(d[band] ?? []))}</b></div>
      ${pickHand}
      <button class="btn primary" data-act="resolveRoll">Resolve <small>(space)</small></button>
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
      <p>You have <b>${h.health}</b> health${h.token !== null ? ', plus your hidden backup token' : ' and no backup token left'}. A reaction card costs nerve from next turn and protects against this one attack.</p>
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
      <span class="pb-k">Planning</span>
      <span class="pb-v"><b class="${h.nerve <= 0 ? 'bad' : ''}">${h.nerve}</b> nerve to spend</span>
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
            ? `<span class="pilecount poor">need ${cardCost(c, d)} nerve</span>`
            : left > 0
              ? `<span class="pilecount">${left} left</span>`
              : `<span class="pilecount out">${used ? 'back after Planning' : held ? 'in your hand' : 'none left'}</span>`;
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
    const moveWarn = canMove || full ? '' : `<div class="shop-warn">${walkLeft ? 'No movement card for next turn. Take a free <b>Walk</b>.' : 'No movement card for next turn. Buy one from the <b>Move</b> shelf.'}</div>`;
    root.innerHTML = `<div class="overlay draft-ov shop-ov"><div class="draft tableau shop">
      <header class="shop-head">
        <div class="shop-title">
          <div class="kind">Turn ${s.round} · Planning</div>
          <h2>Stock up</h2>
          <p>${note}</p>
        </div>
        <div class="shop-meter m-nerve ${h.nerve <= 0 ? 'empty' : ''}"><span class="ml">Nerve to spend</span><span class="mv">${h.nerve}</span><span class="ms">resets to ${resetTo} next turn</span></div>
        <div class="shop-meter m-hand ${full ? 'full' : ''}"><span class="ml">Cards in hand</span><span class="mv">${h.hand.length}<small>/${HAND_LIMIT}</small></span><span class="ms">${full ? 'hand full' : `room for ${HAND_LIMIT - h.hand.length} more`}</span></div>
      </header>
      <div class="shop-body" data-scroll="shop">${shelves}</div>
      <footer class="shop-foot">${moveWarn}
        <div class="shop-hand"><span class="sh-l">Your hand</span>${handChips || '<i class="chip-c">empty</i>'}</div>
        <div class="row-btns"><button class="btn" data-go="undo" ${canUndo() ? '' : 'disabled'} title="Undo your last buy (Z)">${glyph('undo')} Undo</button><button class="btn" data-go="hidePlan">Peek at the board <small>(B)</small></button><button class="btn primary" data-act="endPlanning">Done: his turn <small>(E)</small></button></div>
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
      if (dkh > 0) chips.push(`<span class="chip-s warn">he healed ${dkh}</span>`);
      const dm = s.minions.length - turnStart.minions;
      if (dm > 0) chips.push(`<span class="chip-s warn">+${dm} ${esc(dm > 1 ? c.killer.minions?.plural ?? 'minions' : (c.killer.minions?.name ?? 'minion').replace(/^(A|An) /, ''))}</span>`);
      if (s.killer.finale && !turnStart.finale) chips.push('<span class="chip-s bad">the Finale begins</span>');
      if (!chips.length) chips.push('<span class="chip-s good">you came through untouched</span>');
    }
    if (s.lastTerror && s.log.slice(killerLogStart).some((l) => l.text.startsWith('TERROR'))) chips.push(`<span class="chip-s">Terror: ${esc(terrorDef(c, s.lastTerror).name)}</span>`);
    root.innerHTML = `<div class="overlay"><div class="killerturn">
      <h2>${esc(c.killer.name)}</h2>
      <div class="kt-sum">${chips.join('')}</div>
      <ul class="kt-log">${lines || '<li>He waits in the dark.</li>'}</ul>
      <p class="dim">Upkeep: you may rearrange items between your hands and backpack now.</p>
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
                ? 'Keep a <b>Defend</b> card (Duck, Brace, Dodge) in hand: it blocks his attack during his turn.'
                : s.killer.bloodlust >= 4
                  ? 'Every survivor he kills raises his <b>bloodlust</b>, and he hits harder. Get them out before he reaches them.'
                  : 'When your health is low, stay out of his reach: the killer panel shows where he goes next.';
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
    setTimeout(revealItemDetail, 50);
  }
  else if (selItem !== null && ![...game.heroine.items, ...game.heroine.pack].some((x) => x.uid === selItem)) selItem = null;
  swapFor = null;
  // Snapshot before each card or buy. Steps of a decision already under way (moving, choosing)
  // keep the snapshot from before the card, so a finished Walk can still be undone.
  const samePhase = (prev.phase === 'action' || prev.phase === 'planning') && prev.phase === game.phase;
  if (!samePhase) history = [];
  else if (!prev.pending) history.push(prev);
  persist();
  runFx(game);
  updateGame();
  contextualTips();
}

let endWarned = -1;
function confirmEnd(): boolean {
  // Only a nudge when a card could still be played; never during the guided night (it just asked for this).
  if (endWarned === game!.round || tutorial.active) return true;
  const playable = game!.heroine.hand.some((x) => check(content!, game!, { type: 'playCard', uid: x.uid }).ok);
  if (!playable) return true;
  endWarned = game!.round;
  toast(`You could still play a card. Unspent nerve (${game!.heroine.nerve}) carries into Planning for buying. Press End Action again to move on.`);
  return false;
}

function readyItem(uid: number) {
  if (!game || !content) return;
  const c = content;
  const h = game.heroine;
  const it = h.pack.find((x) => x.uid === uid);
  if (!it) return;
  const need = itemDef(c, it.id).hands;
  const free = HAND_SLOTS - handsUsed(c, h.items);
  if (free >= need) return act({ type: 'ready', uid });
  if (need === 2 || h.items.length === 1) return act({ type: 'ready', uid, swapOut: h.items.map((x) => x.uid) });
  swapFor = uid;
  updateOverlay();
}

function showMapKey() {
  const c = content;
  const ruleTxt = c ? `<tr><td>${glyph(c.location.rule.kind === 'cold' ? 'snow' : c.location.rule.kind === 'tide' ? 'wave' : c.location.rule.kind === 'calls' ? 'phone' : 'reel')}</td><td><b>${esc(c.location.rule.name)}</b>: ${esc(c.location.rule.text)}</td></tr>` : '';
  modal(`<h2>Map key</h2><table class="keytable">
    <tr><td><span class="kpin you"></span></td><td><b>You</b>: the white pin with your name.</td></tr>
    <tr><td><span class="kpin him"></span></td><td><b>The killer</b>: the red pin. A red dashed line means he is <b>one step away</b>.</td></tr>
    <tr><td>${glyph('person')}</td><td><b>Survivors</b>: when you move, up to ${c ? escortCap(c) : 2} come with you (never into his location). Get them to an exit.</td></tr>
    <tr><td><span class="badge exitb">EXIT</span></td><td><b>Exit</b> (green ring): survivors here with you are rescued, and each one fills a rescue slot.</td></tr>
    <tr><td><span class="badge search">${glyph('search')}4</span></td><td><b>Item pile</b>: search cards draw from it. Hover to see the top card when it is face up.</td></tr>
    <tr><td><span class="badge barr">${glyph('barricade')}2</span></td><td><b>Barricade</b>: each point costs him 1 movement.</td></tr>
    <tr><td><span class="named">${victimIcon()}<i>Name</i></span></td><td><b>Named survivor</b>: follows the survivor rules with one exception (hover to read it). Rescuing them pays an extra reward; losing them costs you.</td></tr>
    <tr><td><span class="minion">☠</span></td><td><b>Minions</b>: some killers bring help. They have their own health, move and attack. Survivors will follow you into their location, just not into his.</td></tr>
    <tr><td><span class="kring lair"></span></td><td><b>Red ring</b>: his lair.</td></tr>
    <tr><td><span class="kring reach"></span></td><td><b>Glowing gold</b>: where you can step while a move card is resolving.</td></tr>
    ${ruleTxt}
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
  if (id === s.killer.loc) lines.push(`<b class="bad">${esc(c.killer.name)} is here.</b>`);
  if (n.exit) lines.push('<b class="good">Exit</b>: survivors here with you are rescued.');
  if (id === c.location.lair) lines.push('<b>His lair.</b>');
  if (v) lines.push(`${v} survivor${v > 1 ? 's' : ''}.`);
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
  const t = panicTable(c, id);
  lines.push(`<span class="dim">Panic (d6): ${t.map((x, i) => `${i + 1}${x ? `→${esc(nodeName(c, x))}` : ' freeze'}`).join(' · ')}</span>`);
  if (s.pending?.kind === 'move' && neighbors(c, s.heroine.loc).includes(id)) {
    const f = followers(c, s, s.heroine.loc, id);
    lines.push(`Step here${f ? ` with ${f} survivor${f > 1 ? 's' : ''}` : ''}${isFlooded(c, s, id) ? ' (+1 nerve)' : ''}.`);
  }
  el.innerHTML = `<h5>${esc(n.name)}</h5><p class="fl">${esc(n.flavor)}</p>${lines.map((l) => `<p>${l}</p>`).join('')}`;
  el.hidden = false;
  const left = n.x / 10;
  const top = n.y / 6.4;
  el.style.left = left > 60 ? '' : `calc(${left}% + 6%)`;
  el.style.right = left > 60 ? `calc(${100 - left}% + 6%)` : '';
  el.style.top = `${Math.min(top, 62)}%`;
}

function describeAction(c: Content, s: GameState, a: Action): string {
  const cardName = (uid: number) => {
    const x = s.heroine.hand.find((i) => i.uid === uid);
    return x ? esc(actionDef(c, x.id).name) : 'a card';
  };
  switch (a.type) {
    case 'playCard':
      return `Play <b>${cardName(a.uid)}</b>.`;
    case 'step':
      return `Step to <b>${esc(nodeName(c, a.to))}</b>.`;
    case 'stopMove':
      return '<b>Stop moving</b> here.';
    case 'useItem': {
      const it = activeItems(c, s).find((i) => i.uid === a.uid);
      return it ? `Use <b>${esc(itemDef(c, it.id).name)}</b>.` : 'Use an item.';
    }
    case 'useAbility':
      return `Use <b>${esc(c.heroine.ability.name)}</b>.`;
    case 'buy':
      return `Buy <b>${esc(actionDef(c, a.id).name)}</b>.`;
    case 'endPlanning':
      return '<b>Finish Planning</b>.';
    case 'endAction':
      return '<b>End your Action phase</b>.';
    case 'answer':
      return '<b>Answer</b> the phone.';
    case 'ready':
      return 'Take an item in hand.';
    case 'toggleFollow':
      return 'Change who follows you.';
    case 'aim':
      return a.at === 'killer' ? `Hit <b>${esc(c.killer.name)}</b>.` : `Hit the <b>${esc(c.killer.minions?.plural ?? 'minions')}</b>.`;
    default:
      return `<b>${a.type}</b>.`;
  }
}

function showHint() {
  if (!game || !content || (game.phase !== 'action' && game.phase !== 'planning')) return;
  toast(`${glyph('bulb', 'tip')} ${describeAction(content, game, botAction(content, game))}`, 4000);
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
        audio.play(/High Tide/i.test(f.text) ? 'tide' : /Blackout/i.test(f.text) ? 'blackout' : /ringing/i.test(f.text) ? 'ring' : 'card');
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
  audio.play('dice');
  overlayLocked = true;
  const el = document.createElement('div');
  el.className = 'dicetray';
  el.innerHTML = `<h5>${esc(r.label)} · 5–6 hit · 3–4 partial${r.rerolled ? ' · rerolled' : ''}</h5>${r.parts ? `<div class="why">${esc(diceWhy(r.parts))}</div>` : ''}
    <div class="dice">${r.dice.map((d, i) => `<div class="die ${d >= 5 || r.converted.includes(i) ? 'hit' : d >= 3 ? 'part' : 'miss'}" style="animation-delay:${i * 0.08}s">${pip(d)}</div>`).join('')}</div>
    <div class="res">${r.successes} success${r.successes === 1 ? '' : 'es'}${r.parts ? ` <span class="row-hit">→ card row <b>${r.successes >= 2 ? '2+' : r.successes === 1 ? '1' : '✗'}</b></span>` : ''}<small>click to continue</small></div>`;
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
    if (game) tutorial.sync(game);
  };
  catcher.addEventListener('click', done);
  setTimeout(done, 1500 + r.dice.length * 80);
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
  if (tutorial.active) return;
  if (!prefs.tips || seenTips.has(id)) return;
  seenTips.add(id);
  store(TIPS_KEY, [...seenTips]);
  setTimeout(() => toast(`${glyph('bulb', 'tip')} ${html}`, 9000), 600);
}

function contextualTips() {
  const s = game!;
  const c = content!;
  if (s.pending?.kind === 'roll') showTip('partial', 'A <b>3 or 4</b> is a partial success. Click it to discard 2 cards and turn it into a success.');
  else if (s.pending?.kind === 'reaction') showTip('react', 'Reaction cards are played only now, against one attack. They cost nerve from your next turn.');
  else if (s.phase === 'planning') showTip('plan', 'Buy cards with leftover nerve. Anything you played this turn is locked until after Planning, so you cannot just repeat your best card.');
  else if (s.phase !== 'action') return;
  else if ((s.victims[s.heroine.loc] ?? 0) > 0 && !isExit(c, s.heroine.loc)) showTip('escort', `Survivors here follow you when you move (up to ${escortCap(c)}), but never into his location. Walk them to an <b>exit</b>.`);
  else if (s.killer.loc === s.heroine.loc) showTip('killer', `${esc(c.killer.name)} is here. Attack cards hit him; weapons and lore add damage. When he attacks <b>survivors die first</b>.`);
  else if (s.minions.some((x) => x.loc === s.heroine.loc)) showTip('minions', `${esc(c.killer.minions?.plural ?? 'Minions')} are here. Attack cards can hit them (damage is split between them). If he is here too, you choose: him or them.`);
  else if (s.specials.length) showTip('named', 'A <b>named survivor</b> is on the board. They follow the normal rules with one exception (hover them on the map), and pay an extra reward when rescued.');
  else if (s.killer.bloodlust >= 2) showTip('bloodlust', 'Every death feeds his <b>bloodlust</b>, which sets how far he moves and how hard he hits.');
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
  <p><b>Goal: kill the killer.</b> You win if he dies, you lose if you do, and if you both fall in the same moment, you win. There is no dawn: the night ends when one of you does.</p>
  <h3>A turn has five phases</h3>
  <p><b>1 · Action.</b> Play action cards from your hand, paying their nerve cost. You may also discard any card for +1 nerve. If nerve drops below zero, finish that card and your Action phase ends. Items and your ability can be used here too.<br>
  <b>2 · Planning.</b> Spend leftover nerve in the <b>shop</b> (the face-up tableau of card piles), as many cards as you can afford (hand limit ${HAND_LIMIT}). Its shelves group cards by job: Free, Move, Fight, Search, Defend, Recover, Tricks. Only the three Free basics (Walk, Look Around, Duck) cost 0, and can be taken even at negative nerve. Peek at the board any time with <b>B</b>. <b>Cards you play don't come back to your hand</b>: they go back to their shop piles when Planning ends (so they can't be rebought this Planning). Buy what you'll need next turn, starting with a way to move. Nerve then resets to ${dv.nerve} (${esc(dv.label)}), plus any bonuses.<br>
  <b>3 · Killer.</b> He follows his <b>behavior</b> (pick a target, move, attack), then a <b>Terror</b> card is drawn.<br>
  <b>4 · Panic.</b> If anyone died this turn, survivors in his location roll a die and run along that location's panic table.<br>
  <b>5 · Upkeep.</b> The location's rule and ongoing Events resolve, and you may rearrange your items.</p>
  <h3>Horror Rolls</h3>
  <p>Most cards roll dice. Your <b>Horror Level</b> sets how many (${esc(dv.label)}, horror→dice: ${t.map((d, i) => `${i}→${d}`).join(', ')}). <b>5–6</b> is a success, <b>3–4</b> a partial, <b>1–2</b> nothing. Turn a partial into a success by discarding 2 cards. Then the card's matching row happens: <b>2+</b> means two or more successes, <b>1</b> exactly one, <b>✗</b> none. Failures can hurt.</p>
  <h3>The Terror clock and the Finale</h3>
  <p>The Terror deck holds ${TERROR_DEAL} cards. When it runs out, the <b>Finale</b> is revealed in Upkeep: his behavior changes, his power is revealed, and every Upkeep after that raises his bloodlust.</p>
  <h3>Bloodlust</h3>
  <p>His track sets his <b>move</b> and <b>attack</b>. Every survivor he kills adds 1, and so does horror pushed past the top of your track. Some levels trigger effects, and at bloodlust ${content?.killer.bloodlust.revealAt ?? 4} his special power (with temporary health) is revealed.</p>
  <h3>Survivors</h3>
  <p>When you leave a location, up to 2 survivors there come with you, but they won't walk into his location. Anywhere you stand on an <b>exit</b> during your Action phase, survivors with you are rescued. Each rescue fills a <b>rescue slot</b> and pays its reward; fill them all to unlock your heroine's ability. When he attacks, survivors in his location are attacked <b>before you</b>.</p>
  <h3>Attacking, damage, and final health</h3>
  <p>Attack cards need him in your location, unless a weapon in hand reaches farther. If a <b>heavy</b> attack (Full Swing, Desperate Strike) deals at least 1, your best reaching weapon, each lore item you've found, and focus (Psych Up's “next hit +damage”) add damage. <b>Light</b> attacks (Shove, Swing) are flat. Both of you have a hidden <b>backup token</b> (final-health token, the ?): when health runs out it's revealed. A number means getting back up with that much health, and the current phase ends at once. A blank means death.</p>
  <h3>Named survivors and minions</h3>
  <p>Some survivors have names. They follow all the survivor rules except one printed exception (hover them on the map), come along before the crowd, and pay an extra reward when rescued, or cost you when they die. Some killers also bring <b>minions</b> with their own health, move and attack. If he and his minions are both in reach, an attack hits one or the other: him (weapon and lore add damage) or the minions (weapon adds damage, split between them, leftovers lost). Survivors will follow you into a room with minions, never into his.</p>
  <h3>Reactions</h3>
  <p>When he attacks <b>you</b>, you may play reaction cards against that one attack. They cost nerve from your next turn.</p>
  <h3>Items</h3>
  <p>Two hands: a two-handed item fills both. The backpack holds anything, but items needing hands don't work from it. You may rearrange only when you gain an item and during Upkeep. Search cards draw from the item pile at your location; whatever you don't keep goes back on top, face up.</p>
  <h3>Ties</h3>
  <p>If the rules leave a genuine tie (two equally close targets with as many survivors, two equally short routes, or a named survivor standing with the crowd when he strikes), the tie-break policy decides (Settings): <b>${esc(TIEBREAK[prefs.tiebreak].label)}</b>. ${esc(TIEBREAK[prefs.tiebreak].text)} The Script logs each tie-break.</p>
  <h3>This location: ${content ? esc(content.location.rule.name) : 'Location rules'}</h3><p>${content ? esc(content.location.rule.text) : 'Every location has one signature rule: Intermission (Drive-In), The Tide (Tide Cabins), Rolling Blackouts (Saint Agatha), Whiteout cold (Kettle Peak), Request Line phones (KXRL).'}</p>
  <h3>Keys</h3><p>1–0 play cards · S stop moving · A answer · H hint · Z undo · E end phase · Space continue · R rules</p>`);
}

function showSettings() {
  const o = modal(`<h2>Settings</h2>
    <div class="row"><span>Sound</span><button class="btn small" id="s-sound">${prefs.sound ? 'On' : 'Off'}</button></div>
    <div class="row"><span>Master volume</span><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${prefs.volume}"></div>
    <div class="row"><span>Music &amp; ambience</span><input type="range" id="s-music" min="0" max="1" step="0.05" value="${prefs.music}"></div>
    <div class="row"><span>Film grain</span><input type="range" id="s-grain" min="0" max="1" step="0.05" value="${prefs.grain}"></div>
    <div class="row"><span>Tie-break policy (new games)</span><button class="btn small" id="s-tie" title="${esc(TIEBREAK[prefs.tiebreak].text)}">${esc(TIEBREAK[prefs.tiebreak].label)}</button></div>
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
  o.querySelector('#s-tips')!.addEventListener('click', (e) => {
    prefs.tips = !prefs.tips;
    (e.target as HTMLElement).textContent = prefs.tips ? 'On' : 'Off';
    savePrefs();
  });
  o.querySelector('#s-reset')!.addEventListener('click', () => {
    seenTips.clear();
    store(TIPS_KEY, []);
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
    convertPick = [];
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
  const go = t.closest<HTMLElement>('[data-go]')?.dataset.go;
  if (go) {
    audio.play('click');
    return navigate(go);
  }
  const f = t.closest<HTMLElement>('[data-feature]')?.dataset.feature;
  if (f) {
    feature = FEATURES.find((x) => x.id === f)!;
    pick = { location: feature.location, killer: feature.killer };
    audio.play('click');
    return render();
  }
  const kId = t.closest<HTMLElement>('[data-killer]')?.dataset.killer;
  if (kId) {
    pick.killer = kId;
    audio.play('click');
    return render();
  }
  const lId = t.closest<HTMLElement>('[data-location]')?.dataset.location;
  if (lId) {
    pick.location = lId;
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

function navigate(go: string) {
  switch (go) {
    case 'rules':
      return showRules();
    case 'settings':
      return showSettings();
    case 'continue':
      return continueGame();
    case 'undo':
      return undo();
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
      audio.play('card');
      return render();
    }
    case 'ackCard':
      cardQueue.shift();
      audio.play('card');
      updateOverlay();
      if (game) tutorial.sync(game);
      return;
    case 'start':
    case 'again':
      return startNewGame();
    case 'tutorial':
      document.querySelector('.modal')?.closest('.overlay')?.remove();
      return startTutorial();
    case 'quit':
      tutorial.stop(false);
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
  if (e.key === 'a' || e.key === 'A') return act({ type: 'answer' });
  if (e.key === 'e' || e.key === 'E') {
    if (s.phase === 'action') return act({ type: 'endAction' });
    if (s.phase === 'planning') return act({ type: 'endPlanning' });
    if (s.phase === 'upkeep') return act({ type: 'endUpkeep' });
  }
});

window.addEventListener('resize', syncHandMore);
startGrain(document.getElementById('grain') as HTMLCanvasElement);
setGrainIntensity(prefs.grain);
render();

