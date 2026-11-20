import './ui/style.css';
import { audio } from './audio/audio';
import { heroinePortrait, heroineToken, icon, killerPortrait, mapBackdrop, pip, victimIcon } from './art/art';
import { eventStill, itemIcon, posterFrame } from './art/scenes';
import { startParticles } from './ui/particles';
import { botAction } from './engine/bot';
import { glyph } from './ui/glyphs';
import { TUTORIAL, tutorialGame } from './engine/tutorial';
import { Tutorial } from './ui/tutorial';
import { buildContent, FEATURES, HEROINES, KILLERS, LOCATIONS, type Feature } from './content/registry';
import {
  check,
  COST,
  actionDef,
  junkCount,
  handRoom,
  ACTION_HAND,
  NERVE_CAP,
  NOISE_EVERY,
  PANIC_AT,
  hasTag,
  isFlooded,
  DIFFICULTY,
  DEFAULT_ESCORT,
  dispatch,
  eventDef,
  fightDice,
  horrorTier,
  instinctDef,
  itemDef,
  killerAttackDice,
  killerSpeed,
  moveCost,
  neighbors,
  newGame,
  nodeName,
  rating,
  score,
  searchDice,
  threshold,
  BASE_DICE,
  weaknessFound,
} from './engine/rules';
import type { Action, ActionCardDef, Content, Difficulty, Effect, GameState } from './engine/types';
import { startGrain, setGrainIntensity } from './ui/grain';

