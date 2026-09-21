import type { Fighter, FilterState, TriState } from "./types.ts";

function matchesList(list: string[], value: string): boolean {
  return list.length === 0 || list.includes(value);
}

function matchesTri(state: TriState, value: boolean): boolean {
  return state === null || state === value;
}

export function applyFilters(fighters: Fighter[], f: FilterState): Fighter[] {
  return fighters.filter(
    (x) =>
      matchesList(f.archetype, x.archetype) &&
      matchesList(f.franchise, x.franchise) &&
      matchesList(f.mobility, x.mobility) &&
      matchesList(f.weightClass, x.weightClass) &&
      matchesList(f.party, x.party) &&
      matchesTri(f.isDlc, x.isDlc) &&
      matchesTri(f.isEcho, x.isEcho) &&
      matchesTri(f.hasGimmickMechanic, x.hasGimmickMechanic) &&
      matchesTri(f.projectileUser, x.projectileUser) &&
      matchesTri(f.disjointUser, x.disjointUser)
  );
}

export function activeFilterCount(f: FilterState): number {
  return (
    f.archetype.length +
    f.franchise.length +
    f.mobility.length +
    f.weightClass.length +
    f.party.length +
    (f.isDlc === null ? 0 : 1) +
    (f.isEcho === null ? 0 : 1) +
    (f.hasGimmickMechanic === null ? 0 : 1) +
    (f.projectileUser === null ? 0 : 1) +
    (f.disjointUser === null ? 0 : 1)
  );
}

export function uniqueSorted(fighters: Fighter[], get: (f: Fighter) => string): string[] {
  return [...new Set(fighters.map(get))].sort((a, b) => a.localeCompare(b));
}

export function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** null -> true -> false -> null */
export function cycleTri(state: TriState): TriState {
  if (state === null) return true;
  if (state === true) return false;
  return null;
}
