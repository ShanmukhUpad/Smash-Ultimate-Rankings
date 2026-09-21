import type { Archetype, Fighter } from "./types.ts";

/**
 * Dark-mode steps of the validated 8-slot categorical palette.
 * Verified with the data-viz validator against surface #1a1a19:
 *   adjacent pairs -> ALL CHECKS PASS (worst CVD dE 8.4, worst normal dE 19.3).
 *   all pairs      -> FAILS (magenta vs aqua dE 1.6 deutan).
 * Charts that put every archetype on one plane at once (the scatter) therefore
 * carry a second, non-colour channel: a distinct marker shape per archetype.
 */
export const ARCHETYPE_ORDER: Archetype[] = [
  "Rushdown",
  "Zoner",
  "Setup/Trap",
  "Swordie",
  "All-rounder",
  "Grappler",
  "Heavy Bruiser",
  "Aerial",
];

export const ARCHETYPE_COLOR: Record<Archetype, string> = {
  Rushdown: "#3987e5", // slot 1 blue
  Zoner: "#d95926", // slot 2 orange
  "Setup/Trap": "#199e70", // slot 3 aqua
  Swordie: "#c98500", // slot 4 yellow
  "All-rounder": "#d55181", // slot 5 magenta
  Grappler: "#008300", // slot 6 green
  "Heavy Bruiser": "#9085e9", // slot 7 violet
  Aerial: "#e66767", // slot 8 red
};

/** Recharts symbol types - the redundant channel for the all-pairs scatter. */
export const ARCHETYPE_SYMBOL: Record<Archetype, string> = {
  Rushdown: "circle",
  Zoner: "square",
  "Setup/Trap": "triangle",
  Swordie: "diamond",
  "All-rounder": "cross",
  Grappler: "star",
  "Heavy Bruiser": "wye",
  Aerial: "circle",
};

export function archetypeColor(a: string): string {
  return ARCHETYPE_COLOR[a as Archetype] ?? INK.muted;
}

/* ------------------------------------------------------------------ *
 * Diverging scale for tier_delta.
 * Blue <-> red with a neutral grey midpoint, per the reference palette.
 * Semantics are fixed once, everywhere: BLUE = I rate them above the meta
 * (positive delta), RED = the meta rates them above me (negative delta).
 * ------------------------------------------------------------------ */
const POSITIVE_ARM = ["#4d7fae", "#3987e5", "#2a78d6", "#1c5cab"]; // toward +84
const NEGATIVE_ARM = ["#b06a6a", "#e66767", "#d03b3b", "#a82a2a"]; // toward -84
const MIDPOINT = "#5c5c58";

export const DELTA_MAX = 86;

/** Colour for a delta. |delta| picks the step; sign picks the arm. */
export function deltaColor(delta: number): string {
  const mag = Math.min(Math.abs(delta) / DELTA_MAX, 1);
  if (mag < 0.06) return MIDPOINT;
  const arm = delta > 0 ? POSITIVE_ARM : NEGATIVE_ARM;
  const idx = Math.min(arm.length - 1, Math.floor(mag * arm.length));
  return arm[idx];
}

export const DELTA_POSITIVE = "#3987e5";
export const DELTA_NEGATIVE = "#e66767";
export const DELTA_NEUTRAL = MIDPOINT;

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */
export const INK = {
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  surface: "#1a1a19",
  plane: "#0d0d0d",
  border: "rgba(255,255,255,0.10)",
} as const;

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

/* ------------------------------------------------------------------ *
 * Facets - the splits the hypothesis view offers.
 * ------------------------------------------------------------------ */
export interface FacetDef {
  id: string;
  label: string;
  /** Short note explaining what the split is testing. */
  hint: string;
  get: (f: Fighter) => string;
  order?: string[];
}

const YES_NO = ["Yes", "No"];

export const FACETS: FacetDef[] = [
  {
    id: "archetype",
    label: "Archetype",
    hint: "Playstyle class against the comfort gap.",
    get: (f) => f.archetype,
    order: ARCHETYPE_ORDER,
  },
  {
    id: "gimmick",
    label: "Gimmick mechanic",
    hint: "Resource, meter and summon systems. Steve blocks, Hero MP, Joker Arsene.",
    get: (f) => (f.hasGimmickMechanic ? "Yes" : "No"),
    order: YES_NO,
  },
  {
    id: "disjoint",
    label: "Disjoint user",
    hint: "Swords, beams and other hurtbox-free hitboxes.",
    get: (f) => (f.disjointUser ? "Yes" : "No"),
    order: YES_NO,
  },
  {
    id: "projectile",
    label: "Projectile user",
    hint: "Any meaningful ranged option.",
    get: (f) => (f.projectileUser ? "Yes" : "No"),
    order: YES_NO,
  },
  {
    id: "weight",
    label: "Weight class",
    hint: "Heavier fighters survive longer but move worse.",
    get: (f) => f.weightClass,
    order: [
      "Featherweight",
      "Lightweight",
      "Middleweight",
      "Heavyweight",
      "Super Heavyweight",
    ],
  },
  {
    id: "mobility",
    label: "Mobility",
    hint: "Ground and air speed band.",
    get: (f) => f.mobility,
    order: ["Very Fast", "Fast", "Average", "Slow"],
  },
  {
    id: "party",
    label: "Party",
    hint: "Nintendo-owned against guest fighters.",
    get: (f) => f.party,
    order: ["First-party", "Third-party"],
  },
  {
    id: "debut",
    label: "Smash debut",
    hint: "How long the character has been in the series.",
    get: (f) => f.smashDebut,
    order: ["Smash 64", "Melee", "Brawl", "Smash 4", "Ultimate"],
  },
];

export const MY_TIER_ORDER = ["S+", "S", "A", "B", "C", "D", "F"];

export const OFFICIAL_TIER_ORDER = [
  "S+",
  "S-",
  "A+",
  "A",
  "A-",
  "B+",
  "B-",
  "C+",
  "C-",
  "D+",
  "D-",
  "E",
];
