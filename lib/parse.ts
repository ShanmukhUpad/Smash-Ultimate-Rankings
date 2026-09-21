import type { Archetype, Fighter, MyTier } from "./types.ts";

const COLUMNS = [
  "character",
  "my_tier",
  "my_rank_in_tier",
  "my_overall_rank",
  "official_tier",
  "official_rank_in_tier",
  "official_overall_rank",
  "tier_delta",
  "archetype",
  "weight_class",
  "mobility",
  "has_gimmick_mechanic",
  "franchise",
  "franchise_genre",
  "party",
  "smash_debut",
  "is_dlc",
  "is_echo",
  "projectile_user",
  "disjoint_user",
] as const;

/**
 * Genre buckets that are merged for display. "JRPG", "Strategy RPG" and "RPG"
 * split the same shelf between them - EarthBound and Pokemon, then Dragon Quest,
 * Final Fantasy, Persona and Xenoblade, then Fire Emblem - leaving the genre
 * view with several small buckets that all read as the same thing. They are
 * folded into one.
 *
 * "Action RPG" (Kingdom Hearts, a single fighter) is left alone.
 *
 * The CSV is untouched; this is a display-time normalisation.
 */
const GENRE_MERGES: Record<string, string> = {
  JRPG: "RPG",
  "Strategy RPG": "RPG",
};

export function normaliseGenre(genre: string): string {
  return GENRE_MERGES[genre] ?? genre;
}

function bool(raw: string, row: number, col: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  throw new Error(`Row ${row}: ${col} is "${raw}", expected True or False`);
}

function int(raw: string, row: number, col: string): number {
  const n = Number(raw.trim());
  if (!Number.isInteger(n)) {
    throw new Error(`Row ${row}: ${col} is "${raw}", expected an integer`);
  }
  return n;
}

/**
 * The source CSV is plain ASCII with no quoted fields (verified), so a split on
 * commas is sufficient. Field count is asserted per row so that stops being true
 * loudly rather than silently.
 */
export function parseFighters(csv: string): Fighter[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) throw new Error("CSV has no data rows");

  const header = lines[0].split(",").map((h) => h.trim());
  COLUMNS.forEach((expected, i) => {
    if (header[i] !== expected) {
      throw new Error(`Header column ${i} is "${header[i]}", expected "${expected}"`);
    }
  });

  const fighters = lines.slice(1).map((line, i): Fighter => {
    const row = i + 2;
    const c = line.split(",");
    if (c.length !== COLUMNS.length) {
      throw new Error(`Row ${row}: ${c.length} fields, expected ${COLUMNS.length}`);
    }
    const [
      character,
      myTier,
      myRankInTier,
      myOverallRank,
      officialTier,
      officialRankInTier,
      officialOverallRank,
      tierDelta,
      archetype,
      weightClass,
      mobility,
      hasGimmickMechanic,
      franchise,
      franchiseGenre,
      party,
      smashDebut,
      isDlc,
      isEcho,
      projectileUser,
      disjointUser,
    ] = c;

    return {
      character: character.trim(),
      myTier: myTier.trim() as MyTier,
      myRankInTier: int(myRankInTier, row, "my_rank_in_tier"),
      myOverallRank: int(myOverallRank, row, "my_overall_rank"),
      officialTier: officialTier.trim(),
      officialRankInTier: int(officialRankInTier, row, "official_rank_in_tier"),
      officialOverallRank: int(officialOverallRank, row, "official_overall_rank"),
      tierDelta: int(tierDelta, row, "tier_delta"),
      archetype: archetype.trim() as Archetype,
      weightClass: weightClass.trim(),
      mobility: mobility.trim(),
      hasGimmickMechanic: bool(hasGimmickMechanic, row, "has_gimmick_mechanic"),
      franchise: franchise.trim(),
      franchiseGenre: normaliseGenre(franchiseGenre.trim()),
      party: party.trim(),
      smashDebut: smashDebut.trim(),
      isDlc: bool(isDlc, row, "is_dlc"),
      isEcho: bool(isEcho, row, "is_echo"),
      projectileUser: bool(projectileUser, row, "projectile_user"),
      disjointUser: bool(disjointUser, row, "disjoint_user"),
    };
  });

  assertConsistent(fighters);
  return fighters;
}

/**
 * The whole dashboard assumes both rank columns are complete permutations of
 * 1..n and that tier_delta is their difference. Several readings depend on it -
 * most of all that the roster-wide mean delta is exactly 0 - so an edited CSV
 * that breaks the invariant must fail the build rather than skew the charts.
 */
export function assertConsistent(fighters: Fighter[]): void {
  const n = fighters.length;
  const mine = new Set<number>();
  const official = new Set<number>();

  for (const f of fighters) {
    if (f.officialOverallRank - f.myOverallRank !== f.tierDelta) {
      throw new Error(
        `${f.character}: tier_delta is ${f.tierDelta} but ` +
          `official(${f.officialOverallRank}) - mine(${f.myOverallRank}) = ` +
          `${f.officialOverallRank - f.myOverallRank}`
      );
    }
    mine.add(f.myOverallRank);
    official.add(f.officialOverallRank);
  }

  for (const [label, set] of [
    ["my_overall_rank", mine],
    ["official_overall_rank", official],
  ] as const) {
    if (set.size !== n) throw new Error(`${label} has duplicates across ${n} fighters`);
    for (let r = 1; r <= n; r++) {
      if (!set.has(r)) throw new Error(`${label} is missing rank ${r} of ${n}`);
    }
  }
}
