import { MIN_GROUP_N, type Fighter, type GroupStat } from "./types.ts";

/* ------------------------------------------------------------------ *
 * Deterministic RNG.
 * Resampling has to give the same answer on every render (and between the
 * server render and the client hydration), so nothing here uses Math.random.
 * ------------------------------------------------------------------ */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable seed from a label, so each group resamples reproducibly. */
export function seedFrom(label: string): number {
  let h = 2166136261;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * Descriptives
 * ------------------------------------------------------------------ */
export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Linear-interpolated quantile on an already-sorted ascending array. */
export function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Midranks: ties share their average rank. The data has no ties today, but the
 * correlation below is only tie-safe if this is.
 */
export function midranks(xs: number[]): number[] {
  const order = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(xs.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const shared = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[order[k][1]] = shared;
    i = j + 1;
  }
  return ranks;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0) return null;
  return num / den;
}

/**
 * Spearman rho as Pearson on midranks - tie-safe, unlike the 1 - 6*sum(d^2)
 * shortcut. Note that correlating the *global* ranks of a subset gives the same
 * answer as re-ranking within the subset: rank order survives a monotone map.
 */
export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length) throw new Error("spearman: length mismatch");
  return pearson(midranks(xs), midranks(ys));
}

/** Fisher-z 95% interval for a correlation. Approximate; needs n >= 4. */
export function correlationCI(rho: number, n: number): [number, number] | null {
  if (n < 4 || Math.abs(rho) >= 1) return null;
  const z = 0.5 * Math.log((1 + rho) / (1 - rho));
  const se = 1 / Math.sqrt(n - 3);
  const lo = Math.tanh(z - 1.96 * se);
  const hi = Math.tanh(z + 1.96 * se);
  return [lo, hi];
}

export function spearmanOf(fighters: Fighter[]): number | null {
  if (fighters.length < 3) return null;
  return spearman(
    fighters.map((f) => f.myOverallRank),
    fighters.map((f) => f.officialOverallRank)
  );
}

/* ------------------------------------------------------------------ *
 * Resampling
 * ------------------------------------------------------------------ */

/** Percentile bootstrap 95% CI of the mean. */
export function bootstrapCI(
  values: number[],
  reps = 2000,
  seed = 1
): [number, number] | null {
  const n = values.length;
  if (n < MIN_GROUP_N) return null;
  const rand = mulberry32(seed);
  const means = new Float64Array(reps);
  for (let r = 0; r < reps; r++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += values[(rand() * n) | 0];
    means[r] = s / n;
  }
  const sorted = Array.from(means).sort((a, b) => a - b);
  return [quantileSorted(sorted, 0.025), quantileSorted(sorted, 0.975)];
}

/**
 * Two-sided permutation test, one p-value per group.
 *
 * H0: group membership carries no information about tier_delta. Each rep
 * reshuffles every delta across the same group sizes; p is the share of reps
 * whose group mean lands at least as far from the pooled mean as the observed
 * one does.
 *
 * Because both rank columns are permutations of 1..n, the pooled mean is 0 by
 * construction on the full roster. Under a filter it drifts, so deviations are
 * measured from the pooled mean rather than from a hard zero.
 */
export function permutationTest(
  groups: { key: string; values: number[] }[],
  reps = 5000,
  seed = 7
): Map<string, number> {
  const out = new Map<string, number>();
  const pool: number[] = [];
  for (const g of groups) pool.push(...g.values);
  const n = pool.length;
  if (n === 0) return out;

  const pooledMean = mean(pool);
  const sizes = groups.map((g) => g.values.length);
  const observed = groups.map((g) => Math.abs(mean(g.values) - pooledMean));
  const hits = new Array<number>(groups.length).fill(0);

  const rand = mulberry32(seed);
  const shuffled = pool.slice();

  for (let r = 0; r < reps; r++) {
    for (let i = n - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const t = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = t;
    }
    let at = 0;
    for (let g = 0; g < groups.length; g++) {
      const size = sizes[g];
      let s = 0;
      for (let i = 0; i < size; i++) s += shuffled[at + i];
      at += size;
      if (Math.abs(s / size - pooledMean) >= observed[g]) hits[g]++;
    }
  }

  groups.forEach((g, i) => {
    // +1 smoothing: a permutation p-value is never exactly 0.
    out.set(g.key, (hits[i] + 1) / (reps + 1));
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * Grouping
 * ------------------------------------------------------------------ */
export type Accessor = (f: Fighter) => string;

export function groupFighters(
  fighters: Fighter[],
  by: Accessor
): Map<string, Fighter[]> {
  const out = new Map<string, Fighter[]>();
  for (const f of fighters) {
    const k = by(f);
    const bucket = out.get(k);
    if (bucket) bucket.push(f);
    else out.set(k, [f]);
  }
  return out;
}

export interface GroupOptions {
  /** Preferred display order; keys outside it sort by descending n. */
  order?: string[];
  bootstrapReps?: number;
  permutationReps?: number;
}

/** Full statistics for one facet: descriptives, CI, permutation p, within-group rho. */
export function groupStats(
  fighters: Fighter[],
  by: Accessor,
  options: GroupOptions = {}
): GroupStat[] {
  const { order, bootstrapReps = 2000, permutationReps = 5000 } = options;
  const grouped = groupFighters(fighters, by);

  const raw = [...grouped.entries()].map(([key, members]) => ({
    key,
    members,
    values: members.map((f) => f.tierDelta),
  }));

  const pvals = permutationTest(
    raw.map((g) => ({ key: g.key, values: g.values })),
    permutationReps
  );

  const stats: GroupStat[] = raw.map(({ key, members, values }) => {
    const sorted = values.slice().sort((a, b) => a - b);
    const n = values.length;
    const underpowered = n < MIN_GROUP_N;
    return {
      key,
      n,
      mean: mean(values),
      median: quantileSorted(sorted, 0.5),
      q1: quantileSorted(sorted, 0.25),
      q3: quantileSorted(sorted, 0.75),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      ci: bootstrapCI(values, bootstrapReps, seedFrom(key)),
      p: underpowered ? null : (pvals.get(key) ?? null),
      rho: underpowered ? null : spearmanOf(members),
      values,
      members,
      underpowered,
    };
  });

  if (order) {
    const rank = new Map(order.map((k, i) => [k, i]));
    stats.sort((a, b) => {
      const ra = rank.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      return ra !== rb ? ra - rb : b.n - a.n;
    });
  } else {
    stats.sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  }
  return stats;
}

export function formatP(p: number | null): string {
  if (p === null) return "n/a";
  if (p < 0.001) return "p<0.001";
  return `p=${p.toFixed(3)}`;
}

export function formatRho(rho: number | null): string {
  if (rho === null) return "n/a";
  return (rho >= 0 ? "+" : "−") + Math.abs(rho).toFixed(2);
}

export function formatDelta(d: number): string {
  if (d === 0) return "0";
  return (d > 0 ? "+" : "−") + Math.abs(d);
}
