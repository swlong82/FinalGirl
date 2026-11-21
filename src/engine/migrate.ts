// Converts a night saved under the v0.9 rules into a v1.0 game in progress.
// The old rules had no tableau, Terror clock or final-health tokens, so the
// conversion keeps what carries over (where everyone is, health and horror as
// fractions, items, lore, rescues, bloodlust, how far into the night it is)
// and fills in the rest from a fresh v1.0 setup with the same seed.
import { DIFFICULTY, HAND_SLOTS, handsUsed, itemDef, newGame, TERROR_DEAL } from './rules';
import type { Content, Difficulty, GameState, HeldItem } from './types';

interface LegacyItem {
  id: string;
  usesLeft?: number;
}

/** The parts of a v0.9 save the conversion reads. */
export interface LegacySave {
  version: 1;
  seed: number;
  difficulty?: string;
  round: number;
  outcome?: string;
  heroine: { loc: string; health: number; maxHealth: number; horror: number; items?: LegacyItem[]; pack?: LegacyItem[]; escorting?: number };
  killer: { loc: string; health: number; maxHealth: number; bloodlust: number; stunned?: number; finale?: boolean; risen?: boolean; finalePhase?: number };
  victims?: Record<string, number>;
  barricades?: Record<string, number>;
  saved?: number;
  slain?: number;
  victimPool?: number;
  foundLore?: string[];
  log?: { round: number; text: string; tone?: 'bad' | 'good' | 'killer' | 'info' }[];
}

export function isLegacySave(x: unknown): x is LegacySave {
  const o = x as LegacySave | null;
  return !!o && o.version === 1 && typeof o.round === 'number' && !!o.heroine && !!o.killer;
}

export function migrateSave(c: Content, old: LegacySave): GameState | null {
  if (!isLegacySave(old) || old.outcome) return null;
  const diff: Difficulty = old.difficulty === 'story' || old.difficulty === 'nightmare' ? old.difficulty : 'standard';
  const s = newGame(c, old.seed >>> 0 || 1, diff);
  const nodes = new Set(c.location.nodes.map((n) => n.id));
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const h = s.heroine;
  const k = s.killer;

  // Board: where everyone is. Survivors she was escorting stand with her.
  if (nodes.has(old.heroine.loc)) h.loc = old.heroine.loc;
  if (nodes.has(old.killer.loc)) k.loc = old.killer.loc;
  for (const n of nodes) {
    s.victims[n] = Math.max(0, old.victims?.[n] ?? 0);
    s.barricades[n] = clamp(old.barricades?.[n] ?? 0, 0, 3);
  }
  s.victims[h.loc] += Math.max(0, old.heroine.escorting ?? 0);
  s.saved = old.saved ?? 0;
  s.slain = old.slain ?? 0;
  if (typeof old.victimPool === 'number') s.victimPool = clamp(old.victimPool, 0, s.victimPool);

  // Health and horror carry over as fractions; her final-health token stays hidden.
  const total = h.maxHealth + 1;
  h.health = clamp(Math.round((total * old.heroine.health) / Math.max(1, old.heroine.maxHealth)) - 1, 0, h.maxHealth);
  h.horror = clamp(Math.round(old.heroine.horror), 0, 6);
  h.nerve = DIFFICULTY[diff].nerve;

  // Rescues fill her slots (rewards were already paid under the old rules), and Resolve follows the slots.
  h.rescued = s.saved;
  const filled = c.heroine.rescue.slots.slice(0, s.saved);
  h.resolve = filled.reduce((n, slot) => n + slot.effects.filter((e) => e.op === 'resolve').reduce((m, e) => m + (e.op === 'resolve' ? e.n : 0), 0), 0);

  // Items: everything she carried comes along; anything in hand that still needs hands stays there if it fits.
  const take = (id: string) => {
    for (const p of Object.values(s.piles)) {
      const i = p.cards.indexOf(id);
      if (i >= 0) return void p.cards.splice(i, 1);
    }
    const j = s.spare.indexOf(id);
    if (j >= 0) s.spare.splice(j, 1);
  };
  h.items = [];
  h.pack = [];
  for (const it of [...(old.heroine.items ?? []), ...(old.heroine.pack ?? [])]) {
    let d;
    try {
      d = itemDef(c, it.id);
    } catch {
      continue;
    }
    const held: HeldItem = { uid: s.uid++, id: it.id, usesLeft: d.uses === undefined ? undefined : clamp(it.usesLeft ?? d.uses, 1, d.uses) };
    if (d.hands > 0 && handsUsed(c, h.items) + d.hands <= HAND_SLOTS) h.items.push(held);
    else h.pack.push(held);
    take(it.id);
  }
  s.foundLore = (old.foundLore ?? []).filter((id) => c.killer.items.some((i) => i.id === id));
  for (const id of s.foundLore) if (!h.pack.some((x) => x.id === id)) {
    h.pack.push({ uid: s.uid++, id });
    take(id);
  }

  // The killer: health as a fraction, bloodlust halved onto the 8-level track.
  k.health = clamp(Math.round((k.maxHealth * old.killer.health) / Math.max(1, old.killer.maxHealth)), 1, k.maxHealth);
  if (old.killer.risen || (old.killer.finalePhase ?? -1) >= 0) k.token = null; // he already got back up once
  k.bloodlust = clamp(Math.floor(old.killer.bloodlust / 2), 0, c.killer.bloodlust.levels.length - 1);
  k.stunned = clamp(old.killer.stunned ?? 0, 0, 2);

  // The clock: one Terror card per turn already played.
  s.round = Math.max(1, old.round);
  s.terrorDeck = s.terrorDeck.slice(0, clamp(TERROR_DEAL - (s.round - 1), 0, TERROR_DEAL));
  if (old.killer.finale) {
    k.finale = true;
    s.terrorDeck = [];
  }
  if (k.finale || k.bloodlust >= c.killer.bloodlust.revealAt) {
    k.power = 'active';
    k.powerHealth = c.killer.power.health;
  }

  s.phase = 'action';
  s.log = [
    ...(old.log ?? []).slice(-150),
    { round: s.round, text: 'This night was saved under the old rules (v0.9) and has been converted to v1.0: same positions, health, horror, items and rescues, with a fresh hand and a Terror clock for the turns that are left.', tone: 'info' },
  ];
  s.fx = [];
  return s;
}
