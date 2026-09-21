"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { DELTA_NEGATIVE, DELTA_POSITIVE, FACETS, INK } from "@/lib/palette";
import { correlationCI, formatRho, groupStats, spearmanOf } from "@/lib/stats";
import { MIN_GROUP_N, type Fighter } from "@/lib/types";
import { Segmented } from "./ui";

/** Plain-language reading of a rank correlation. */
export function readRho(rho: number | null): string {
  if (rho === null) return "Too few fighters to say";
  const a = Math.abs(rho);
  const dir = rho >= 0 ? "with the meta" : "against the meta";
  if (a < 0.1) return "Essentially unrelated to the meta";
  if (a < 0.3) return `Weakly ${dir}`;
  if (a < 0.5) return `Moderately ${dir}`;
  if (a < 0.7) return `Strongly ${dir}`;
  return `Very strongly ${dir}`;
}

export default function CorrelationTable({
  fighters,
  hovered,
  onHover,
}: {
  fighters: Fighter[];
  hovered: string | null;
  onHover: (name: string | null) => void;
}) {
  const reduce = useReducedMotion();
  const [facetId, setFacetId] = useState("archetype");
  const facet = FACETS.find((f) => f.id === facetId) ?? FACETS[0];

  const overall = useMemo(() => spearmanOf(fighters), [fighters]);
  const overallCI = overall !== null ? correlationCI(overall, fighters.length) : null;

  const rows = useMemo(() => {
    const stats = groupStats(fighters, facet.get, {
      order: facet.order,
      // This table only needs rho; skip the expensive resampling.
      bootstrapReps: 1,
      permutationReps: 1,
    });
    return stats
      .map((g) => ({
        key: g.key,
        n: g.n,
        rho: g.n >= MIN_GROUP_N ? spearmanOf(g.members) : null,
        members: g.members,
      }))
      .sort((a, b) => {
        if (a.rho === null && b.rho === null) return b.n - a.n;
        if (a.rho === null) return 1;
        if (b.rho === null) return -1;
        return Math.abs(b.rho) - Math.abs(a.rho);
      });
  }, [fighters, facet]);

  const barW = 132;
  const bar = (rho: number | null) => {
    if (rho === null) return null;
    const w = (Math.abs(rho) / 1) * (barW / 2);
    return (
      <span
        className="relative inline-block align-middle"
        style={{ width: barW, height: 10 }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px"
          style={{ background: INK.axis }}
        />
        <motion.span
          aria-hidden
          className="absolute top-[1px] h-[8px]"
          initial={false}
          animate={{ width: w }}
          transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
          style={{
            left: rho >= 0 ? "50%" : undefined,
            right: rho >= 0 ? undefined : "50%",
            background: rho >= 0 ? DELTA_POSITIVE : DELTA_NEGATIVE,
            borderRadius: rho >= 0 ? "0 4px 4px 0" : "4px 0 0 4px",
          }}
        />
      </span>
    );
  };

  return (
    <div>
      <div className="mb-4 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            Overall Spearman <span className="normal-case">ρ</span>
          </span>
          <span
            className="tnum text-[30px] font-semibold leading-none"
            style={{
              color:
                overall === null
                  ? INK.muted
                  : overall >= 0
                    ? DELTA_POSITIVE
                    : DELTA_NEGATIVE,
            }}
          >
            {formatRho(overall)}
          </span>
          <span className="text-[12px] text-[var(--color-ink-2)]">
            n={fighters.length}
            {overallCI &&
              ` · 95% CI ${formatRho(overallCI[0])} to ${formatRho(overallCI[1])}`}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">
          My ordering. <strong>{readRho(overall)}</strong>.
          {overall !== null && overall < 0 && (
            <>
              {" "}
              A negative ρ puts the fighters I am most comfortable with in the weaker half
              of the competitive list. Comfort and viability pull in opposite directions,
              not merely unrelated.
            </>
          )}
        </p>
      </div>

      <div className="mb-3">
        <Segmented
          ariaLabel="Correlation split"
          value={facetId}
          onChange={setFacetId}
          options={FACETS.map((f) => ({ value: f.id, label: f.label, title: f.hint }))}
        />
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[var(--color-hairline)] text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            <th className="py-2 pr-3 font-medium">{facet.label}</th>
            <th className="py-2 pr-3 text-right font-medium">n</th>
            <th className="py-2 pr-3 text-right font-medium">
              <span className="normal-case">ρ</span>
            </th>
            <th className="py-2 pr-3 font-medium">
              <span className="normal-case">−1 · 0 · +1</span>
            </th>
            <th className="py-2 font-medium">Reading</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              onMouseEnter={() => onHover(r.members[0]?.character ?? null)}
              onMouseLeave={() => onHover(null)}
              className={`border-b border-[var(--color-hairline)] last:border-0 ${
                r.members.some((m) => m.character === hovered)
                  ? "bg-[rgba(255,255,255,0.04)]"
                  : ""
              }`}
            >
              <td className="py-2 pr-3 text-[12.5px] text-[var(--color-ink-2)]">
                {r.key}
              </td>
              <td className="tnum py-2 pr-3 text-right text-[12px] text-[var(--color-ink-muted)]">
                {r.n}
              </td>
              <td
                className="tnum py-2 pr-3 text-right text-[13px] font-semibold"
                style={{
                  color:
                    r.rho === null
                      ? INK.muted
                      : r.rho >= 0
                        ? DELTA_POSITIVE
                        : DELTA_NEGATIVE,
                }}
              >
                {formatRho(r.rho)}
              </td>
              <td className="py-2 pr-3">{bar(r.rho)}</td>
              <td className="py-2 text-[11.5px] text-[var(--color-ink-muted)]">
                {r.rho === null
                  ? `Below n=${MIN_GROUP_N}, suppressed`
                  : readRho(r.rho)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 border-t border-[var(--color-hairline)] pt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
        ρ is computed inside each group. It asks whether I order{" "}
        <em>that group members</em> the way the meta does, apart from whether I rate the
        group as a whole too high or too low. A group can have a large mean delta and a high
        ρ at the same time. Right shape, wrong altitude. Groups under {MIN_GROUP_N} fighters
        are suppressed rather than shown as findings.
      </p>
    </div>
  );
}
