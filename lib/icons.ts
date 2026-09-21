import { asset } from "./assets.ts";

/**
 * Stock-icon lookup: CSV character name -> file in /public/icons.
 *
 * Most names normalise straight onto a filename. The rest need an explicit
 * alias because the icon set ships several characters under their Japanese
 * names, and because the three Mii portraits come from the all-colours sheet
 * under their internal names rather than from the main 84-icon set.
 */

/** Lowercase, strip punctuation, collapse to underscores. */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Names whose icon file is not simply the normalised character name. */
const ALIASES: Record<string, string> = {
  Hero: "dq_hero", // Dragon Quest hero
  Incineroar: "gaogaen", // ガオガエン
  "Piranha Plant": "packun_flower", // パックンフラワー
  "Min Min": "minmin",
};

/**
 * Fighters who are really several characters in one slot, and so rotate through
 * several portraits rather than sitting on one.
 */
export const ICON_CYCLE: Record<string, string[]> = {
  "Pokemon Trainer": ["squirtle", "ivysaur", "charizard"],
  "Pyra/Mythra": ["homura", "mythra"],
};

/** Display names for slugs that do not read as the character they show. */
const FRAME_LABELS: Record<string, string> = {
  homura: "Pyra",
  mythra: "Mythra",
  squirtle: "Squirtle",
  ivysaur: "Ivysaur",
  charizard: "Charizard",
};

/** How long each frame is held, in milliseconds. */
export const CYCLE_MS = 1500;

export function iconSlug(character: string): string {
  return ALIASES[character] ?? normalise(character);
}

/** Every portrait this character rotates through, in order. */
export function iconFrames(character: string): string[] {
  const cycle = ICON_CYCLE[character];
  if (cycle && cycle.length > 0) return cycle;
  return [iconSlug(character)];
}

/**
 * The portrait for a given global tick. Pure, so SVG charts can render many
 * fighters from one shared tick instead of one timer per mark.
 */
export function iconSrcAt(character: string, tick: number): string {
  const frames = iconFrames(character);
  return asset(`/icons/${frames[tick % frames.length]}.png`);
}

/** Which half of a rotating pair is on screen, for the detail panel. */
export function iconFrameLabel(character: string, tick: number): string | null {
  const frames = iconFrames(character);
  if (frames.length < 2) return null;
  const slug = frames[tick % frames.length];
  return FRAME_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
