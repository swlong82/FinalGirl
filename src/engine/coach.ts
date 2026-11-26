// The coach: what she should be doing right now, in plain words. It reads the
// same plan the bot plays by (botGoal / botAction), so the goal banner, the
// Show me pointer and the Hint never disagree with each other.
import { botAction, botGoal, buyDeficits, finishing, type BuyNeed } from './bot';
import { actionDef, bestWeapon, cardCost, check, escortCap, followPlan, isExit, isSearch, itemDef, minionsAt, nodeName, npcAt, totalHealth } from './rules';
import type { Action, CardTag, Content, GameState, NodeId } from './types';

export type GoalKind = 'escort' | 'rescue' | 'arm' | 'supplies' | 'hunt' | 'finish' | 'fight' | 'flee' | 'finale' | 'prep';

export interface Goal {
  kind: GoalKind;
  /** Where to go (absent when the goal is right here). */
  node?: NodeId;
  /** Two to four words: "Rescue a survivor". */
  title: string;
  /** One short line: what to do. */
  detail: string;
  /** Why it matters, for the curious. */
  why?: string;
}

const hasTag = (c: Content, s: GameState, tag: CardTag) =>
  s.heroine.hand.some((x) => {
    const d = actionDef(c, x.id);
    return d.kind === 'action' && d.tags.includes(tag) && !(tag === 'move' && d.req === 'reach');
  });

