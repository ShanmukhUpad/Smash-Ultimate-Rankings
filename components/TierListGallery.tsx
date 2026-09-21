"use client";

import Link from "next/link";
import { useMemo } from "react";

import { asset } from "@/lib/assets";
import { DELTA_NEGATIVE, DELTA_POSITIVE, MY_TIER_ORDER } from "@/lib/palette";
import { formatDelta, formatRho, spearmanOf } from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { FighterIcon } from "./ui";

interface Plate {
  src: string;
  alt: string;
  title: string;
  /** Which CSV columns this image is the source for. */
  columns: string;
  caption: React.ReactNode;
}

export default function TierListGallery({ fighters }: { fighters: Fighter[] }) {
  const summary = useMemo(() => {
    const sorted = [...fighters].sort((a, b) => b.tierDelta - a.tierDelta);
    const myCounts = MY_TIER_ORDER.map((t) => ({
      tier: t,
      n: fighters.filter((f) => f.myTier === t).length,
    })).filter((x) => x.n > 0);

    return {
      rho: spearmanOf(fighters),
      myCounts,
      top: sorted.slice(0, 3),
      bottom: sorted.slice(-3).reverse(),
    };
  }, [fighters]);

  const plates: Plate[] = [
    {
      src: asset("/tierlists/my-tier-list.png"),
      alt: "Personal Smash Ultimate tier list, S+ through E, with fighter portraits grouped by row.",
      title: "My tier list, comfort and skill",
      columns: "my_tier · my_rank_in_tier · my_overall_rank",
      caption: (
        <>
          How well I play each fighter, not how strong they are. Rows run S+ down to F.
          Position inside a row gives the ordering that becomes{" "}
          <code className="rounded bg-[#2e2e2c] px-1 py-0.5 text-[11px]">my_overall_rank</code>{" "}
          1 to {fighters.length}. The dashboard treats this as the subjective side. A fighter
          sitting high here means comfort, never a viability claim.
        </>
      ),
    },
    {
      src: asset("/tierlists/official-tier-list.png"),
      alt: "The 4th Official Smash Ultimate competitive tier list, S+ through E, produced by Ultimate Rankings.",
      title: "The 4th Official Tier List, competitive viability",
      columns: "official_tier · official_rank_in_tier · official_overall_rank",
      caption: (
        <>
          The community competitive ranking. Finer bands than my own list uses, S+ and S−,
          A+ and A and A−, and so on. Flattened in reading order it becomes{" "}
          <code className="rounded bg-[#2e2e2c] px-1 py-0.5 text-[11px]">
            official_overall_rank
          </code>
          . Every <strong>tier delta</strong> is this rank minus mine. The gap between these
          two images <em>is</em> the dataset.
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Source tier lists</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[var(--color-ink-2)]">
          The two rankings behind every number on the{" "}
          <Link
            href="/"
            className="underline decoration-[var(--color-ink-muted)] underline-offset-2 hover:text-[var(--color-ink)]"
          >
            analysis page
          </Link>
          . Read together they show where what I am good at stops matching what is strong.
        </p>
      </header>

      {/* Standing reminder of the headline result, so the images are read in context. */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            Agreement between them
          </div>
          <div
            className="tnum mt-0.5 text-[22px] font-semibold leading-none"
            style={{
              color:
                summary.rho !== null && summary.rho < 0
                  ? DELTA_NEGATIVE
                  : DELTA_POSITIVE,
            }}
          >
            ρ {formatRho(summary.rho)}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            I rate far above the meta
          </div>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {summary.top.map((f) => (
              <li key={f.character} className="flex items-center gap-1.5 text-[12px]">
                <FighterIcon character={f.character} size={18} />
                <span className="text-[var(--color-ink-2)]">{f.character}</span>
                <span className="tnum" style={{ color: DELTA_POSITIVE }}>
                  {formatDelta(f.tierDelta)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            The meta rates far above me
          </div>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {summary.bottom.map((f) => (
              <li key={f.character} className="flex items-center gap-1.5 text-[12px]">
                <FighterIcon character={f.character} size={18} />
                <span className="text-[var(--color-ink-2)]">{f.character}</span>
                <span className="tnum" style={{ color: DELTA_NEGATIVE }}>
                  {formatDelta(f.tierDelta)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {plates.map((plate, i) => (
          <figure key={plate.src} className="card overflow-hidden">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--color-hairline)] px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold tracking-tight">{plate.title}</h2>
                <p className="tnum mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
                  {plate.columns}
                </p>
              </div>
              <a
                href={plate.src}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full border border-[var(--color-hairline)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink-muted)]"
              >
                Open full size ↗
              </a>
            </figcaption>

            {/* Scroll container. These are wide plates, and squashing them to the
                column width makes the portraits unreadable on a narrow screen. */}
            <div className="overflow-x-auto bg-[#141413]">
              <img
                src={plate.src}
                alt={plate.alt}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="mx-auto block h-auto w-full min-w-[720px] max-w-[1400px]"
              />
            </div>

            <p className="px-5 py-3.5 text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">
              {plate.caption}
            </p>
          </figure>
        ))}
      </div>

      <section className="card mt-6 px-5 py-4">
        <h2 className="text-[13px] font-semibold tracking-tight">
          How my rows split, by count
        </h2>
        <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
          {summary.myCounts.map((t) => (
            <li key={t.tier} className="flex items-baseline gap-1.5">
              <span className="text-[12.5px] font-semibold text-[var(--color-ink)]">
                {t.tier}
              </span>
              <span className="tnum text-[12px] text-[var(--color-ink-muted)]">
                {t.n} fighter{t.n === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
          Both images flatten into a strict 1 to {fighters.length} ordering before any
          statistic runs. That is what makes the two lists comparable at all. The bands
          themselves are not comparable, since my list uses seven and the official one twelve.
        </p>
      </section>
    </div>
  );
}
