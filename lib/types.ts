export type MyTier = "S+" | "S" | "A" | "B" | "C" | "D" | "F";

export type Archetype =
  | "Rushdown"
  | "Zoner"
  | "Swordie"
  | "Grappler"
  | "Setup/Trap"
  | "All-rounder"
  | "Heavy Bruiser"
  | "Aerial";

export interface Fighter {
  character: string;
  myTier: MyTier;
  myRankInTier: number;
  myOverallRank: number;
  officialTier: string;
  officialRankInTier: number;
  officialOverallRank: number;
  /** official_overall_rank - my_overall_rank. Positive = rated above the meta. */
  tierDelta: number;
  archetype: Archetype;
  weightClass: string;
  mobility: string;
  hasGimmickMechanic: boolean;
  franchise: string;
  franchiseGenre: string;
  party: string;
  smashDebut: string;
  isDlc: boolean;
  isEcho: boolean;
  projectileUser: boolean;
  disjointUser: boolean;
}

/** Every facet that can both filter the roster and split it into groups. */
export type FacetKey =
  | "archetype"
  | "weightClass"
  | "mobility"
  | "hasGimmickMechanic"
  | "projectileUser"
  | "disjointUser"
  | "franchise"
  | "franchiseGenre"
  | "party"
  | "smashDebut"
  | "myTier";

/** null = "either", true/false = require that value. */
export type TriState = boolean | null;

export interface FilterState {
  archetype: string[];
  franchise: string[];
  mobility: string[];
  weightClass: string[];
  party: string[];
  isDlc: TriState;
  isEcho: TriState;
  hasGimmickMechanic: TriState;
  projectileUser: TriState;
  disjointUser: TriState;
}

export const EMPTY_FILTERS: FilterState = {
  archetype: [],
  franchise: [],
  mobility: [],
  weightClass: [],
  party: [],
  isDlc: null,
  isEcho: null,
  hasGimmickMechanic: null,
  projectileUser: null,
  disjointUser: null,
};

export interface GroupStat {
  key: string;
  n: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  /** Percentile bootstrap 95% CI of the mean. null when n is too small to resample. */
  ci: [number, number] | null;
  /** Two-sided permutation p-value for "this group's mean delta is 0". */
  p: number | null;
  /** Spearman rho between my rank and official rank inside this group. */
  rho: number | null;
  values: number[];
  members: Fighter[];
  /** n < MIN_GROUP_N: render, but never as a finding. */
  underpowered: boolean;
}

/** Below this, a group is shown but its statistics are suppressed. */
export const MIN_GROUP_N = 5;
