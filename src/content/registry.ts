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
import { campTamarack } from './camp-tamarack/location';
import { trapper } from './trapper/killer';
import { starliteGalleria } from './starlite-galleria/location';
import { windowDresser } from './window-dresser/killer';
import { palomaMotorCourt } from './paloma-motor-court/location';
import { nightManager } from './night-manager/killer';
import { rollerdrome } from './rollerdrome/location';
import { mirrorball } from './mirrorball/killer';
import { harrowFarm } from './harrow-farm/location';
import { harvestman } from './harvestman/killer';
import { heroines } from './heroines/heroines';
import { coreActions } from './actions';

// Content registry. Add a new Feature (expansion) by registering its packs here.
// Killers and locations are independent so any killer can stalk any location.
export interface Feature {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  killer: string;
  available: boolean;
  season?: number; // shelf grouping on the Now Showing screen (default 1)
}

export const LOCATIONS: LocationPack[] = [holloway, tideCabins, saintAgatha, whiteoutLodge, deadAir, campTamarack, starliteGalleria, palomaMotorCourt, rollerdrome, harrowFarm];
export const KILLERS: KillerPack[] = [projectionist, tidewife, anesthetist, snowblind, caller, trapper, windowDresser, nightManager, mirrorball, harvestman];
export const HEROINES: HeroineDef[] = heroines;

export const FEATURES: Feature[] = [
  { id: 'f1', title: 'Feature One: Last Show at the Holloway', subtitle: 'The Projectionist · The Holloway Drive-In', location: holloway.id, killer: projectionist.id, available: true },
  { id: 'f2', title: 'Feature Two: The Tide Cabins', subtitle: 'The Tidewife · The Gullhaven Tide Cabins', location: tideCabins.id, killer: tidewife.id, available: true },
  { id: 'f3', title: 'Feature Three: Saint Agatha After Hours', subtitle: "The Anesthetist · Saint Agatha's West Wing", location: saintAgatha.id, killer: anesthetist.id, available: true },
  { id: 'f4', title: 'Feature Four: Whiteout', subtitle: 'The Snowblind · Kettle Peak Lodge', location: whiteoutLodge.id, killer: snowblind.id, available: true },
  { id: 'f5', title: 'Feature Five: Dead Air', subtitle: 'The Caller · KXRL Hilltop Studio', location: deadAir.id, killer: caller.id, available: true },
  // ── Season 2: every feature brings a new location rule and a killer with a signature mechanic.
  { id: 'f6', title: 'Feature Six: Lights Out at Camp Tamarack', subtitle: 'The Trapper · Camp Tamarack', location: campTamarack.id, killer: trapper.id, available: true, season: 2 },
  { id: 'f7', title: 'Feature Seven: Closing Time', subtitle: 'The Window Dresser · Starlite Galleria', location: starliteGalleria.id, killer: windowDresser.id, available: true, season: 2 },
  { id: 'f8', title: 'Feature Eight: No Vacancy', subtitle: 'The Night Manager · The Paloma Motor Court', location: palomaMotorCourt.id, killer: nightManager.id, available: true, season: 2 },
  { id: 'f9', title: 'Feature Nine: Skate Night', subtitle: 'The Mirrorball · Rollerdrome Skateland', location: rollerdrome.id, killer: mirrorball.id, available: true, season: 2 },
  { id: 'f10', title: 'Feature Ten: Harvest Moon', subtitle: 'The Harvestman · Harrow Farm Corn Maze', location: harrowFarm.id, killer: harvestman.id, available: true, season: 2 },
];

export function buildContent(locationId: string, killerId: string, heroineId: string): Content {
  const location = LOCATIONS.find((l) => l.id === locationId);
  const killer = KILLERS.find((k) => k.id === killerId);
  const heroine = HEROINES.find((h) => h.id === heroineId);
  if (!location || !killer || !heroine) throw new Error('Unknown content pack');
  return { location, killer, heroine, actions: coreActions };
}
