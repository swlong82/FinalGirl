// Killer pronouns. Text about the killer writes {he}, {him}, {his} (or {He},
// {Him}, {His}) instead of the bare word; the UI fills them in for the killer
// on screen. Text about anyone else keeps plain words, so "Old Man Gilley and
// his nephew" stays his, while "stun {him}" becomes "stun her" for the Tidewife.

export type Pronoun = 'he' | 'she';

const WORDS: Record<Pronoun, Record<string, string>> = {
  he: { he: 'he', He: 'He', him: 'him', Him: 'Him', his: 'his', His: 'His' },
  she: { he: 'she', He: 'She', him: 'her', Him: 'Her', his: 'her', His: 'Her' },
};

export function fillPronouns(text: string, p: Pronoun = 'he'): string {
  return text.replace(/\{(he|He|him|Him|his|His)\}/g, (_, w: string) => WORDS[p][w]);
}
