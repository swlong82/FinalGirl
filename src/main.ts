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
  rollPool,
  score,
  TERROR_DEAL,
  terrorDef,
  TIEBREAK,
  totalHealth,
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
      return `call ${e.n} survivor${e.n > 1 ? 's' : ''} from next door`;
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
      return `${e.n} damage to the attacker`;
    case 'killerDamage':
      return `${e.n} damage to him`;
    case 'block':
      return e.n >= 99 ? 'cancel the attack' : `block ${e.n}`;
    case 'bloodlust':
      return `bloodlust +${e.n}`;
    case 'killerHeal':
      return `he heals ${e.n}`;
    case 'killerStun':
      return 'he loses his next move';
    case 'killerMove':
      return e.toward === 'heroine' ? `he moves ${e.steps} toward you` : e.toward === 'lair' ? `he moves ${e.steps} toward his lair` : `he moves ${e.steps} toward ${content ? nodeName(content, e.toward) : e.toward}`;
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

function cardHtml(c: Content, s: GameState | null, d: ActionCardDef, attrs: string, extra = '', idx?: number): string {
  const dice = s && d.roll ? `${rollPool(c, s, d)} dice` : d.roll ? 'Horror Roll' : 'no roll';
  const bands = d.roll
    ? `<span class="band"><i class="g">2+</i>${esc(describeEffects(d.great ?? []))}</span><span class="band"><i class="o">1</i>${esc(describeEffects(d.good ?? []))}</span><span class="band"><i class="x">✗</i>${esc(describeEffects(d.fail ?? []))}</span>`
    : `<span class="band"><i class="g">✓</i>${esc(describeEffects(d.always ?? []))}</span>`;
  return `<button class="act fcard ${d.kind} tag-${d.tags[0]}" data-kind="${d.tags[0]}" ${attrs}>
    <span class="n">${esc(d.name)}${idx !== undefined && idx < 10 ? ` <kbd>${(idx + 1) % 10}</kbd>` : ''}</span>
    <span class="cost"><b>${cardCost(c, d)}</b>◉ · ${dice}${d.kind === 'reaction' ? ' · <em>reaction</em>' : ''}</span>
    <span class="bands">${bands}</span>${extra}
  </button>`;
}