/** Her current goal, in a few words. */
export function currentGoal(c: Content, s: GameState): Goal {
  const h = s.heroine;
  const k = s.killer;
  const g = botGoal(c, s);
  const at = (n: NodeId) => nodeName(c, n);
  const slots = c.heroine.rescue.slots.length;
  const rescueWhy = h.rescued < slots ? `Each rescue powers you up (${h.rescued}/${slots}). All ${slots} unlock your ability.` : 'Every survivor you save is one {he} can’t kill.';
  const withHer = npcAt(s, h.loc);
  const low = finishing(c, s);
  // One decision drives both the banner and Show me: if the next move is a swing at him, the goal is the fight.
  const a = botAction(c, s);
  const card = a.type === 'playCard' ? actionDef(c, h.hand.find((x) => x.uid === a.uid)!.id) : undefined;
  const swinging = !!card?.tags.includes('attack') && (k.loc === h.loc || !minionsAt(s, h.loc).length);
  if (withHer > 0 && !isExit(c, h.loc) && !swinging) {
    const lead = followPlan(c, s, h.loc, '').count;
    const who = lead >= withHer ? `the survivor${withHer > 1 ? 's' : ''}` : lead ? `${lead} of the ${withHer} survivors` : 'no one (you set 0 to follow)';
    const part = lead > 0 && lead < withHer;
    return { kind: 'escort', node: g.node, title: 'Get them out', detail: `${k.loc === h.loc ? '{He}’s here. Lead' : 'Walk'} ${who}${part ? '' : ' with you'} to the exit: ${at(g.node)}.${part ? ' Come back for the rest.' : ''}`, why: part ? `You can lead ${escortCap(c)} at a time.` : k.loc === h.loc ? 'Survivors die first when {he} attacks.' : rescueWhy };
  }
  if (swinging || (k.loc === h.loc && (g.brave || k.finale) && !card?.tags.includes('move'))) {
    if (low) return { kind: 'finish', title: 'Finish {him}!', detail: `{He}’s down to ${k.health}. Hit {him} with everything you’ve got.`, why: 'Killing {him} is the only way to win.' };
    return { kind: 'fight', title: 'Fight!', detail: k.loc === h.loc ? '{He}’s here. Play attack cards: {his} health to 0 wins.' : '{He}’s in reach. Play attack cards: {his} health to 0 wins.', why: 'Your weapon and lore add to every heavy hit.' };
  }
  if (k.loc === h.loc) {
    const moving = s.pending?.kind === 'move';
    const canSwing = h.hand.some((x) => actionDef(c, x.id).tags.includes('attack') && check(c, s, { type: 'playCard', uid: x.uid }).ok);
    const why = !hasTag(c, s, 'attack') ? 'You’re out of attack cards.' : !canSwing ? 'You can’t attack right now.' : totalHealth(s) < 3 ? 'You’re badly hurt.' : 'You need a weapon first.';
    return { kind: 'flee', node: g.node !== h.loc ? g.node : undefined, title: 'Get away', detail: `${why} ${moving ? 'Step to a glowing location.' : 'Play a move card.'}`, why: 'Rescue survivors and gear up, then come back for {him}.' };
  }
  if (g.brave) {
    if (k.finale) return { kind: 'finale', node: k.loc, title: 'Finale: kill {him}', detail: `No more waiting. {He}’s at ${at(k.loc)}: go and attack.`, why: 'In the Finale {he} only hunts you and gets stronger every turn.' };
    if (low) return { kind: 'finish', node: k.loc, title: 'Finish {him}', detail: `{He}’s down to ${k.health}. {He}’s at ${at(k.loc)}: go and hit {him}.`, why: 'Killing {him} is the only way to win.' };
    return { kind: 'hunt', node: k.loc, title: 'Hunt {him} down', detail: `You’re ready. {He}’s at ${at(k.loc)}: go and attack.`, why: 'Killing {him} is the only way to win.' };
  }
  if (g.node !== h.loc && npcAt(s, g.node) > 0) {
    const n = npcAt(s, g.node);
    return { kind: 'rescue', node: g.node, title: 'Rescue a survivor', detail: `${n > 1 ? `${n} survivors wait` : 'A survivor waits'} at ${at(g.node)}. Reach them, then an exit.`, why: rescueWhy };
  }
  if (isSearch(c, g.node) && (s.piles[g.node]?.cards.length ?? 0) > 0) {
    const here = g.node === h.loc;
    if (!bestWeapon(c, s, 0)) return { kind: 'arm', node: here ? undefined : g.node, title: 'Find a weapon', detail: here ? 'Search here: a weapon makes your heavy hits hurt.' : `Search ${at(g.node)}: a weapon makes your heavy hits hurt.`, why: 'Weapons add damage to heavy attacks like Full Swing.' };
    return { kind: 'supplies', node: here ? undefined : g.node, title: 'Gear up', detail: here ? 'Search here for more items.' : `Search ${at(g.node)} for more items.`, why: 'No one needs saving right now.' };
  }
  if (!hasTag(c, s, 'attack')) return { kind: 'prep', title: 'Get attack cards', detail: 'Buy cards from the Fight shelf in Planning, then hunt {him}.', why: 'You can’t hurt {him} without an attack card.' };
  return { kind: 'hunt', node: k.loc, title: 'Hunt {him} down', detail: `{He}’s at ${at(k.loc)}: go and attack.`, why: 'Killing {him} is the only way to win.' };
}

const NEED: Record<BuyNeed, [string, string]> = {
  attack: ['an attack card (<b>Fight</b>)', 'attack cards (<b>Fight</b>)'],
  move: ['a <b>Move</b> card', '<b>Move</b> cards'],
  react: ['a <b>Defend</b> card for {his} turn', '<b>Defend</b> cards'],
  search: ['a <b>Search</b> card', '<b>Search</b> cards'],
  heal: ['a heal (<b>Recover</b>)', 'heals (<b>Recover</b>)'],
  calm: ['a calm-down card (<b>Recover</b>)', 'calm-down cards (<b>Recover</b>)'],
  rally: ['a card to call survivors over (<b>Tricks</b>)', 'cards to call survivors over'],
  hide: ['a hiding card', 'hiding cards'],
  barricade: ['a barricade', 'barricades'],
  nerve: ['a nerve card', 'nerve cards'],
  lure: ['a lure', 'lures'],
  focus: ['a focus card', 'focus cards'],
  reaction: ['a <b>Defend</b> card', '<b>Defend</b> cards'],
};

/**
 * Planning: what the hand is missing for next turn, most important first. The
 * same gaps the Hint buys for, and only ones the shop can still fill right now.
 */
