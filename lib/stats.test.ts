import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseFighters } from "./parse.ts";
import {
  bootstrapCI,
  groupStats,
  mean,
  midranks,
  permutationTest,
  quantileSorted,
  spearman,
  spearmanOf,
  stdDev,
  silvermanBandwidth,
  kernelDensity,
  histogram,
  shareWithin,
} from "./stats.ts";

const roster = parseFighters(
  readFileSync(path.join(process.cwd(), "smash_tier_analysis.csv"), "utf8")
);

test("midranks average ties", () => {
  assert.deepEqual(midranks([10, 20, 20, 40]), [1, 2.5, 2.5, 4]);
});

test("quantiles interpolate", () => {
  const s = [1, 2, 3, 4];
  assert.equal(quantileSorted(s, 0.5), 2.5);
  assert.equal(quantileSorted(s, 0.25), 1.75);
});

test("spearman is +1 for a monotone pair and -1 for a reversed one", () => {
  const xs = [1, 2, 3, 4, 5];
  assert.equal(spearman(xs, [2, 4, 6, 8, 10]), 1);
  assert.equal(spearman(xs, [10, 8, 6, 4, 2]), -1);
});

test("spearman matches a hand-computed case", () => {
  // d = [0, 1, -1, 0, 0] -> 1 - 6*2 / (5*24) = 0.9
  const rho = spearman([1, 2, 3, 4, 5], [1, 3, 2, 4, 5]);
  assert.ok(rho !== null && Math.abs(rho - 0.9) < 1e-12);
});

test("spearman is unchanged by re-ranking a subset", () => {
  const subset = roster.filter((f) => f.archetype === "Zoner");
  const global = spearmanOf(subset);
  const local = spearman(
    midranks(subset.map((f) => f.myOverallRank)),
    midranks(subset.map((f) => f.officialOverallRank))
  );
  assert.ok(global !== null && local !== null);
  assert.ok(Math.abs(global - local) < 1e-12);
});

test("the roster reproduces the known headline numbers", () => {
  assert.equal(roster.length, 86);

  const rho = spearmanOf(roster);
  assert.ok(rho !== null);
  assert.equal(Number(rho.toFixed(2)), -0.21);

  // Both rank columns are permutations of 1..86, so this is 0 exactly.
  assert.ok(Math.abs(mean(roster.map((f) => f.tierDelta))) < 1e-12);

  const setup = roster.filter((f) => f.archetype === "Setup/Trap");
  assert.equal(setup.length, 14);
  assert.equal(Number(mean(setup.map((f) => f.tierDelta)).toFixed(1)), -39.9);

  const disjoint = roster.filter((f) => f.disjointUser);
  const noDisjoint = roster.filter((f) => !f.disjointUser);
  assert.equal(Number(mean(disjoint.map((f) => f.tierDelta)).toFixed(1)), 20.4);
  assert.equal(Number(mean(noDisjoint.map((f) => f.tierDelta)).toFixed(1)), -12.7);
});

test("bootstrap CI brackets the mean and is suppressed below n=5", () => {
  const values = roster.map((f) => f.tierDelta);
  const ci = bootstrapCI(values, 2000, 3);
  assert.ok(ci);
  assert.ok(ci[0] < mean(values) && mean(values) < ci[1]);
  assert.equal(bootstrapCI([1, 2, 3, 4], 2000, 3), null);
});

test("bootstrap CI is deterministic for a given seed", () => {
  const v = roster.map((f) => f.tierDelta);
  assert.deepEqual(bootstrapCI(v, 500, 42), bootstrapCI(v, 500, 42));
});

test("permutation test reports p near 1 when labels carry no signal", () => {
  // Two groups drawn from the same interleaved sequence: no real difference.
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < 40; i++) (i % 2 ? a : b).push(i);
  const p = permutationTest(
    [
      { key: "a", values: a },
      { key: "b", values: b },
    ],
    2000
  );
  assert.ok((p.get("a") ?? 0) > 0.5);
});

test("permutation test flags a group that is genuinely shifted", () => {
  const p = permutationTest(
    [
      { key: "high", values: Array.from({ length: 20 }, (_, i) => 50 + i) },
      { key: "low", values: Array.from({ length: 20 }, (_, i) => -50 - i) },
    ],
    2000
  );
  assert.ok((p.get("high") ?? 1) < 0.01);
});

test("groupStats suppresses statistics for small groups", () => {
  const stats = groupStats(roster, (f) => f.archetype);
  const aerial = stats.find((g) => g.key === "Aerial");
  assert.ok(aerial);
  assert.equal(aerial.n, 1);
  assert.equal(aerial.underpowered, true);
  assert.equal(aerial.p, null);
  assert.equal(aerial.rho, null);
  assert.equal(aerial.ci, null);

  const rushdown = stats.find((g) => g.key === "Rushdown");
  assert.ok(rushdown);
  assert.equal(rushdown.n, 22);
  assert.equal(rushdown.underpowered, false);
  assert.ok(rushdown.ci);
  assert.ok(rushdown.p !== null);
});

test("group means sum back to zero across a full partition", () => {
  const stats = groupStats(roster, (f) => f.archetype, { permutationReps: 1 });
  const weighted = stats.reduce((s, g) => s + g.mean * g.n, 0);
  assert.ok(Math.abs(weighted) < 1e-9);
});

test("every fighter resolves to icon files that exist", async () => {
  const { iconFrames } = await import("./icons.ts");
  const files = new Set(
    (await import("node:fs")).readdirSync(path.join(process.cwd(), "public/icons"))
  );
  // Checks every frame, so a rotating fighter cannot half-work.
  const missing = roster
    .flatMap((f) =>
      iconFrames(f.character).map((slug) => ({
        name: f.character,
        file: `${slug}.png`,
      }))
    )
    .filter((x) => !files.has(x.file));
  assert.deepEqual(missing, []);
});