// ── App state ───────────────────────────────────────────────────────────────
type Screen = 'title' | 'feature' | 'heroine' | 'intro' | 'game' | 'stats';
const SAVE_KEY = 'lastlight.save.v1';
const PREFS_KEY = 'lastlight.prefs.v1';
const TIPS_KEY = 'lastlight.tips.v1';
const STATS_KEY = 'lastlight.stats.v1';
const TUT_KEY = 'lastlight.tutorial.v1';
const tutorial = new Tutorial((finished) => {
  store(TUT_KEY, true);
  if (finished) toast('Tutorial complete. The night is yours — press <b>H</b> any time for a hint.', 6000);
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
}

const app = document.getElementById('app')!;
let screen: Screen = 'title';
let feature: Feature = FEATURES[0];
let pick = { location: FEATURES[0].location, killer: FEATURES[0].killer };
let difficulty: Difficulty = 'standard';
let heroineId = HEROINES[0].id;
let history: GameState[] = [];
const cardQueue: string[] = [];
let content: Content | null = null;
let game: GameState | null = null;
let killerLogStart = 0;
let lastQuote = '';
let overlayLocked = false; // during dice animation
let boardBuilt = false;

const prefs: Prefs = { sound: true, volume: 0.8, music: 0.7, grain: 0.6, tips: true, ...load(PREFS_KEY, {}) };
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

function renderTitle() {
  const saved = load<{ ids: [string, string, string]; state: GameState } | null>(SAVE_KEY, null);
  setMood(0, false, false);
  app.innerHTML = `<div class="screen">${backdrop()}
    <h1 class="logo flicker">LAST <span>LIGHT</span></h1>
    <div class="tagline">a solo slasher survival game</div>
    <div class="menu">
      ${saved && !saved.state.outcome ? `<button class="btn primary" data-go="continue">Continue — Round ${saved.state.round}</button>` : ''}
      ${!load(TUT_KEY, false) ? '<button class="btn primary tut-cta" data-go="tutorial">First Night — Guided Tutorial</button>' : ''}
      <button class="btn ${(saved && !saved.state.outcome) || !load(TUT_KEY, false) ? '' : 'primary'}" data-go="feature">New Night</button>
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
    <div class="tagline">pick a feature — or build your own double bill</div>
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
          (x) => `<button class="mini ${x.id === pick.killer ? 'sel' : ''}" data-killer="${x.id}">
            <span class="mini-art">${killerPortrait({ art: x.art })}</span>
            <b>${esc(x.name)}</b><small>${esc(x.epithet)}</small>
            <span class="mini-stats">♥${x.health} · ⛨${x.armor} · ${x.attackDice}d</span>
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
            <span class="mini-stats">${l.nodes.length} locations · ${l.events.length} events</span>
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
          <p>♥ ${h.health} · Signature: <i>${esc(h.signature.name)}</i></p>
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
function startNewGame() {
  content = buildContent(pick.location, pick.killer, heroineId);
  const seed = (Math.random() * 2 ** 31) | 0;
  game = newGame(content, seed, difficulty);
  history = [];
  recorded = false;
  lastFinale = false;
  cardQueue.length = 0;
  screen = 'game';
  persist();
  render();
  showTip('start', 'Each round: an event card, then you spend <b>nerve</b> on actions, then the killer moves. Survive until dawn — or end him.');
}

function startTutorial() {
  pick = { location: TUTORIAL.location, killer: TUTORIAL.killer };
  heroineId = TUTORIAL.heroine;
  difficulty = 'story';
  content = buildContent(pick.location, pick.killer, heroineId);
  game = tutorialGame(content);
  history = [];
  recorded = false;
  lastFinale = false;
  cardQueue.length = 0;
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
  const saved = load<{ ids: [string, string, string]; state: GameState } | null>(SAVE_KEY, null);
  if (!saved) return;
  const [l, k, h] = saved.ids;
  pick = { location: l, killer: k };
  heroineId = h;
  content = buildContent(l, k, h);
  game = saved.state;
  game.fx = [];
  history = [];
  recorded = false;
  lastFinale = false;
  screen = 'game';
  render();
}

function renderGame() {
  if (!game || !content) return;
  if (!boardBuilt) {
    app.innerHTML = `<div class="game" id="game">
      <header class="topbar"></header>
      <aside class="side left"><div class="panel" id="heroine-panel"></div></aside>
      <main class="stage"><div class="board" id="board"></div></main>
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
        (n) => `<button class="node ${n.id === loc.exit ? 'exit' : ''} ${n.id === loc.lair ? 'lair' : ''}" data-node="${n.id}" style="left:${n.x / 10}%;top:${n.y / 6.4}%" title="${esc(n.name)} — ${esc(n.flavor)}">
        <div class="disc">${icon(n.icon)}<div class="badges"></div></div>
        <div class="label">${esc(n.name)}</div>
        <div class="vics"></div>
      </button>`,
      )
      .join('')}
    <div class="token heroine" id="tok-h"><div class="pin">${heroineToken(c.heroine)}</div><span class="tag">${esc(c.heroine.name.split(' ')[0])}</span></div>
    <canvas class="particles" id="particles"></canvas>
    <div class="token-esc" id="tok-esc"></div>
    <div class="token killer" id="tok-k"><div class="pin">${killerPortrait({ art: c.killer.art })}</div><span class="tag">${esc(c.killer.name.replace(/^The /, ''))}</span></div>
    <div class="board-hint" id="board-hint"></div>
    <button class="mapkey-btn" data-go="mapkey">${glyph('key')} Map key</button>
    <div class="inspect" id="inspect" hidden></div>`;
}

let lastFinale = false;
let recorded = false;
let draftClosedRound = -1;

function renderStats() {
  const stats = load<GameRecord[]>(STATS_KEY, []);
  const wins = stats.filter((r) => r.outcome !== 'died').length;
  const best = stats.reduce((m, r) => Math.max(m, r.score), 0);
  const byHeroine = HEROINES.map((h) => {
    const rs = stats.filter((r) => r.heroine === h.id);
    const w = rs.filter((r) => r.outcome !== 'died').length;
    return `<tr><td>${esc(h.name)}</td><td>${rs.length}</td><td>${w}</td><td>${rs.length ? Math.round((w / rs.length) * 100) : 0}%</td><td>${rs.reduce((m, r) => Math.max(m, r.score), 0)}</td></tr>`;
  }).join('');
  const byKiller = KILLERS.map((k) => {
    const rs = stats.filter((r) => r.killer === k.id);
    return `<tr><td>${esc(k.name)}</td><td>${rs.length}</td><td>${rs.filter((r) => r.outcome === 'slain').length}</td><td>${rs.filter((r) => r.outcome === 'survived').length}</td><td>${rs.filter((r) => r.outcome === 'died').length}</td></tr>`;
  }).join('');
  const recent = stats.slice(-8).reverse().map((r) => `<tr><td>${new Date(r.at).toLocaleDateString()}</td><td>${esc(HEROINES.find((h) => h.id === r.heroine)?.name ?? r.heroine)}</td><td>${esc(KILLERS.find((k) => k.id === r.killer)?.name ?? r.killer)}</td><td>${esc(DIFFICULTY[r.difficulty]?.label ?? '')}</td><td>${r.outcome}</td><td>${r.score}</td></tr>`).join('');
  app.innerHTML = `<div class="screen">${backdrop()}
    <h2 class="section">Box Office</h2>
    <div class="tagline">${stats.length} nights · ${wins} survived · best score ${best}</div>
    <div class="modal" style="max-height:none">
      ${stats.length ? `<h3>By heroine</h3><table><tr><th>Heroine</th><th>Played</th><th>Lived</th><th>Rate</th><th>Best</th></tr>${byHeroine}</table>
      <h3>By killer</h3><table><tr><th>Killer</th><th>Played</th><th>Slain</th><th>Survived</th><th>Died</th></tr>${byKiller}</table>
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
    state = s.round % p === 0 ? 'NOW' : `next R${Math.ceil(s.round / p) * p}`;
  }
  const hot = s.env.tideHigh || s.env.dark || !!s.env.ringing || s.env.cold >= 2;
  return `<button class="rulechip ${hot ? 'hot' : ''}" data-go="rules" title="${esc(r.text)}"><b>${esc(r.name)}</b> · ${esc(state)}</button>`;
}

function updateGame() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const k = s.killer;
  const tier = horrorTier(h.horror);
  const killerHere = k.loc === h.loc;
  const killerNear = killerHere || neighbors(c, h.loc).includes(k.loc);
  setMood(h.horror, k.finale, killerNear);

  // backdrop swap on finale
  if (k.finale !== lastFinale) {
    lastFinale = k.finale;
    const bd = document.querySelector('#board .bd');
    if (bd) bd.innerHTML = mapBackdrop(c.location, k.finale);
    document.querySelector('#tok-k .pin')!.innerHTML = killerPortrait({ finale: k.finale, art: c.killer.art });
  }

  // top bar
  const clock = Array.from({ length: s.dawnAt }, (_, i) => {
    const r = i + 1;
    const cls = r < s.round ? 'past' : r === s.round ? 'now' : '';
    const fin = r >= s.dawnAt - 3 ? 'finale' : '';
    return `<i class="${cls} ${fin}" title="Round ${r}${r >= s.dawnAt - 3 ? ' — the Last Reel' : ''}"></i>`;
  }).join('');
  document.querySelector('.topbar')!.innerHTML = `
    <div class="title">LAST <span>LIGHT</span></div>
    ${ruleChip()}
    <div class="clock" title="Rounds until dawn">${clock}<i class="dawn" title="Dawn"></i><span style="margin-left:8px">Round ${s.round}/${s.dawnAt}</span></div>
    <div class="tools">
      <button class="btn small" data-go="rules" title="Rules (R)">Rules</button>
      <button class="btn small" data-go="settings" title="Settings">${prefs.sound ? '♪' : '✕'} Sound</button>
      <button class="btn small" data-go="quit">Menu</button>
    </div>`;

  // heroine panel
  const hearts = Array.from({ length: h.maxHealth }, (_, i) => `<svg class="heart ${i < h.health ? '' : 'empty'}" viewBox="0 0 24 22"><path d="M12 21 C-6 9 4 -4 12 5 C20 -4 30 9 12 21 Z"/></svg>`).join('');
  const meter = Array.from({ length: 6 }, (_, i) => `<i class="${i < h.horror ? 'on' : ''}"></i>`).join('');
  const nerve = Array.from({ length: NERVE_CAP }, (_, i) => `<i class="${i < h.nerve ? 'on' : ''}"></i>`).join('');
  const noiseLeft = NOISE_EVERY - (h.spentThisRound % NOISE_EVERY);
  const noise = Array.from({ length: NOISE_EVERY }, (_, i) => `<i class="${i < h.spentThisRound % NOISE_EVERY ? 'on' : ''}"></i>`).join('');
  const items = h.items.length
    ? h.items
        .map((it) => {
          const d = itemDef(c, it.id);
          const chk = check(c, s, { type: 'useItem', uid: it.uid });
          return `<div class="item ${d.kind}" title="${esc(d.lore ?? d.text)}">
            ${itemIcon(d)}<div class="grow"><div class="name">${esc(d.name)}${it.usesLeft !== undefined ? ` <span class="k">×${it.usesLeft}</span>` : ''}</div><div class="txt">${esc(d.text)}</div></div>
            <div class="acts">${d.use ? `<button class="btn small" data-item="${it.uid}" ${chk.ok ? '' : `disabled title="${esc(chk.why ?? '')}"`}>${esc(d.use.label)}</button>` : ''}
            <button class="btn small" data-drop="${it.uid}" title="Drop">✕</button></div>
          </div>`;
        })
        .join('')
    : '<div class="empty-note">Empty-handed. Search to find something.</div>';
  document.getElementById('heroine-panel')!.innerHTML = `
    <div class="who">${heroinePortrait(c.heroine, { grim: h.horror / 6, hurt: 1 - h.health / h.maxHealth })}
      <div><h3>${esc(c.heroine.name)}</h3><div class="sub">${esc(c.heroine.title)}</div><div class="hearts" title="Health">${hearts}</div></div>
    </div>
    <h4>Horror</h4>
    <div class="meter" title="Horror lowers nerve and makes rolls harder">${meter}</div>
    <div class="tierline"><b>${tier.name}</b><span>+${tier.nerve} nerve/round · dice ${tier.threshold}+</span></div>
    <h4>Nerve <span class="h4-note">${h.nerve}/${NERVE_CAP} banked</span></h4>
    <div class="nerve" title="Nerve carries over between rounds (max ${NERVE_CAP}). You gain +${tier.nerve} each round.">${nerve}</div>
    <div class="noise" title="Every ${NOISE_EVERY} nerve you spend in one round makes noise: the killer takes a step toward you."><span>Noise</span><div class="noise-bar">${noise}</div><small>${noiseLeft} until he hears you</small></div>
    <h4>Passive</h4>
    <div class="passive-box"><b>${esc(c.heroine.passive.name)}.</b> ${esc(c.heroine.passive.text)}</div>
    <h4>Escorting</h4>
    <div class="vics" style="height:22px">${h.escorting ? Array(h.escorting).fill(victimIcon()).join('') : '<span class="empty-note">No one with her.</span>'}</div>
    <h4>Items (${h.items.length}/5)</h4>
    <div class="items">${items}</div>`;

  // killer panel
  const totalPhases = (c.killer.finale.phases?.length ?? 0) + 1;
  const phaseName = k.finalePhase >= 0 ? c.killer.finale.phases![k.finalePhase].name : c.killer.finale.name;
  const bl = Array.from({ length: c.killer.bloodlustMax }, (_, i) => `<i class="${i < k.bloodlust ? 'on' : ''} ${i + 1 === c.killer.frenzyAt || i + 1 === c.killer.finaleAt ? 'mark' : ''}"></i>`).join('');
  document.getElementById('killer-panel')!.innerHTML = `
    <div class="killer-head"><div>${killerPortrait({ finale: k.finale, art: c.killer.art })}</div>
      <div><h3>${esc(c.killer.name)}</h3><div class="sub" style="font-size:11px;color:var(--muted)">${esc(c.killer.epithet)}</div></div></div>
    <h4>Health ${k.health}/${k.maxHealth}${k.finale ? ` · <span style="color:var(--blood)">${esc(phaseName)}</span>` : ''}${k.finale && totalPhases > 1 ? ` · phase ${k.finalePhase + 2}/${totalPhases}` : ''}</h4>
    <div class="hpbar"><div style="width:${(k.health / k.maxHealth) * 100}%"></div></div>
    <h4>Bloodlust ${k.bloodlust}/${c.killer.bloodlustMax}</h4>
    <div class="meter bl" title="Frenzy at ${c.killer.frenzyAt}, Finale at ${c.killer.finaleAt}">${bl}</div>
    <div class="stats" style="margin-top:8px">
      <span>Armor <b>${k.armor}</b></span><span>Attack <b>${killerAttackDice(c, s)}d</b></span><span>Speed <b>${killerSpeed(c, s)}</b></span>
      ${k.stunned ? '<span style="color:var(--good)">STUNNED</span>' : ''}${k.frenzy ? '<span style="color:var(--blood)">FRENZY</span>' : ''}
    </div>
    <h4>At ${esc(nodeName(c, k.loc))}</h4>
    <div class="quote">${esc(lastQuote)}</div>
    <h4>Weakness (${weaknessFound(c, s)}/${c.killer.items.filter((i) => i.kind === 'lore').length})</h4>
    <div class="passive-box">${esc(c.killer.weakness.text)}</div>
    <div class="stats" style="margin-top:8px"><span>Saved <b style="color:var(--good)">${s.saved}</b></span><span>Slain <b style="color:var(--blood)">${s.slain}</b></span><span>Still out there <b>${s.victimPool}</b></span></div>`;

  // log
  const logEl = document.getElementById('log')!;
  logEl.innerHTML = s.log
    .slice(-80)
    .map((l) => `<div class="${l.tone ?? ''}"><span class="r">R${l.round}</span>${esc(l.text)}</div>`)
    .join('');
  logEl.scrollTop = logEl.scrollHeight;

  updateBoard();
  updateBottom();
  updateOverlay();
  tutorial.sync(s);
}

function updateBoard() {
  const s = game!;
  const c = content!;
  const h = s.heroine;
  const reach = s.phase === 'action' ? neighbors(c, h.loc).filter((n) => check(c, s, { type: 'move', to: n }).ok) : [];
  document.querySelectorAll<HTMLButtonElement>('.node').forEach((el) => {
    const id = el.dataset.node!;
    el.classList.toggle('reach', reach.includes(id));
    el.classList.toggle('here', id === h.loc);
    const badges: string[] = [];
    if ((s.searches[id] ?? 0) > 0) badges.push(`<span class="badge search" title="${s.searches[id]} search${s.searches[id] > 1 ? 'es' : ''} left here">${glyph('search')}${s.searches[id]}</span>`);
    if ((s.barricades[id] ?? 0) > 0) badges.push(`<span class="badge barr" title="Barricade: blocks him ${s.barricades[id]} time(s)">${glyph('barricade')}${s.barricades[id]}</span>`);
    if ((s.victims[id] ?? 0) > 0 && (s.panic[id] ?? 0) > 0 && id !== h.loc)
      badges.push(`<span class="badge panic p${s.panic[id]}" title="Survivors left alone ${s.panic[id]} of ${PANIC_AT} rounds. At ${PANIC_AT} they may bolt.">${glyph('alarm')}${s.panic[id]}/${PANIC_AT}</span>`);
    const rk = c.location.rule.kind;
    if (rk === 'cold' && hasTag(c, id, 'outdoor')) badges.push(`<span class="badge env" title="Outdoors: ending a round here adds cold">${glyph('snow')}</span>`);
    if (rk === 'cold' && hasTag(c, id, 'warm')) badges.push(`<span class="badge env warm" title="Warm: ending a round here thaws you">${glyph('fire')}</span>`);
    if (rk === 'tide' && hasTag(c, id, 'shore')) badges.push(`<span class="badge env" title="Shore: floods at high tide">${glyph(isFlooded(c, s, id) ? 'wave' : 'ripple')}</span>`);
    if (rk === 'calls' && hasTag(c, id, 'phone')) badges.push(`<span class="badge env ${s.env.ringing === id ? 'ringing' : ''}" title="${s.env.ringing === id ? 'Ringing! Answer it here.' : 'Phone'}">${glyph('phone')}</span>`);
    el.classList.toggle('flooded', isFlooded(c, s, id));
    el.classList.toggle('ringing', s.env.ringing === id);
    el.querySelector('.badges')!.innerHTML = badges.join('');
    el.querySelector('.vics')!.innerHTML = Array(s.victims[id] ?? 0).fill(victimIcon()).join('');
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
  const te = document.getElementById('tok-esc')!;
  te.style.left = th.style.left;
  te.style.top = th.style.top;
  te.textContent = h.escorting ? `+${h.escorting}` : '';
  te.style.display = h.escorting ? '' : 'none';
  const tk = document.getElementById('tok-k')!;
  tk.style.left = `${X(kp.x) + (same ? 3.4 : 0)}%`;
  tk.style.top = `${Y(kp.y) - 9}%`;
  tk.classList.toggle('stunned', s.killer.stunned > 0);
  tk.classList.toggle('finale', s.killer.finale);
  const rk = document.getElementById('ring-k')!;
  rk.style.left = `${X(kp.x)}%`;
  rk.style.top = `${Y(kp.y)}%`;
  rk.classList.toggle('same', same);
  // A red line when he is one step away.
  const thr = document.getElementById('threat') as unknown as SVGLineElement;
  const adjacent = !same && neighbors(c, h.loc).includes(s.killer.loc);
  thr.setAttribute('x1', String(hp.x));
  thr.setAttribute('y1', String(hp.y));
  thr.setAttribute('x2', String(kp.x));
  thr.setAttribute('y2', String(kp.y));
  thr.classList.toggle('on', adjacent);
  document.getElementById('board')!.classList.toggle('dark', s.env.dark);
  const mc = moveCost(c, s);
  document.getElementById('board-hint')!.innerHTML =
    s.phase === 'action' ? `Click a glowing location to move · cost <b style="color:var(--gold)">${mc}</b> nerve${s.killer.loc === h.loc && mc === COST.flee ? ' (fleeing!)' : ''}` : '';
}


function updateBottom() {
  const s = game!;
  const c = content!;
  const thr = threshold(s);
  const descFor = (d: ActionCardDef): string => {
    const plus = d.dice ?? 0;
    switch (d.base) {
      case 'search':
        return `${searchDice(c, s) + plus} dice · ${Math.min(6, thr + (s.mods.searchThreshold ?? 0))}+ · find items`;
      case 'fight':
        return `${fightDice(c, s) + plus} dice · ${thr}+ · −${s.killer.armor} armor`;
      case 'hide':
        return d.auto || (s.mods.hideAuto ?? 0) > 0 ? 'automatic' : `${BASE_DICE.hide + plus + (c.heroine.traits.hideDice ?? 0) + (s.mods.hideDice ?? 0)} dice · ${thr}+`;
      case 'rest':
        return `${BASE_DICE.rest} dice · heal / calm · clears Bleeding`;
      case 'lead':
        return `bring survivors (max ${c.heroine.traits.escortCap ?? DEFAULT_ESCORT})`;
      default:
        return d.text;
    }
  };
  const cards = s.actionHand
    .map((card, i) => {
      const d = actionDef(c, card.id);
      const chk = check(c, s, { type: 'playCard', uid: card.uid });
      const junk = d.junk ? `junk ${d.junk}` : '';
      return `<button class="act ${junk}" data-card="${card.uid}" data-kind="${d.base}" ${chk.ok ? '' : 'disabled'} title="${esc(chk.why ? `${chk.why}. ${d.text}` : d.text)}">
        <span class="n">${esc(d.name)} <kbd>${i + 1}</kbd></span>
        <span class="c"><b>${chk.cost}◉</b> ${esc(d.junk ? d.text : descFor(d))}</span>
      </button>`;
    })
    .join('');
  const answer =
    c.location.rule.kind === 'calls'
      ? (() => {
          const chk = check(c, s, { type: 'answer' });
          return `<button class="act answer" data-act="answer" data-kind="answer" ${chk.ok ? '' : 'disabled'} title="${esc(chk.why ?? 'Answer the ringing phone')}"><span class="n">Answer <kbd>A</kbd></span><span class="c"><b>${chk.cost}◉</b> ${esc(s.env.ringing ? `ringing at ${nodeName(c, s.env.ringing)}` : 'no phone ringing')}</span></button>`;
        })()
      : '';
  const bleeding = junkCount(s, 'junk-wound');
  const panicN = junkCount(s, 'junk-panic');
  const pile = `<div class="pile" title="Your hand holds up to ${ACTION_HAND} cards, including Bleeding and Panic">
    <button class="btn small lineup-btn ${s.picksLeft > 0 && s.lineup.length && handRoom(s) > 0 ? 'hot' : ''}" data-go="openDraft" ${s.phase === 'action' && s.lineup.length ? '' : 'disabled'}>Lineup · ${s.picksLeft} pick${s.picksLeft === 1 ? '' : 's'}</button>
    <span><b>${s.actionHand.length}</b>/${ACTION_HAND} in hand</span>
    ${bleeding ? `<span class="pile-bad"><b>${bleeding}</b> bleeding</span>` : ''}${panicN ? `<span class="pile-bad"><b>${panicN}</b> panic</span>` : ''}</div>`;
  const btns = pile + cards + answer;
  const hand = s.heroine.hand
    .map((card) => {
      const d = instinctDef(c, card.id);
      const ok = check(c, s, { type: 'playInstinct', uid: card.uid }).ok;
      return `<button class="instinct ${d.id.startsWith('sig-') ? 'sig' : ''}" data-instinct="${card.uid}" ${ok ? '' : 'disabled'} title="Play for free"><b>${esc(d.name)}</b>${esc(d.text)}</button>`;
    })
    .join('');
  document.getElementById('bottombar')!.innerHTML = `
    <div><div class="actions">${btns}</div>${hand ? `<div class="hand">${hand}</div>` : ''}</div>
    <div class="endcol"><div class="endtools"><button class="btn small" data-go="undo" ${canUndo() ? '' : 'disabled'} title="Undo last action (Z) — not after dice rolls or draws">${glyph('undo')} Undo</button><button class="btn small" data-go="hint" ${s.phase === 'action' ? '' : 'disabled'} title="What would a survivor do? (H)">${glyph('bulb')} Hint</button></div>
    <button class="endturn" data-act="endTurn" ${s.phase === 'action' ? '' : 'disabled'}>End Turn <small style="display:block;font-size:10px;opacity:.7">${s.heroine.nerve} nerve left · E</small></button></div>`;
}

function describeEffects(effs: Effect[]): string {
  return effs
    .map((e) => {
      switch (e.op) {
        case 'spawn':
          return `+${e.n} survivor${e.n > 1 ? 's' : ''}`;
        case 'horror':
          return e.n > 0 ? `Horror +${e.n}` : `Horror ${e.n}`;
        case 'killerMove':
          return `Killer moves ${e.steps}`;
        case 'killerTeleport':
          return 'Killer relocates';
        case 'mod':
          return (
            {
              searchThreshold: `Search harder (+${e.n})`,
              searchDice: `Search +${e.n} die`,
              hideAuto: 'Hiding automatic',
              killerAttackDice: `Killer attack +${e.n} die`,
              nerve: `+${e.n} nerve`,
            } as Record<string, string>
          )[e.key] ?? '';
        case 'clock':
          return 'Dawn comes sooner';
        case 'bloodlust':
          return `Bloodlust +${e.n}`;
        case 'killerStun':
          return 'Killer loses a turn';
        case 'killerArmor':
          return e.n > 0 ? `Killer armor +${e.n}` : `Killer armor ${e.n}`;
        case 'killerHeal':
          return `Killer heals ${e.n}`;
        case 'wound':
          return `${e.n} wound`;
        case 'drawInstinct':
          return `Draw ${e.n} instinct`;
        case 'if':
          return 'Conditional';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' · ');
}

function updateOverlay() {
  const s = game!;
  const c = content!;
  const root = document.getElementById('overlay-root')!;
  if (overlayLocked) return;
  if (cardQueue.length) {
    const t = eventDef(c, cardQueue[0]);
    root.innerHTML = `<div class="overlay"><div class="card killer terror">
      <div class="face">
        <div class="still-wrap">${eventStill(t, 'terror')}</div>
        <div class="kind">Terror · ${esc(c.killer.name)} grows stronger</div>
        <h2>${esc(t.name)}</h2>
        <p>${esc(t.text)}</p>
        <div class="fxline">${esc(describeEffects(t.effects))}</div>
        <button class="btn primary" data-go="ackTerror">Endure <small>(space)</small></button>
      </div></div></div>`;
    return;
  }
  if (s.phase === 'action' && s.lineup.length && s.picksLeft > 0 && handRoom(s) > 0 && draftClosedRound !== s.round) {
    const cardHtml = (x: { uid: number; id: string }, take: boolean) => {
      const d = actionDef(c, x.id);
      return `<button class="act draftcard ${d.junk ? `junk ${d.junk}` : ''}" ${take ? `data-draft="${x.uid}"` : 'disabled'} data-kind="${d.base}">
        <span class="n">${esc(d.name)}</span><span class="cost"><b>${d.cost}</b> nerve to play</span><span class="c">${esc(d.text)}</span></button>`;
    };
    root.innerHTML = `<div class="overlay draft-ov"><div class="draft">
      <div class="kind">Round ${s.round} · The lineup</div>
      <h2>Take up to ${s.picksLeft} card${s.picksLeft === 1 ? '' : 's'}</h2>
      <p>Taking is free. You pay nerve when you <b>play</b> a card. Your hand holds ${ACTION_HAND} (${handRoom(s)} free). Cards you don't take are gone at the end of the round.</p>
      <div class="draft-row">${s.lineup.map((x) => cardHtml(x, true)).join('')}</div>
      ${s.actionHand.length ? `<div class="draft-hand"><span>In your hand:</span> ${s.actionHand.map((x) => `<i class="${actionDef(c, x.id).junk ? 'j' : ''}">${esc(actionDef(c, x.id).name)}</i>`).join('')}</div>` : ''}
      <button class="btn primary" data-go="closeDraft">Done — to the map <small>(space)</small></button>
    </div></div>`;
    return;
  }
  if (s.phase === 'event' && s.currentEvent) {
    const ev = eventDef(c, s.currentEvent);
    root.innerHTML = `<div class="overlay"><div class="card ${ev.tone === 'killer' || ev.tone === 'dread' ? 'killer' : ev.tone === 'calm' ? 'calm' : ''}">
      <div class="face">
        <div class="still-wrap">${eventStill(ev, 'event')}</div>
        <div class="kind">Round ${s.round} · ${ev.tone === 'victim' ? 'Survivors' : ev.tone === 'calm' ? 'Respite' : ev.tone === 'killer' ? c.killer.name : 'Dread'}</div>
        <h2>${esc(ev.name)}</h2>
        <p>${esc(ev.text)}</p>
        <div class="fxline">${esc(describeEffects(ev.effects))}</div>
        <button class="btn primary" data-act="resolveEvent" autofocus>Continue <small>(space)</small></button>
      </div></div></div>`;
    return;
  }
  if (s.phase === 'killer') {
    const lines = s.log.slice(killerLogStart).map((l) => `<li>${esc(l.text)}</li>`).join('');
    root.innerHTML = `<div class="overlay"><div class="killerturn">
      <h2>${esc(c.killer.name)}</h2>
      <ul>${lines || '<li>He waits in the dark.</li>'}</ul>
      <button class="btn primary" style="width:100%" data-act="resolveKiller">Next round <small>(space)</small></button>
    </div></div>`;
    return;
  }
  if (s.phase === 'over') {
    const r = rating(s);
    const title = s.outcome === 'slain' ? 'THE END' : s.outcome === 'survived' ? 'DAWN' : 'CUT TO BLACK';
    const sub =
      s.outcome === 'slain'
        ? `${c.heroine.name} stands over what is left of ${c.killer.name}. The projector winds down to silence.`
        : s.outcome === 'survived'
          ? `Sunlight finds ${c.heroine.name} at the edge of the lot. ${c.killer.name} is gone — but the booth door is open.`
          : `${c.heroine.name} does not make it to the credits.`;
    const lore = c.killer.items.filter((i) => s.foundLore.includes(i.id));
    root.innerHTML = `<div class="overlay"><div class="modal ending" style="text-align:center">
      <div class="end-poster">${comboPoster(c.location.id, c.killer.id)}</div>
      <h2 style="font-size:64px;color:${s.outcome === 'died' ? 'var(--blood)' : '#fff3e0'}">${title}</h2>
      <p>${esc(sub)}</p>
      <div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
      <p><i>${esc(r.blurb)}</i></p>
      <table><tr><td>Survivors saved</td><td>${s.saved}</td></tr><tr><td>Survivors slain</td><td>${s.slain}</td></tr><tr><td>Rounds</td><td>${Math.min(s.round, s.dawnAt)}</td></tr><tr><td>Score</td><td>${score(s)}</td></tr></table>
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
  if (a.type === 'endTurn' && game.heroine.nerve > 0 && game.phase === 'action') {
    if (!confirmEnd()) return;
  }
  if (a.type === 'endTurn') killerLogStart = game.log.length;
  const prev = game;
  const next = dispatch(content, game, a);
  if (next === game) return;
  game = next;
  if (game.phase === 'action' && prev.phase === 'action' && a.type !== 'endTurn') history.push(prev);
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
  toast(`You still have ${game!.heroine.nerve} nerve. Press End Turn again to let him move.`);
  return false;
}

function showMapKey() {
  const c = content;
  const ruleTxt = c ? `<tr><td>${glyph(c.location.rule.kind === 'cold' ? 'snow' : c.location.rule.kind === 'tide' ? 'wave' : c.location.rule.kind === 'calls' ? 'phone' : 'reel')}</td><td><b>${esc(c.location.rule.name)}</b>: ${esc(c.location.rule.text)}</td></tr>` : '';
  modal(`<h2>Map key</h2><table class="keytable">
    <tr><td><span class="kpin you"></span></td><td><b>You</b>: the white pin with your name. A white ring pulses on your location.</td></tr>
    <tr><td><span class="kpin him"></span></td><td><b>The killer</b>: the red pin with his name and a red glow. A red dashed line means he is <b>one step away</b>.</td></tr>
    <tr><td>${glyph('person')}</td><td><b>Survivors</b>: the little figures. Walk to them, play <b>Lead</b>, and take them to the exit.</td></tr>
    <tr><td><span class="badge panic p2">${glyph('alarm')}2/${PANIC_AT}</span></td><td><b>Panic</b>: how many rounds those survivors have been alone. At ${PANIC_AT} they may bolt, maybe into the killer.</td></tr>
    <tr><td><span class="badge search">${glyph('search')}2</span></td><td><b>Searches left</b> at that location.</td></tr>
    <tr><td><span class="badge barr">${glyph('barricade')}1</span></td><td><b>Barricade</b>: he must break it to get in.</td></tr>
    <tr><td><span class="kring exit"></span></td><td><b>Green ring</b>: the exit. Bring survivors here.</td></tr>
    <tr><td><span class="kring lair"></span></td><td><b>Red ring</b>: his lair, where he starts and returns.</td></tr>
    <tr><td><span class="kring reach"></span></td><td><b>Glowing gold</b>: where you can move right now.</td></tr>
    ${ruleTxt}
  </table><p>Hover over (or tap) any location to see everything about it.</p>`);
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
  if (id === c.location.exit) lines.push('<b class="good">Exit</b>: bring survivors here to save them.');
  if (id === c.location.lair) lines.push('<b>His lair.</b>');
  if (v) lines.push(`${v} survivor${v > 1 ? 's' : ''}${(s.panic[id] ?? 0) ? `, alone for ${s.panic[id]}/${PANIC_AT} rounds` : ''}.`);
  lines.push(`${s.searches[id] ?? 0} search${(s.searches[id] ?? 0) === 1 ? '' : 'es'} left.`);
  if ((s.barricades[id] ?? 0) > 0) lines.push(`Barricaded (${s.barricades[id]}).`);
  if (n.tags?.includes('outdoor') && c.location.rule.kind === 'cold') lines.push('Outdoors: ending your round here adds cold.');
  if (n.tags?.includes('warm')) lines.push('Warm: ending your round here thaws you.');
  if (n.tags?.includes('shore')) lines.push(isFlooded(c, s, id) ? 'Flooded: +1 nerve to enter.' : 'Shore: floods at high tide.');
  if (n.tags?.includes('phone')) lines.push(s.env.ringing === id ? '<b class="bad">The phone is ringing.</b>' : 'Has a phone.');
  if (s.phase === 'action' && neighbors(c, s.heroine.loc).includes(id)) lines.push(`Move here: <b>${moveCost(c, s, id)}</b> nerve.`);
  el.innerHTML = `<h5>${esc(n.name)}</h5><p class="fl">${esc(n.flavor)}</p>${lines.map((l) => `<p>${l}</p>`).join('')}`;
  el.hidden = false;
  const left = n.x / 10;
  const top = n.y / 6.4;
  el.style.left = left > 60 ? '' : `calc(${left}% + 6%)`;
  el.style.right = left > 60 ? `calc(${100 - left}% + 6%)` : '';
  el.style.top = `${Math.min(top, 62)}%`;
}

function showHint() {
  if (!game || !content || game.phase !== 'action') return;
  const c = content;
  const s = game;
  const a = botAction(c, s);
  let txt = '';
  switch (a.type) {
    case 'move':
      txt = `Move to <b>${esc(nodeName(c, a.to))}</b>.`;
      break;
    case 'useItem': {
      const it = s.heroine.items.find((i) => i.uid === a.uid);
      txt = it ? `Use <b>${esc(itemDef(c, it.id).name)}</b>.` : 'Use an item.';
      break;
    }
    case 'playInstinct': {
      const card = s.heroine.hand.find((i) => i.uid === a.uid);
      txt = card ? `Play <b>${esc(instinctDef(c, card.id).name)}</b>.` : 'Play an Instinct.';
      break;
    }
    case 'playCard': {
      const card = s.actionHand.find((i) => i.uid === a.uid);
      txt = card ? `Play <b>${esc(actionDef(c, card.id).name)}</b>.` : 'Play a card.';
      break;
    }
    case 'draft': {
      const card = s.lineup.find((i) => i.uid === a.uid);
      txt = card ? `Take <b>${esc(actionDef(c, card.id).name)}</b> from the lineup.` : 'Take a card from the lineup.';
      break;
    }
    case 'endTurn':
      txt = s.heroine.nerve > 0 ? `<b>End the turn</b> and bank your ${s.heroine.nerve} nerve.` : '<b>End the turn</b>.';
      break;
    default:
      txt = `<b>${a.type[0].toUpperCase() + a.type.slice(1)}</b>.`;
  }
  toast(`${glyph('bulb', 'tip')} ${txt}`, 4000);
}

function canUndo(): boolean {
  if (!game || !history.length || game.phase !== 'action') return false;
  const prev = history[history.length - 1];
  // Only undo deterministic actions: nothing random consumed, no cards/items drawn.
  return prev.rng === game.rng && prev.itemDeck.length === game.itemDeck.length && prev.instinctDeck.length === game.instinctDeck.length;
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
        cardQueue.push(f.id);
        audio.play('killer');
        flash(false);
        break;
      case 'env':
        audio.play(/High Tide/i.test(f.text) ? 'tide' : /Blackout/i.test(f.text) ? 'blackout' : /ringing/i.test(f.text) ? 'ring' : 'card');
        toast(`<b>${esc(c.location.rule.name)}</b> — ${esc(f.text)}`, 3500);
        break;
      case 'phase':
        audio.play('finale');
        flash(true);
        shake();
        banner(f.name.toUpperCase());
        break;
      case 'dice':
        if (!diceShown && s.lastRoll) {
          diceShown = true;
          showDice(s);
        }
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
      case 'stun':
        audio.play('stun');
        break;
      case 'finale':
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
  const isKiller = r.label.includes('attacks');
  audio.play('dice');
  overlayLocked = true;
  const el = document.createElement('div');
  el.className = `dicetray ${isKiller ? 'killer' : ''}`;
  el.innerHTML = `<h5>${esc(r.label)} · ${r.threshold}+ succeeds${r.rerolled ? ' · rerolled' : ''}</h5>
    <div class="dice">${r.dice.map((d, i) => `<div class="die ${d >= r.threshold ? 'hit' : 'miss'}" style="animation-delay:${i * 0.08}s">${pip(d)}</div>`).join('')}</div>
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
  setTimeout(done, 1700 + r.dice.length * 80);
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
  if (s.phase !== 'action') return;
  if ((s.victims[s.heroine.loc] ?? 0) > 0) showTip('lead', 'Survivors here! <b>Lead</b> them, then walk them to the <b>Ticket Booth</b> (green) to save them.');
  else if (s.killer.loc === s.heroine.loc) showTip('killer', `${esc(c.killer.name)} is here. <b>Fight</b>, <b>Hide</b>, or flee — fleeing costs ${COST.flee} nerve.`);
  else if (s.heroine.escorting > 0) showTip('escort', 'Get them to the Ticket Booth. Each one saved calms you and draws an Instinct card.');
  else if (s.killer.bloodlust >= 4) showTip('bloodlust', 'Every death feeds his <b>bloodlust</b>. At the marked thresholds he enters Frenzy, then the Finale.');
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
  modal(`<h2>How to Play</h2>
  <p><button class="btn small primary" data-go="tutorial">▶ Play the guided first night</button></p>
  <p>You are the last one who can stop it. Each <b>round</b> has three beats:</p>
  <h3>1 · Event</h3><p>Draw an event card: new survivors stumble in, the fog rolls, or the killer makes his move.</p>
  <h3>2 · Your actions</h3>
  <p><b>Nerve</b> pays for everything. You gain nerve each round (+3, or +2 when Breaking) and <b>unspent nerve carries over</b>, up to 8. Saving up for a bad round is often the right call.</p>
  <p><b>Noise:</b> every ${NOISE_EVERY} nerve you spend in one round makes noise, and the killer takes a step toward you.</p>
  <p><b>Moving</b> is always available: click a glowing location (1 nerve, 2 to flee the killer, +1 when escorting 3 or more). Everything else comes from your <b>hand of action cards</b>. Each round 6 cards are dealt face up as <b>the lineup</b>: take up to 3 for free (hand max ${ACTION_HAND}), then pay nerve to play them. Cards you don't take are gone at the end of the round.</p>
  <table><tr><th>Card</th><th>Cost</th><th>What it does</th></tr>
  <tr><td>Search / Ransack</td><td>1 / 2</td><td>Roll dice (Ransack +2); each success finds an item (max 2).</td></tr>
  <tr><td>Lead</td><td>1</td><td>Survivors here follow you. Bring them to the exit to save them.</td></tr>
  <tr><td>Fight / Desperate Swing</td><td>2 / 3</td><td>Roll 3 dice + best weapon (+2 for Swing). Damage = successes − armor.</td></tr>
  <tr><td>Hide / Hold Your Breath</td><td>1 / 2</td><td>Roll to hide, or hide automatically. He may still search the room.</td></tr>
  <tr><td>Barricade</td><td>2</td><td>He must break it before entering this location.</td></tr>
  <tr><td>Catch Your Breath</td><td>2</td><td>Heal or calm, and clear a Bleeding card.</td></tr>
  <tr><td>Sprint</td><td>1</td><td>Your next 2 moves are free.</td></tr></table>
  <p><b>Bleeding</b> cards go straight into your hand when you're hit and take up a slot until you rest or heal. <b>Panic</b> cards appear at high horror; pay 1 nerve to shake one off.</p>
  <p><b>Survivors panic</b> when left alone (the ! badge). After ${PANIC_AT} rounds without you, one may bolt to a nearby location, possibly straight into the killer.</p>
  <p><b>Items</b> are used for free. <b>Instinct cards</b> are played for free; you draw one each round and when you save survivors.</p>
  <h3>3 · The killer</h3><p>If he's with you and you're not hidden, he <b>attacks</b>. Otherwise, if survivors are with him, he <b>kills one</b> (bloodlust +2). Otherwise he hunts toward the nearest prey.</p>
  <h3>Horror</h3><p>Fear makes dice harder and slows your nerve. Steady and Uneasy: +3 nerve, 4+. Terrified: +3, 5+. Breaking: +2, 5+. Past the top, terror becomes wounds.</p>
  <h3>The Finale</h3><p>At high bloodlust, if you "kill" him early, or in the last 3 rounds, the Finale begins: he comes for you. Defeat him in the Finale to win outright — or survive until <b>dawn</b>.</p>
  <h3>Weakness</h3><p>Some items are pieces of the killer's past. Finding them strips his armor.</p>
  <h3>This location: ${content ? esc(content.location.rule.name) : 'Location rules'}</h3><p>${content ? esc(content.location.rule.text) : 'Every location has one signature rule: Intermission (Drive-In), The Tide (Tide Cabins), Rolling Blackouts (Saint Agatha), Whiteout cold (Kettle Peak), Request Line phones (KXRL).'}</p><h3>Terror</h3><p>Every 4 bloodlust, the killer reveals a Terror card: a permanent escalation.</p><h3>Keys</h3><p>Hover a location for details · Map key button explains every marker · 1–5 play cards · A answer · H hint · Z undo · E end turn · Space continue · R rules</p>`);
}

function showSettings() {
  const o = modal(`<h2>Settings</h2>
    <div class="row"><span>Sound</span><button class="btn small" id="s-sound">${prefs.sound ? 'On' : 'Off'}</button></div>
    <div class="row"><span>Master volume</span><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${prefs.volume}"></div>
    <div class="row"><span>Music &amp; ambience</span><input type="range" id="s-music" min="0" max="1" step="0.05" value="${prefs.music}"></div>
    <div class="row"><span>Film grain</span><input type="range" id="s-grain" min="0" max="1" step="0.05" value="${prefs.grain}"></div>
    <div class="row"><span>Tutorial tips</span><button class="btn small" id="s-tips">${prefs.tips ? 'On' : 'Off'}</button></div>
    <div class="row"><span>Reset tips</span><button class="btn small" id="s-reset">Reset</button></div>`);
  o.querySelector('#s-sound')!.addEventListener('click', (e) => {
    prefs.sound = !prefs.sound;
    audio.setEnabled(prefs.sound);
    (e.target as HTMLElement).textContent = prefs.sound ? 'On' : 'Off';
    savePrefs();
    if (screen === 'game') updateGame();
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
  if (!game) return;
  const node = t.closest<HTMLElement>('[data-node]')?.dataset.node;
  if (node && node !== game.heroine.loc) return act({ type: 'move', to: node });
  const a = t.closest<HTMLElement>('[data-act]')?.dataset.act;
  if (a) return act({ type: a } as Action);
  const item = t.closest<HTMLElement>('[data-item]')?.dataset.item;
  if (item) return act({ type: 'useItem', uid: +item });
  const drop = t.closest<HTMLElement>('[data-drop]')?.dataset.drop;
  if (drop) return act({ type: 'dropItem', uid: +drop });
  const draftUid = t.closest<HTMLElement>('[data-draft]')?.dataset.draft;
  if (draftUid) return act({ type: 'draft', uid: +draftUid });
  const cardUid = t.closest<HTMLElement>('[data-card]')?.dataset.card;
  if (cardUid) return act({ type: 'playCard', uid: +cardUid });
  const ins = t.closest<HTMLElement>('[data-instinct]')?.dataset.instinct;
  if (ins) return act({ type: 'playInstinct', uid: +ins });
});
document.body.addEventListener('click', (e) => {
  // overlays live outside #app on the game screen root
  const t = e.target as HTMLElement;
  if (app.contains(t)) return;
  const dr = t.closest<HTMLElement>('#overlay-root [data-draft]')?.dataset.draft;
  if (dr) return act({ type: 'draft', uid: +dr });
  const a = t.closest<HTMLElement>('#overlay-root [data-act]')?.dataset.act;
  if (a) act({ type: a } as Action);
  const go = t.closest<HTMLElement>('#overlay-root [data-go]')?.dataset.go;
  if (go) navigate(go);
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
    case 'closeDraft':
      if (game) draftClosedRound = game.round;
      return updateOverlay();
    case 'openDraft':
      draftClosedRound = -1;
      return updateOverlay();
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
    case 'ackTerror':
      cardQueue.shift();
      audio.play('card');
      return updateOverlay();
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
  if (document.querySelector('.modal')) {
    if (e.key === 'Escape') document.querySelector('.modal')?.closest('.overlay')?.remove();
    return;
  }
  if (e.key === 'r' || e.key === 'R') return showRules();
  if (!game || screen !== 'game') return;
  if (document.querySelector('.dicetray')) {
    if (e.key === ' ' || e.key === 'Enter') (document.querySelector('.dicetray') as HTMLElement).click();
    e.preventDefault();
    return;
  }
  if ((e.key === 'z' || e.key === 'Z') && !e.metaKey) return undo();
  if (e.key === 'h' || e.key === 'H') return showHint();
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (cardQueue.length) return navigate('ackTerror');
    if (document.querySelector('.draft-ov')) return navigate('closeDraft');
    if (game.phase === 'event') return act({ type: 'resolveEvent' });
    if (game.phase === 'killer') return act({ type: 'resolveKiller' });
  }
  if (/^[1-9]$/.test(e.key)) {
    const card = game.actionHand[Number(e.key) - 1];
    if (card) act({ type: 'playCard', uid: card.uid });
    return;
  }
  if (e.key === 'a' || e.key === 'A') return act({ type: 'answer' });
  if (e.key === 'e' || e.key === 'E') return act({ type: 'endTurn' });
});

startGrain(document.getElementById('grain') as HTMLCanvasElement);
setGrainIntensity(prefs.grain);
render();
