/// <reference types="vite/client" />
// LAST LIGHT — painted art rendered offline with Flux (scripts/flux/render.mjs).
// Any image present under src/art/gen/ replaces its procedural SVG; anything not yet
// rendered falls back to the SVG art, so a partly converted set ships safely.
// Images are wrapped in an <svg> with the same viewBox/class as the procedural art,
// so all existing CSS sizing, masks and effects keep working.

const files = import.meta.glob('./gen/**/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const URLS = new Map<string, string>();
for (const [path, url] of Object.entries(files)) URLS.set(path.slice('./gen/'.length, -'.webp'.length), url);

/** URL of a rendered asset, e.g. gen('still/ev-fog'). */
export const gen = (key: string): string | undefined => URLS.get(key);

/** Same slug rule as scripts/flux/prompts.mjs (item keys are slugs of item names). */
export const slug = (s: string): string =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let n = 0;

/** An <svg> showing a painted image edge to edge, plus optional overlay markup. */
export function genSvg(url: string, o: { w: number; h: number; cls: string; label?: string; slice?: boolean; overlay?: string; extra?: string }): string {
  const aria = o.label ? `role="img" aria-label="${o.label}"` : 'aria-hidden="true"';
  const par = o.slice === false ? 'none' : 'xMidYMid slice';
  return `<svg viewBox="0 0 ${o.w} ${o.h}" xmlns="http://www.w3.org/2000/svg" class="${o.cls} gen" ${o.extra ?? ''} ${aria}><image href="${url}" width="${o.w}" height="${o.h}" preserveAspectRatio="${par}"/>${o.overlay ?? ''}</svg>`;
}

/** Vignette + optional colour wash (finale red, hurt red, grim dark) for portraits. */
export function portraitOverlay(o: { tint?: string; tintOpacity?: number; dark?: number }): string {
  const vg = `gv${++n}`;
  return `<defs><radialGradient id="${vg}" cx="50%" cy="45%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs>
  ${o.tint && o.tintOpacity ? `<rect width="100%" height="100%" fill="${o.tint}" opacity="${o.tintOpacity.toFixed(2)}" style="mix-blend-mode:multiply"/>` : ''}
  ${o.dark ? `<rect width="100%" height="100%" fill="#000" opacity="${o.dark.toFixed(2)}"/>` : ''}
  <rect width="100%" height="100%" fill="url(#${vg})"/>`;
}