// ── Screens ─────────────────────────────────────────────────────────────────
function render() {
  if (screen !== 'game') boardBuilt = false;
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

function renderFeature() {
  const k = KILLERS.find((x) => x.id === pick.killer)!;
  const curated = FEATURES.find((f) => f.location === pick.location && f.killer === pick.killer);
  app.innerHTML = `<div class="screen builder">${backdrop()}
    <h2 class="section">Now Showing</h2>
    <div class="tagline">pick a feature, or build your own double bill</div>
    <div class="shelf">
      ${FEATURES.map(
        (f) => `<button class="shelf-item ${f.location === pick.location && f.killer === pick.killer ? 'sel' : ''}" data-feature="${f.id}" ${f.available ? '' : 'disabled'} title="${esc(f.subtitle)}">
          ${comboPoster(f.location, f.killer)}
          <span class="shelf-label">${esc(f.title.split(':')[0])}</span>
        </button>`,
      ).join('')}
    </div>
    <div class="builder-grid">
      <section>
        <h3 class="col-h">Killer</h3>
        <div class="cards">${KILLERS.map(
          (x) => `<button class="mini ${x.id === pick.killer ? 'sel' : ''}" data-killer="${x.id}" title="${esc(x.behavior.text)}">
            <span class="mini-art">${killerPortrait({ art: x.art })}</span>
            <b>${esc(x.name)}</b><small>${esc(x.epithet)}</small>
            <span class="mini-stats">♥${x.health} · ${esc(x.power.name)}</span>
          </button>`,
        ).join('')}</div>
      </section>
      <section class="preview">
        <h3 class="col-h">${curated ? 'Feature' : 'Your Double Bill'}</h3>
        ${comboPoster(pick.location, pick.killer)}
        <p class="preview-txt">${esc(k.lore[0])}</p>
        <button class="btn small" data-go="shuffle">${glyph('die')} Spin the Reel</button>
      </section>
      <section>
        <h3 class="col-h">Location</h3>
        <div class="cards">${LOCATIONS.map(
          (l) => `<button class="mini loc ${l.id === pick.location ? 'sel' : ''}" data-location="${l.id}">
            <span class="mini-art wide">${mapBackdrop(l, false)}</span>
            <b>${esc(l.name)}</b><small>${esc(l.era)}</small>
            <span class="mini-stats">${l.nodes.length} locations · ${l.nodes.filter((n) => n.exit).length} exits · ${esc(l.rule.name)}</span>
          </button>`,
        ).join('')}</div>
      </section>
    </div>
    <div class="menu" style="flex-direction:row;justify-content:center;margin-top:16px">
      <button class="btn" data-go="title">Back</button>
      <button class="btn primary" data-go="heroine">Choose Heroine</button>
    </div>
  </div>`;
}

function renderHeroine() {
  app.innerHTML = `<div class="screen">${backdrop()}
    <h2 class="section">Who Survives?</h2>
    <div class="tagline">choose your final heroine</div>
    <div class="picker">
      ${HEROINES.map(
        (h) => `<button class="pick ${h.id === heroineId ? 'sel' : ''}" data-heroine="${h.id}">
          ${heroinePortrait(h)}
          <h3>${esc(h.name)}</h3>
          <div class="sub">${esc(h.title)}</div>
          <p>${esc(h.bio)}</p>
          <div class="passive"><b>${esc(h.passive.name)}:</b> ${esc(h.passive.text)}</div>
          <p>♥ ${h.health} · Unlocks <i>${esc(h.ability.name)}</i> after ${h.rescue.slots.length} rescues</p>
          <span class="tag">${h.difficulty}</span>
        </button>`,
      ).join('')}
    </div>
    <div class="combo" style="margin-bottom:14px"><div><div class="sub">Difficulty</div>${(Object.keys(DIFFICULTY) as Difficulty[])
      .map((d) => `<button class="chip ${d === difficulty ? 'sel' : ''}" data-difficulty="${d}" title="${esc(DIFFICULTY[d].text)}">${esc(DIFFICULTY[d].label)}</button>`)
      .join('')}<p class="diff-note">${esc(DIFFICULTY[difficulty].text)}</p></div></div>
    <div class="menu" style="flex-direction:row;justify-content:center">
      <button class="btn" data-go="feature">Back</button>
      <button class="btn primary" data-go="intro">Roll Film</button>
    </div>
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
      <button class="btn primary" data-go="start">Survive the Night</button>
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
  game = saved.state;
  game.fx = [];
  resetUi();
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
    <div class="token killer" id="tok-k"><div class="pin">${killerPortrait({ art: c.killer.art })}</div><span class="tag">${esc(c.killer.name.replace(/^The /, ''))}</span></div>
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
    state = s.round % p === 0 ? 'THIS TURN' : `turn ${Math.ceil(s.round / p) * p}`;
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

  // ── heroine panel ──
  const hearts =
    Array.from({ length: h.maxHealth }, (_, i) => `<svg class="heart ${i < h.health ? '' : 'empty'}" viewBox="0 0 24 22"><path d="M12 21 C-6 9 4 -4 12 5 C20 -4 30 9 12 21 Z"/></svg>`).join('') +
    `<span class="token-heart ${h.token === null ? 'used' : ''}" title="${h.token === null ? 'Final-health token already used: the next time she runs out of health, she dies.' : 'Hidden final-health token: when she runs out of health, it is revealed. A number means she gets back up with that much; blank means she dies.'}">${h.token === null ? '✕' : '?'}</span>`;
  const track = DIFFICULTY[s.difficulty].track;
  const meter = Array.from({ length: MAX_HORROR + 1 }, (_, i) => `<i class="${i === h.horror ? 'cur' : ''} ${i <= h.horror ? 'on' : ''}" title="Horror ${i}: ${track[i]} dice"><b>${track[i]}</b></i>`).join('');
  const base = DIFFICULTY[s.difficulty].nerve;
  const nerve = h.nerve < 0 ? `<span class="debt">${h.nerve} (in debt)</span>` : Array.from({ length: Math.max(h.nerve, base) }, (_, i) => `<i class="${i < h.nerve ? 'on' : ''}"></i>`).join('');
  const slots = c.heroine.rescue.slots
    .map((sl, i) => `<div class="rslot ${i < h.rescued ? 'full' : ''}" title="${esc(sl.text)}"><b>${i + 1}</b><span>${esc(sl.text)}</span></div>`)
    .join('');
  const unlocked = abilityUnlocked(c, s);
  const abilityChk = check(c, s, { type: 'useAbility' });
  const rearrangeOk = (s.rearrange || s.phase === 'upkeep') && !s.pending;
  const itemRow = (it: HeldItem, where: 'hand' | 'pack') => {
    const d = itemDef(c, it.id);
    const uses = it.usesLeft !== undefined ? ` <span class="k">×${it.usesLeft}</span>` : '';
    const hands = d.hands ? `<span class="k">${d.hands === 2 ? '2 hands' : '1 hand'}</span>` : '<span class="k">no hands</span>';
    let btns = '';
    const active = where === 'hand' || d.hands === 0;
    if (d.use && active) {
      const chk = check(c, s, { type: 'useItem', uid: it.uid });
      btns += `<button class="btn small" data-item="${it.uid}" ${chk.ok ? '' : `disabled title="${esc(chk.why ?? '')}"`}>${esc(d.use.label)}</button>`;
    }
    if (where === 'hand' && rearrangeOk) btns += `<button class="btn small ghost" data-stow="${it.uid}" title="Put in the backpack">Stow</button>`;
    if (where === 'pack' && d.hands > 0 && rearrangeOk) btns += `<button class="btn small" data-ready="${it.uid}">Take in hand</button>`;
    return `<div class="item ${d.kind} ${where} ${active ? '' : 'inactive'}" title="${esc(d.lore ?? d.text)}">${itemIcon(d)}<div class="grow"><div class="name">${esc(d.name)}${uses} ${hands}</div><div class="txt">${esc(d.text)}</div></div><div class="acts">${btns}</div></div>`;
  };
  const used = handsUsed(c, h.items);
  const handItems = h.items.map((it) => itemRow(it, 'hand')).join('') + (used < HAND_SLOTS ? Array(HAND_SLOTS - used).fill('<div class="item slot-empty">Empty hand</div>').join('') : '');
  const packRows = h.pack.map((it) => itemRow(it, 'pack')).join('');
  document.getElementById('heroine-panel')!.innerHTML = `
    <div class="who">${heroinePortrait(c.heroine, { grim: h.horror / 6, hurt: 1 - totalHealth(s) / (h.maxHealth + 1) })}
      <div><h3>${esc(c.heroine.name)}</h3><div class="sub">${esc(c.heroine.title)}</div><div class="hearts" title="Health">${hearts}</div></div>
    </div>
    <h4>Horror <span class="h4-note">${horrorDice(s)} dice per roll</span></h4>
    <div class="meter htrack" title="Your Horror Level sets how many dice you roll. 5–6 succeeds, 3–4 is a partial.">${meter}</div>
    <h4>Nerve <span class="h4-note">resets to ${base} in Planning</span></h4>
    <div class="nerve" title="Pay for cards. Discard a card for +1. Below zero ends your turn.">${nerve}</div>
    <h4>Rescues <span class="h4-note">${h.rescued} saved · ${h.rescued >= c.heroine.rescue.slots.length ? `repeat: ${esc(c.heroine.rescue.repeat.text)}` : 'fill all to unlock'}</span></h4>
    <div class="rescue">${slots}</div>
    <div class="ability ${unlocked ? 'on' : ''}"><b>${esc(c.heroine.ability.name)}</b> ${esc(c.heroine.ability.text)}
      ${unlocked ? `<button class="btn small" data-act="useAbility" ${abilityChk.ok ? '' : `disabled title="${esc(abilityChk.why ?? '')}"`}>Use</button>` : '<span class="lock">locked</span>'}</div>
    ${h.resolve ? `<div class="stats"><span>Resolve <b>+${h.resolve}</b> attack dice</span></div>` : ''}
    <h4>Passive</h4>
    <div class="passive-box"><b>${esc(c.heroine.passive.name)}.</b> ${esc(c.heroine.passive.text)}</div>
    <h4>In hand <span class="h4-note">${used}/${HAND_SLOTS} hands${rearrangeOk ? ' · <b class="ok">rearrange now</b>' : ''}</span></h4>
    <div class="items">${handItems}</div>
    <h4 class="pack-h">${glyph('pack')} Backpack <span class="h4-note">${h.pack.length} · items needing hands don't work here</span></h4>
    <div class="items pack">${packRows || '<div class="empty-note">Nothing stored yet.</div>'}</div>`;

  // ── killer panel ──
  const lv = c.killer.bloodlust.levels;
  const blTrack = lv
    .map((l, i) => `<i class="${i <= k.bloodlust ? 'on' : ''} ${i === k.bloodlust ? 'cur' : ''} ${i === c.killer.bloodlust.revealAt ? 'mark' : ''}" title="Bloodlust ${i}${l.name ? `: ${esc(l.name)}` : ''}. Move ${l.move}, attack ${l.attack}.${l.text ? ' ' + esc(l.text) : ''}"><b>${l.move}/${l.attack}</b></i>`)
    .join('');
  const powerBox =
    k.power === 'hidden'
      ? `<div class="power hidden"><b>Power: hidden</b> Revealed at bloodlust ${c.killer.bloodlust.revealAt}, or in the Finale.</div>`
      : k.power === 'active'
        ? `<div class="power on"><b>${esc(c.killer.power.name)}</b> ${esc(c.killer.power.text)} <span class="k">${k.powerHealth} temp health left</span></div>`
        : `<div class="power spent"><b>${esc(c.killer.power.name)}</b> broken.</div>`;
  const beh = k.finale ? c.killer.finale.behavior : c.killer.behavior;
  const target = predictTarget(c, s);
  document.getElementById('killer-panel')!.innerHTML = `
    <div class="killer-head"><div>${killerPortrait({ finale: k.finale, art: c.killer.art })}</div>
      <div><h3>${esc(c.killer.name)}</h3><div class="sub" style="font-size:11px;color:var(--muted)">${esc(c.killer.epithet)}</div></div></div>
    <h4>Health ${k.health}/${k.maxHealth} <span class="token-heart small ${k.token === null ? 'used' : ''}" title="${k.token === null ? 'His final-health token is used. Next time he hits zero, he is dead.' : 'Hidden final-health token: when he runs out, it is revealed. He may get back up.'}">${k.token === null ? '✕' : '?'}</span>${k.finale ? ` · <span style="color:var(--blood)">${esc(c.killer.finale.name)}</span>` : ''}</h4>
    <div class="hpbar"><div style="width:${(k.health / Math.max(1, k.maxHealth)) * 100}%"></div></div>
    ${k.power === 'active' ? `<div class="hpbar temp"><div style="width:${(k.powerHealth / Math.max(1, c.killer.power.health)) * 100}%"></div></div>` : ''}
    <h4>Bloodlust ${k.bloodlust}${bloodlustLevel(c, s).name ? ` · ${esc(bloodlustLevel(c, s).name!)}` : ''} <span class="h4-note">move/attack</span></h4>
    <div class="meter bl">${blTrack}</div>
    <div class="stats" style="margin-top:8px">
      <span>Move <b>${killerMoveValue(c, s)}</b></span><span>Attack <b>${killerAttack(c, s)}</b></span>
      ${k.stunned ? '<span style="color:var(--good)">STUNNED</span>' : ''}
    </div>
    <h4>${k.finale ? 'Finale behavior' : 'Behavior'}</h4>
    <div class="passive-box behavior">${esc(beh.text)}<br><small>Next: ${esc(target === h.loc ? 'you' : nodeName(c, target))} · he is at ${esc(nodeName(c, k.loc))}</small></div>
    ${powerBox}
    <div class="quote">${esc(lastQuote)}</div>
    <h4>Weakness (${loreBonus(c, s)}/${c.killer.items.length})</h4>
    <div class="passive-box">${esc(c.killer.weakness.text)}</div>
    ${c.killer.minions ? `<h4>${esc(c.killer.minions.plural)} <span class="h4-note">${s.minions.length}/${c.killer.minions.max} on the board</span></h4><div class="passive-box">${esc(c.killer.minions.text)}</div>` : ''}
    ${s.specials.length || s.specialsGone.length ? `<h4>Named survivors</h4><div class="passive-box">${[...s.specials.map((x) => `<b>${esc(specialDef(c, x.id).name)}</b> at ${esc(nodeName(c, x.at))}. ${esc(specialDef(c, x.id).text)}`), ...s.specialsGone.map((x) => `<b>${esc(specialDef(c, x.id).name)}</b>: ${x.how}.`)].join('<br>')}</div>` : ''}
    <h4>Ongoing events</h4>
    <div class="passive-box">${s.events.map((id) => `<b>${esc(eventDef(c, id).name)}.</b> ${esc(eventSummary(c, id))}`).join('<br>') || 'None.'}</div>
    <div class="stats" style="margin-top:8px"><span>Saved <b style="color:var(--good)">${s.saved}</b></span><span>Slain <b style="color:var(--blood)">${s.slain}</b></span><span>Still out there <b>${s.victimPool}</b></span></div>`;

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
    const bring = here ? `· bring <span class="bring">${Array.from({ length: cap + 1 }, (_, n) => `<button class="btn tiny ${h.bring === n ? 'sel' : ''}" data-bring="${n}">${n}</button>`).join('')}</span> of ${here} survivor${here > 1 ? 's' : ''}` : '';
    hint.innerHTML = `<b style="color:var(--gold)">${p.left}</b> step${p.left > 1 ? 's' : ''} left: click a glowing location ${bring} <button class="btn tiny" data-act="stopMove">Stop (S)</button>`;
  } else if (s.phase === 'action') hint.innerHTML = 'Play a card from your hand. Hover a location for details.';
  else hint.innerHTML = '';
}

function updateBottom() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const cards = h.hand
    .map((card, i) => {
      const d = actionDef(c, card.id);
      const chk = check(c, s, { type: 'playCard', uid: card.uid });
      const disc = s.phase === 'action' && !s.pending && h.nerve >= 0 ? `<span class="disc" data-discard="${card.uid}" title="Discard for +1 nerve">+1◉</span>` : '';
      const warn = chk.ok && h.nerve - chk.cost < 0 ? ' · ends your turn' : '';
      return cardHtml(c, s, d, `data-card="${card.uid}" ${chk.ok ? '' : 'disabled'} title="${esc((chk.why ? chk.why + '. ' : '') + d.flavor + warn)}"`, disc, i);
    })
    .join('');
  const answer =
    c.location.rule.kind === 'calls' && s.phase === 'action'
      ? (() => {
          const chk = check(c, s, { type: 'answer' });
          return `<button class="act answer" data-act="answer" data-kind="answer" ${chk.ok ? '' : 'disabled'} title="${esc(chk.why ?? 'Answer the ringing phone')}"><span class="n">Answer <kbd>A</kbd></span><span class="c"><b>${chk.cost}◉</b> ${esc(s.env.ringing ? `ringing at ${nodeName(c, s.env.ringing)}` : 'no phone ringing')}</span></button>`;
        })()
      : '';
  const pile = `<div class="pile" title="Your hand holds up to ${HAND_LIMIT} action cards"><span><b>${h.hand.length}</b>/${HAND_LIMIT} cards</span><span><b>${s.discard.length}</b> used this turn</span></div>`;
  let main = '';
  if (s.phase === 'action')
    main = `<button class="endturn" data-act="endAction" ${check(c, s, { type: 'endAction' }).ok ? '' : 'disabled'}>End Action <small style="display:block;font-size:10px;opacity:.7">${h.nerve} nerve → Planning · E</small></button>`;
  else if (s.phase === 'planning')
    main = `<button class="endturn" data-go="openPlan">Tableau</button><button class="endturn" data-act="endPlanning">Done <small style="display:block;font-size:10px;opacity:.7">his turn · E</small></button>`;
  else if (s.phase === 'upkeep')
    main = `<button class="endturn" data-act="endUpkeep" ${check(c, s, { type: 'endUpkeep' }).ok ? '' : 'disabled'}>Next turn <small style="display:block;font-size:10px;opacity:.7">E</small></button>`;
  else main = `<button class="endturn" disabled>His turn…</button>`;
  document.getElementById('bottombar')!.innerHTML = `
    <div><div class="actions hand-row">${pile}${cards}${answer}</div></div>
    <div class="endcol"><div class="endtools"><button class="btn small" data-go="undo" ${canUndo() ? '' : 'disabled'} title="Undo (Z): not after dice rolls or draws">${glyph('undo')} Undo</button><button class="btn small" data-go="hint" ${s.phase === 'action' || s.phase === 'planning' ? '' : 'disabled'} title="What would a survivor do? (H)">${glyph('bulb')} Hint</button></div>
    ${main}</div>`;
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
    root.innerHTML = `<div class="overlay"><div class="draft react-ov aim-ov">
      <div class="kind">Choose a target</div>
      <h2>${p.base} damage: ${esc(c.killer.name)}, or them?</h2>
      <p>You can hit <b>${esc(c.killer.name)}</b> (your weapon and lore add to it), or the <b>${mins.length} ${esc(mins.length > 1 ? def.plural : def.name.replace(/^(A|An) /, ''))}</b> here (your weapon adds to it and the damage is split between them; any left over is lost). Not both.</p>
      <div class="row-btns" style="justify-content:center"><button class="btn primary" data-aim="killer">Hit ${esc(c.killer.name)}</button><button class="btn" data-aim="minions">Hit the ${esc(def.plural)} (health ${mins.map((m) => m.health).join(', ')})</button></div>
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
      <h2>${esc(c.killer.name)} attacks: ${dmg} damage</h2>
      <p>You have <b>${totalHealth(s)}</b> health (including your hidden token). A reaction card costs nerve from next turn and protects against this one attack.</p>
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
  if (s.phase === 'planning' && planHidden !== s.round) {
    const piles = c.actions
      .map((d) => {
        const chk = check(c, s, { type: 'buy', id: d.id });
        const left = s.tableau[d.id] ?? 0;
        const usedNow = s.discard.filter((x) => x === d.id).length;
        const status = left > 0 ? `${left} left` : usedNow ? 'used this turn' : 'none left';
        return cardHtml(c, s, d, `data-buy="${d.id}" ${chk.ok ? '' : `disabled title="${esc(chk.why ?? '')}"`}`, `<span class="pilecount ${left ? '' : 'out'}">${status}</span>`);
      })
      .join('');
    root.innerHTML = `<div class="overlay draft-ov"><div class="draft tableau">
      <div class="kind">Turn ${s.round} · Planning</div>
      <h2>The tableau</h2>
      <p>Spend leftover nerve (<b>${h.nerve}</b>) on cards; 0-cost cards are free. Hand <b>${h.hand.length}/${HAND_LIMIT}</b>. Cards you used this turn come back after Planning. Then your nerve resets to ${DIFFICULTY[s.difficulty].nerve}.</p>
      <div class="draft-row">${piles}</div>
      <div class="row-btns"><button class="btn" data-go="hidePlan">Look at the board</button><button class="btn primary" data-act="endPlanning">Done: his turn <small>(E)</small></button></div>
    </div></div>`;
    return;
  }
  if (s.phase === 'upkeep' && upkeepHidden !== s.round) {
    const lines = s.log.slice(killerLogStart).map((l) => `<li class="${l.tone ?? ''}">${esc(l.text)}</li>`).join('');
    root.innerHTML = `<div class="overlay"><div class="killerturn">
      <h2>${esc(c.killer.name)}</h2>
      <ul>${lines || '<li>He waits in the dark.</li>'}</ul>
      <p class="dim">Upkeep: you may rearrange items between your hands and backpack now.</p>
      <div class="row-btns"><button class="btn" data-go="hideUpkeep">Rearrange items</button><button class="btn primary" data-act="endUpkeep">Next turn <small>(space)</small></button></div>
    </div></div>`;
    return;
  }
  if (s.phase === 'over') {
    const r = rating(s);
    const title = s.outcome === 'slain' ? 'THE END' : 'CUT TO BLACK';
    const sub = s.outcome === 'slain' ? `${c.heroine.name} stands over what is left of ${c.killer.name}.` : `${c.heroine.name} does not make it to the credits.`;
    const lore = c.killer.items.filter((i) => s.foundLore.includes(i.id));
    root.innerHTML = `<div class="overlay"><div class="modal ending" style="text-align:center">
      <div class="end-poster">${comboPoster(c.location.id, c.killer.id)}</div>
      <h2 style="font-size:64px;color:${s.outcome === 'died' ? 'var(--blood)' : '#fff3e0'}">${title}</h2>
      <p>${esc(sub)}</p>
      <div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
      <p><i>${esc(r.blurb)}</i></p>
      <table><tr><td>Survivors saved</td><td>${s.saved}</td></tr><tr><td>Survivors slain</td><td>${s.slain}</td></tr><tr><td>Turns</td><td>${s.round}</td></tr><tr><td>Reached the Finale</td><td>${s.killer.finale ? 'yes' : 'no'}</td></tr><tr><td>Score</td><td>${score(s)}</td></tr></table>
      ${lore.length ? `<div class="lore-list">${lore.map((l) => `<p><b>${esc(l.name)}.</b> ${esc(l.lore ?? '')}</p>`).join('')}</div>` : ''}
      <div class="menu" style="margin:16px auto 0;flex-direction:row;justify-content:center;width:auto">
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
  if (a.type === 'endPlanning') killerLogStart = game.log.length;
  const prev = game;
  const next = dispatch(content, game, a);
  if (next === game) return;
  game = next;
  if (a.type !== 'convert') {
    convertDie = null;
    convertPick = [];
  }
  if (a.type === 'keep') searchPicks = [];
  swapFor = null;
  const undoable = (prev.phase === 'action' || prev.phase === 'planning') && prev.phase === game.phase && !prev.pending;
  if (undoable) history.push(prev);
  else history = [];
  persist();
  runFx(game);
  updateGame();
  contextualTips();
}

let endWarned = -1;
function confirmEnd(): boolean {
  if (endWarned === game!.round) return true;
  endWarned = game!.round;
  toast(`You still have ${game!.heroine.nerve} nerve. You can spend it in Planning. Press End Action again to continue.`);
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
  el.innerHTML = `<h5>${esc(r.label)} · 5–6 hit · 3–4 partial${r.rerolled ? ' · rerolled' : ''}</h5>
    <div class="dice">${r.dice.map((d, i) => `<div class="die ${d >= 5 || r.converted.includes(i) ? 'hit' : d >= 3 ? 'part' : 'miss'}" style="animation-delay:${i * 0.08}s">${pip(d)}</div>`).join('')}</div>
    <div class="res">${r.successes} success${r.successes === 1 ? '' : 'es'}<small>click to continue</small></div>`;
  document.body.appendChild(el);
  const done = () => {
    if (!el.isConnected) return;
    el.remove();
    overlayLocked = false;
    updateOverlay();
    if (game) tutorial.sync(game);
  };
  el.addEventListener('click', done);
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
function toast(html: string, ms = 5000) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${html}</span><button class="btn small">OK</button>`;
  t.querySelector('button')!.addEventListener('click', () => t.remove());
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), ms);
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
  const t = DIFFICULTY.standard.track;
  modal(`<h2>How to Play</h2>
  <p><button class="btn small primary" data-go="tutorial">▶ Play the guided first night</button></p>
  <p><b>Goal: kill the killer.</b> You win if he dies, you lose if you do, and if you both fall in the same moment, you win. There is no dawn: the night ends when one of you does.</p>
  <h3>A turn has five phases</h3>
  <p><b>1 · Action.</b> Play action cards from your hand, paying their nerve cost. You may also discard any card for +1 nerve. If nerve drops below zero, finish that card and your Action phase ends. Items and your ability can be used here too.<br>
  <b>2 · Planning.</b> Spend leftover nerve buying cards from the face-up <b>tableau</b> (hand limit ${HAND_LIMIT}; 0-cost cards are always free). Cards you played or discarded this turn are locked until Planning ends, then return to their piles. Nerve resets to ${DIFFICULTY.standard.nerve}.<br>
  <b>3 · Killer.</b> He follows his <b>behavior</b> (pick a target, move, attack), then a <b>Terror</b> card is drawn.<br>
  <b>4 · Panic.</b> If anyone died this turn, survivors in his location roll a die and run along that location's panic table.<br>
  <b>5 · Upkeep.</b> The location's rule and ongoing Events resolve, and you may rearrange your items.</p>
  <h3>Horror Rolls</h3>
  <p>Most cards roll dice. Your <b>Horror Level</b> sets how many (Midnight Show: ${t.map((d, i) => `${i}→${d}`).join(', ')}). <b>5–6</b> is a success, <b>3–4</b> a partial, <b>1–2</b> nothing. Turn a partial into a success by discarding 2 cards. Then resolve the card's band: <b>2+</b> successes, exactly <b>1</b>, or <b>✗</b> failure. Failures can hurt.</p>
  <h3>The Terror clock and the Finale</h3>
  <p>The Terror deck holds ${TERROR_DEAL} cards. When it runs out, the <b>Finale</b> is revealed in Upkeep: his behavior changes, his power is revealed, and every Upkeep after that raises his bloodlust.</p>
  <h3>Bloodlust</h3>
  <p>His track sets his <b>move</b> and <b>attack</b>. Every survivor he kills adds 1, and so does horror pushed past the top of your track. Some levels trigger effects, and at bloodlust ${content?.killer.bloodlust.revealAt ?? 4} his special power (with temporary health) is revealed.</p>
  <h3>Survivors</h3>
  <p>When you leave a location, up to 2 survivors there come with you, but they won't walk into his location. Anywhere you stand on an <b>exit</b> during your Action phase, survivors with you are rescued. Each rescue fills a <b>rescue slot</b> and pays its reward; fill them all to unlock your heroine's ability. When he attacks, survivors in his location are attacked <b>before you</b>.</p>
  <h3>Attacking, damage, and final health</h3>
  <p>Attack cards need him in your location, unless a weapon in hand reaches farther. If an attack deals at least 1, your best reaching weapon and each lore item you've found add damage. Both of you have a hidden <b>final-health token</b>: when health runs out it's revealed. A number means getting back up with that much health, and the current phase ends at once. A blank means death.</p>
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
  const disc = d('discard');
  if (disc) return act({ type: 'discardForNerve', uid: +disc }), true;
  const node = d('node');
  if (node && node !== game.heroine.loc) return act({ type: 'step', to: node }), true;
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
  const n = (e.target as HTMLElement).closest<HTMLElement>('[data-node]')?.dataset.node;
  if (n) inspectNode(n);
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

startGrain(document.getElementById('grain') as HTMLCanvasElement);
setGrainIntensity(prefs.grain);
render();

