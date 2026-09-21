# Smash Ultimate Rankings

Interactive dashboard comparing a personal skill ranking of all 86 Smash Ultimate fighters
against the competitive tier list.

`tier_delta = official_overall_rank - my_overall_rank`. Positive means I rate them above the
meta. Negative means the meta rates them above me.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # statistics and icon-mapping tests
npm run build    # static export to ./out
```

`smash_tier_analysis.csv` in the project root is the single source of truth. It is read and
validated at build time by `app/page.tsx`. Edit the CSV and rebuild. `lib/parse.ts` throws if
`official - mine` does not equal `tier_delta`, or if either rank column stops being a
complete permutation of 1 to n, so a bad edit fails the build instead of skewing the charts.

## Pages

Two routes, switched by the tabs at the top right. `components/TopNav.tsx`, mounted in
`app/layout.tsx`.

- `/` is the analysis dashboard.
- `/tier-lists` holds the two source ranking images, each captioned with the CSV columns it
  produces, plus the headline correlation and the three biggest disagreements each way.

The nav is sticky, so the filter bar sits at `top-[60px]` and the detail panel at
`top-[152px]` rather than at the viewport top.

## What the numbers say

Reproduced by `lib/stats.test.ts`, so a regression in the statistics breaks the suite.

- Overall Spearman rho is -0.21. The two rankings are mildly anti-correlated. Comfort trends
  against viability rather than being merely unrelated to it.
- Mean tier delta across the roster is exactly 0 by construction, since both columns are
  permutations of 1 to 86. Every group mean is a deviation from that fixed zero, and the
  group means sum back to zero. The charts say so where it matters.
- `Setup/Trap` mean is -39.9 across 14 fighters at p below 0.001. Largest archetype effect by
  a wide margin.
- `disjoint_user` splits +20.4 against -12.7. `projectile_user` splits -4.0 against +16.4.
- `has_gimmick_mechanic` splits -1.6 against +3.7. The hypothesis about gimmick and resource
  characters is weak. The signal lives in `Setup/Trap` and in disjoints, not in the gimmick
  flag.

## Statistics

`lib/stats.ts` is pure and unit tested.

- Spearman rho is Pearson correlation on midranks, which is tie safe, rather than the
  `1 - 6*sum(d^2)` shortcut. Correlating global ranks over a filtered subset equals
  re-ranking within it, so filters need no re-ranking.
- 95 percent bootstrap confidence intervals on group means, 2,000 percentile resamples.
- Permutation p-values, 5,000 reps, deltas reshuffled across the same group sizes.
- All resampling uses a seeded `mulberry32`, never `Math.random`, so numbers stay stable
  across renders and identical between server render and hydration.
- Groups under n=5 are drawn but never tested. No interval, no p-value, no rho. Heavy Bruiser
  at n=3 and Aerial at n=1 exist in the data and would otherwise read as findings.

## Colour

Dark-mode steps of a validated 8-slot categorical palette in `lib/palette.ts`, checked
against surface `#1a1a19`. Adjacent pairs pass every gate, worst CVD delta E 8.4 and worst
normal-vision delta E 19.3. The all-pairs test that a scatter implies fails at eight hues, so
`DeltaScatter` carries archetype in marker shape as well as hue, and offers a split by
archetype small-multiples mode as the colour-safe read.

Tier delta uses one diverging scale everywhere. Blue means I rate higher, red means the meta
rates higher, neutral grey at zero.

## Stock icons

`stock_icons/` is the source dataset. The portraits actually used are copied to
`public/icons/`. `lib/icons.ts` maps a CSV character name to a file. Most normalise directly.
The rest need an alias because the set ships some fighters under their Japanese names, so
`gaogaen` is Incineroar, `packun_flower` is Piranha Plant, `dq_hero` is Hero. Tests assert
every fighter resolves to files that exist, and that no shipped icon is silently unused.

Fighters who are several characters in one slot rotate every 1.5 seconds through
`ICON_CYCLE`.

- Pyra/Mythra alternates `homura`, which is Pyra, with `mythra`.
- Pokemon Trainer rotates Squirtle, Ivysaur, Charizard. The trainer's own portrait is
  deliberately unused.

The three Mii fighters each get their own portrait, taken from `Stock Icons All Colors`,
rather than the one generic `mii_fighter.png` in the main set.

One shared interval drives every portrait through `lib/useIconTick.ts` and
`useSyncExternalStore`, so all Pokemon Trainers on screen show the same Pokemon at the same
moment, and the scatter renders 86 marks off a single subscription. Frames cross-fade rather
than swapping `src`, so a rotating portrait never flashes a blank box. Reduced motion freezes
frame 0.

## Genre buckets

`JRPG` and `Strategy RPG` fold into `RPG` at parse time through `normaliseGenre` in
`lib/parse.ts`. The three labels split the same shelf. EarthBound and Pokemon were tagged
`RPG`, Dragon Quest and Final Fantasy and Persona and Xenoblade were `JRPG`, Fire Emblem was
`Strategy RPG`. The merged bucket holds 24 fighters across 7 franchises. `Action RPG`, which
is Kingdom Hearts alone, is left as it is. The CSV is not modified.

## Deployment

Static export, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to
`main`.

GitHub Pages serves a project site from a subpath, so the workflow sets
`NEXT_PUBLIC_BASE_PATH` to the repository name. Next rewrites `next/link` automatically but
not a raw `img` tag, and this project uses plain `img` tags for the stock portraits, so every
absolute asset URL goes through `asset()` in `lib/assets.ts`. `trailingSlash` is on so that
`/tier-lists/` resolves to a real `index.html`.

## Layout

```
app/page.tsx              server component, reads and validates the CSV
app/tier-lists/page.tsx   the two source ranking images
components/Dashboard.tsx  client, filter state and shared hover and selection
components/...            one file per view
lib/stats.ts              correlation, bootstrap, permutation test
lib/palette.ts            validated palette and the facet definitions
lib/parse.ts              CSV to Fighter[] with invariant assertions
lib/icons.ts              character name to portrait, including rotating pairs
```

Hovering any mark highlights that fighter in every view. Clicking pins it in the detail
panel. Filters apply across all views at once. The rank against rank scatter pans by dragging
and zooms on scroll, with a reset control under the plot. `AGENTS.md` and `CLAUDE.md` are generated by
Next.js, not hand written.
