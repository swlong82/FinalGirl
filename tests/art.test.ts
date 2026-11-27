import { describe, expect, it } from 'vitest';
import { HEROINES, KILLERS, LOCATIONS } from '../src/content/registry';
// @ts-expect-error plain ESM script without types
import { ASSETS, slug } from '../scripts/flux/prompts.mjs';

// Every piece of content has a painted-art prompt, so a new pack can't ship with holes in the art queue.
describe('art queue', () => {
  const keys = new Set((ASSETS as { key: string }[]).map((a) => a.key));
  it('covers every backdrop, portrait, node icon, card still and item', () => {
    const missing: string[] = [];
    const need = (k: string) => keys.has(k) || missing.push(k);
    for (const l of LOCATIONS) {
      need(`backdrop/${l.art}`);
      need(`backdrop/${l.art}-finale`);
      for (const n of l.nodes) need(`icon/${n.icon}`);
      for (const e of [...l.terror, ...l.events]) need(`still/${e.id}`);
      for (const i of l.items) need(`item/${slug(i.name)}`);
    }
    for (const k of KILLERS) {
      need(`portrait/killer-${k.art}`);
      for (const e of k.terror) need(`still/${e.id}`);
      for (const i of k.items) need(`item/${slug(i.name)}`);
    }
    for (const h of HEROINES) need(`portrait/heroine-${h.id}`);
    expect(missing).toEqual([]);
  });
});