export function planNeeds(c: Content, s: GameState): string[] {
  const { deficit, priority } = buyDeficits(c, s);
  const fills = (need: BuyNeed) =>
    c.actions.some((d) => (need === 'react' ? d.kind === 'reaction' : d.kind === 'action' && d.tags.includes(need)) && check(c, s, { type: 'buy', id: d.id }).ok);
  return (Object.keys(deficit) as BuyNeed[])
    .filter((n) => (deficit[n] ?? 0) > 0 && fills(n))
    .sort((a, b) => (priority[b] ?? 0) - (priority[a] ?? 0))
    .map((n) => (deficit[n]! > 1 ? `${deficit[n]} ${NEED[n][1]}` : NEED[n][0]));
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The suggested next action, and why, in one short line. */
export function advise(c: Content, s: GameState): { action: Action; why: string } {
  // The tutorial night scripts its first buy: Full Swing, which its Tire Iron adds to.
  const swing = 'ac-fullswing';
  if (s.staged && s.phase === 'planning' && s.round === 1 && !s.heroine.hand.some((x) => x.id === swing) && check(c, s, { type: 'buy', id: swing }).ok) {
    const action: Action = { type: 'buy', id: swing };
    return { action, why: `Buy <b>${actionDef(c, swing).name}</b> (${cardCost(c, actionDef(c, swing))} nerve): your ${bestWeapon(c, s, 0) ? itemDef(c, bestWeapon(c, s, 0)!.id).name : 'weapon'} adds to it.` };
  }
  const action = botAction(c, s);
  return { action, why: reason(c, s, action) };
}

function reason(c: Content, s: GameState, a: Action): string {
  const h = s.heroine;
  const k = s.killer;
  const goal = currentGoal(c, s);
  const toGoal = goal.node && goal.node !== h.loc ? `${goal.title}: head for ${nodeName(c, goal.node)}.` : goal.detail;
  switch (a.type) {
    case 'playCard': {
      const d = actionDef(c, h.hand.find((x) => x.uid === a.uid)!.id);
      const nm = `<b>${d.name}</b>`;
      if (d.tags.includes('attack')) {
        if (k.loc !== h.loc && minionsAt(s, h.loc).length) return `Play ${nm}: clear the ${c.killer.minions?.plural ?? 'minions'} off you.`;
        const w = bestWeapon(c, s, 0);
        const plus = !d.light && w ? ` Your ${itemDef(c, w.id).name} adds to it.` : '';
        return `Play ${nm}: {he}’s in reach, hit {him}.${plus}`;
      }
      if (d.tags.includes('move')) return `Play ${nm}. ${toGoal}`;
      if (d.tags.includes('search')) return `Play ${nm}: you’re on an item pile. Search it.`;
      if (d.tags.includes('rally')) return `Play ${nm}: a survivor is next door. Call them over.`;
      if (d.tags.includes('heal')) return `Play ${nm}: you’re hurt and {he}’s not close. Patch up.`;
      if (d.tags.includes('calm')) return `Play ${nm}: horror ${h.horror} costs you dice. Calm down.`;
      if (d.tags.includes('hide') || d.tags.includes('barricade')) return `Play ${nm}: {he}’s next door and you’re hurt.`;
      if (d.tags.includes('focus')) return `Play ${nm}: it powers up your next attack.`;
      return `Play ${nm}.`;
    }
    case 'discardForNerve':
      return 'Discard a card you won’t need for 1 nerve.';
    case 'step':
      return `Click <b>${nodeName(c, a.to)}</b>. ${toGoal}`;
    case 'stopMove':
      return 'Stop here: this is where you want to be.';
    case 'setBring':
      return `Bring ${plural(a.n, 'survivor')} with you.`;
    case 'convert':
      return `Buy up the ${s.rolling?.dice[a.die] ?? ''}: 2 cards for a better result.`;
    case 'resolveRoll':
      return 'Keep this result.';
    case 'keep': {
      const p = s.pending?.kind === 'search' ? s.pending : undefined;
      const names = p ? a.picks.map((i) => itemDef(c, p.drawn[i]).name).join(' and ') : '';
      return names ? `Keep the <b>${names}</b>.` : 'Keep what helps most.';
    }
    case 'react': {
      const d = actionDef(c, h.hand.find((x) => x.uid === a.uid)!.id);
      return `Play <b>${d.name}</b>: it softens this hit. ${totalHealth(s) <= (s.attack?.damage ?? 0) ? 'This one could finish you.' : ''}`.trim();
    }
    case 'takeHit':
      return 'Take the hit and keep your cards.';
    case 'aim':
      return a.at === 'killer' ? 'Hit {him}: {he}’s nearly done.' : `Hit the ${c.killer.minions?.plural ?? 'minions'}.`;
    case 'useItem': {
      const it = [...h.items, ...h.pack].find((x) => x.uid === a.uid);
      return it ? `Use the <b>${itemDef(c, it.id).name}</b> now.` : 'Use your item now.';
    }
    case 'useAbility':
      return `Your ability <b>${c.heroine.ability.name}</b> is ready: use it.`;
    case 'answer':
      return 'Answer the phone.';
    case 'ready':
      return 'Put your best item in your hands.';
    case 'endAction':
      return h.nerve > 0 ? 'Nothing useful left: <b>End Action</b>. Leftover nerve buys cards.' : 'Out of nerve: <b>End Action</b>.';
    case 'buy': {
      const d = actionDef(c, a.id);
      const why = d.kind === 'reaction'
        ? 'it blocks {his} attack on {his} turn'
        : d.tags.includes('attack')
          ? 'you’ll need to hit {him}'
          : d.tags.includes('move')
            ? 'you need a way to move next turn'
            : d.tags.includes('search')
              ? 'to search item piles'
              : d.tags.includes('heal')
                ? 'you’re hurt'
                : d.tags.includes('calm')
                  ? 'horror is costing you dice'
                  : d.tags.includes('rally')
                    ? 'to call survivors over'
                    : 'it fills a gap in your hand';
      // Name the gap this card fills, in the same words as the shop's header, so the two never disagree.
      const { deficit } = buyDeficits(c, s);
      const need = (d.kind === 'reaction' ? (['react', 'reaction'] as BuyNeed[]) : (d.tags as BuyNeed[])).find((t) => (deficit[t] ?? 0) > 0);
      const n = need ? deficit[need]! : 0;
      const still = need && n > 1 ? `you still need ${n} ${NEED[need][1]}` : need ? `you still need ${NEED[need][0]}` : why;
      return `Buy <b>${d.name}</b>${cardCost(c, d) ? ` (${cardCost(c, d)} nerve)` : ''}: ${still}.`;
    }
    case 'endPlanning':
      return 'You’re set for next turn: click <b>Done</b>.';
    case 'endUpkeep':
      return 'On to the next turn.';
    default:
      return '';
  }
}

/** A CSS selector for the thing the advice points at (for the Show me pointer). */
export function adviceTarget(a: Action): string | undefined {
  switch (a.type) {
    case 'playCard':
      return `[data-card="${a.uid}"]`;
    case 'react':
      return `[data-react="${a.uid}"]`;
    case 'step':
      return `[data-node="${a.to}"]`;
    case 'buy':
      return `[data-buy="${a.id}"]`;
    case 'useItem':
      return `[data-item="${a.uid}"]`;
    case 'useAbility':
      return '[data-act=useAbility]';
    case 'convert':
      return `[data-die="${a.die}"]`;
    case 'resolveRoll':
      return '[data-act=resolveRoll]';
    case 'keep':
      return a.picks.length ? `[data-spick="${a.picks[0]}"]` : '[data-go=keepPicks]';
    case 'takeHit':
      return '[data-act=takeHit]';
    case 'aim':
      return a.at === 'killer' ? '[data-aim=killer]' : '[data-aim=minions], [data-go=aimMinions]';
    case 'endAction':
      return '[data-act=endAction]';
    case 'endPlanning':
      return '[data-act=endPlanning]';
    case 'stopMove':
      return '[data-act=stopMove]';
    default:
      return undefined;
  }
}