test("no icon in the set goes unused except by design", async () => {
  const { iconFrames } = await import("./icons.ts");
  const files = (await import("node:fs")).readdirSync(
    path.join(process.cwd(), "public/icons")
  );
  const used = new Set(
    roster.flatMap((f) => iconFrames(f.character).map((slug) => `${slug}.png`))
  );
  // Pokemon Trainer shows his three Pokemon rather than himself, so the
  // trainer portrait is deliberately on the shelf. Nothing else may be.
  assert.deepEqual(
    files.filter((f) => !used.has(f)),
    ["pokemon_trainer.png"]
  );
  assert.equal(files.length, 90);
});

test("rotating portraits point at files that exist", async () => {
  const { ICON_CYCLE, iconFrames } = await import("./icons.ts");
  const files = new Set(
    (await import("node:fs")).readdirSync(path.join(process.cwd(), "public/icons"))
  );

  // Pokemon Trainer really is three characters sharing a slot.
  assert.deepEqual(iconFrames("Pokemon Trainer"), [
    "squirtle",
    "ivysaur",
    "charizard",
  ]);

  const broken: string[] = [];
  for (const [name, frames] of Object.entries(ICON_CYCLE)) {
    for (const slug of frames) {
      if (!files.has(`${slug}.png`)) broken.push(`${name} -> ${slug}.png`);
    }
  }
  assert.deepEqual(broken, []);
});

test("a single-frame fighter never cycles", async () => {
  const { iconFrames } = await import("./icons.ts");
  assert.equal(iconFrames("Mario").length, 1);
});

test("Pyra/Mythra alternates, and each Mii keeps its own portrait", async () => {
  const { iconFrames, iconFrameLabel } = await import("./icons.ts");

  assert.deepEqual(iconFrames("Pyra/Mythra"), ["homura", "mythra"]);
  assert.equal(iconFrameLabel("Pyra/Mythra", 0), "Pyra");
  assert.equal(iconFrameLabel("Pyra/Mythra", 1), "Mythra");
  assert.equal(iconFrameLabel("Pyra/Mythra", 2), "Pyra");

  // Three fighters, three different files - no longer one shared Mii.
  const miis = ["Mii Brawler", "Mii Swordfighter", "Mii Gunner"];
  const slugs = miis.map((m) => iconFrames(m)[0]);
  assert.deepEqual(slugs, ["mii_brawler", "mii_swordfighter", "mii_gunner"]);
  assert.equal(new Set(slugs).size, 3);
});

test("JRPG and Strategy RPG fold into RPG; Action RPG does not", async () => {
  const { normaliseGenre } = await import("./parse.ts");
  assert.equal(normaliseGenre("JRPG"), "RPG");
  assert.equal(normaliseGenre("Strategy RPG"), "RPG");
  assert.equal(normaliseGenre("RPG"), "RPG");
  assert.equal(normaliseGenre("Action RPG"), "Action RPG");

  const genres = new Set(roster.map((f) => f.franchiseGenre));
  assert.equal(genres.has("JRPG"), false);
  assert.equal(genres.has("Strategy RPG"), false);
  assert.equal(genres.has("Action RPG"), true);

  // EarthBound + Pokemon (was RPG), Dragon Quest, Final Fantasy, Persona and
  // Xenoblade (was JRPG), Fire Emblem (was Strategy RPG).
  const rpg = roster.filter((f) => f.franchiseGenre === "RPG");
  assert.equal(rpg.length, 24);
  assert.deepEqual(
    [...new Set(rpg.map((f) => f.franchise))].sort(),
    [
      "Dragon Quest",
      "EarthBound",
      "Final Fantasy",
      "Fire Emblem",
      "Persona",
      "Pokemon",
      "Xenoblade",
    ]
  );
});

test("standard deviation and Silverman bandwidth", () => {
  assert.equal(stdDev([2, 4, 4, 4, 5, 5, 7, 9]).toFixed(4), "2.1381");
  assert.equal(stdDev([5]), 0);
  assert.ok(silvermanBandwidth(roster.map((f) => f.tierDelta)) > 0);
});

test("kernel density integrates to about 1 over a wide range", () => {
  const values = roster.map((f) => f.tierDelta);
  const from = -160;
  const to = 160;
  const steps = 800;
  const pts = kernelDensity(values, from, to, steps);
  const dx = (to - from) / steps;
  // Trapezoid rule over the sampled grid.
  let area = 0;
  for (let i = 1; i < pts.length; i++) area += ((pts[i].y + pts[i - 1].y) / 2) * dx;
  assert.ok(Math.abs(area - 1) < 0.01, `area was ${area}`);
  assert.ok(pts.every((p) => p.y >= 0));
});

test("histogram bins every value exactly once", () => {
  const values = roster.map((f) => f.tierDelta);
  const bins = histogram(values, -90, 90, 10);
  assert.equal(
    bins.reduce((s, b) => s + b.n, 0),
    values.length
  );
});

test("tier delta is near normal in the middle and light in the tails", () => {
  const values = roster.map((f) => f.tierDelta);
  assert.equal(Math.abs(mean(values)) < 1e-12, true);
  assert.equal(stdDev(values).toFixed(2), "38.86");

  // Matches the normal 68 percent almost exactly.
  assert.equal((shareWithin(values, 1) * 100).toFixed(1), "68.6");
  // But the tails are lighter, because a delta cannot exceed the roster size.
  assert.ok(shareWithin(values, 2) > 0.97);
  assert.equal(shareWithin(values, 3), 1);
});
