import type { Content, HeroineDef, KillerPack, LocationPack } from '../engine/types';
import { holloway } from './drive-in/location';
import { projectionist } from './projectionist/killer';
import { tideCabins } from './tide-cabins/location';
import { tidewife } from './tidewife/killer';
import { saintAgatha } from './saint-agatha/location';
import { anesthetist } from './anesthetist/killer';
import { whiteoutLodge } from './whiteout-lodge/location';
import { snowblind } from './snowblind/killer';
import { deadAir } from './dead-air/location';
import { caller } from './caller/killer';
import { coreInstincts, heroines } from './heroines/heroines';
import { coreActions, junkActions } from './actions';

// Content registry. Add a new Feature (expansion) by registering its packs here.
// Killers and locations are independent so any killer can stalk any location.
export interface Feature {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  killer: string;
  available: boolean;
}

export const LOCATIONS: LocationPack[] = [holloway, tideCabins, saintAgatha, whiteoutLodge, deadAir];
export const KILLERS: KillerPack[] = [projectionist, tidewife, anesthetist, snowblind, caller];
export const HEROINES: HeroineDef[] = heroines;

export const FEATURES: Feature[] = [
  { id: 'f1', title: 'Feature One: Last Show at the Holloway', subtitle: 'The Projectionist · The Holloway Drive-In', location: holloway.id, killer: projectionist.id, available: true },
  { id: 'f2', title: 'Feature Two: The Tide Cabins', subtitle: 'The Tidewife · The Gullhaven Tide Cabins', location: tideCabins.id, killer: tidewife.id, available: true },
  { id: 'f3', title: 'Feature Three: Saint Agatha After Hours', subtitle: "The Anesthetist · Saint Agatha's West Wing", location: saintAgatha.id, killer: anesthetist.id, available: true },
  { id: 'f4', title: 'Feature Four: Whiteout', subtitle: 'The Snowblind · Kettle Peak Lodge', location: whiteoutLodge.id, killer: snowblind.id, available: true },
  { id: 'f5', title: 'Feature Five: Dead Air', subtitle: 'The Caller · KXRL Hilltop Studio', location: deadAir.id, killer: caller.id, available: true },
];

export function buildContent(locationId: string, killerId: string, heroineId: string): Content {
  const location = LOCATIONS.find((l) => l.id === locationId);
  const killer = KILLERS.find((k) => k.id === killerId);
  const heroine = HEROINES.find((h) => h.id === heroineId);
  if (!location || !killer || !heroine) throw new Error('Unknown content pack');
  return { location, killer, heroine, instincts: coreInstincts, actions: [...coreActions, ...junkActions] };
}
