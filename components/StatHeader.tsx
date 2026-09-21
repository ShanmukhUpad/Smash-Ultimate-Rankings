"use client";

import { useMemo } from "react";

import { DELTA_NEGATIVE, DELTA_POSITIVE, INK } from "@/lib/palette";
import { formatDelta, formatRho, mean, spearmanOf } from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { StatTile } from "./ui";

export default function StatHeader({ fighters }: { fighters: Fighter[] }) {
  const stats = useMemo(() => {
    if (fighters.length === 0) return null;
    const deltas = fighters.map((f) => f.tierDelta);
    const sorted = [...fighters].sort((a, b) => b.tierDelta - a.tierDelta);
    return {
      rho: spearmanOf(fighters),
      meanAbs: mean(deltas.map(Math.abs)),
      top: sorted[0],
      bottom: sorted[sorted.length - 1],
      agree: fighters.filter((f) => Math.abs(f.tierDelta) <= 10).length,
    };
  }, [fighters]);

  if (!stats) {
    return (
      <p className="card p-5 text-[12.5px] text-[var(--color-ink-muted)]">
        No fighters match the current filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label={
          <>
            Spearman <span className="normal-case">ρ</span>
          </>
        }
        value={formatRho(stats.rho)}
        accent={
          stats.rho === null
            ? INK.muted
            : stats.rho >= 0
              ? DELTA_POSITIVE
              : DELTA_NEGATIVE
        }
        sub={
          stats.rho !== null && stats.rho < 0
            ? "Negative value. Comfort trends against viability."
            : "Rank agreement with the competitive list"
        }
      />
      <StatTile
        label="Mean |delta|"
        value={stats.meanAbs.toFixed(1)}
        sub={`Average fighter sits ${Math.round(
          stats.meanAbs
        )} places from the meta position`}
      />
      <StatTile
        label="Biggest comfort pick"
        value={formatDelta(stats.top.tierDelta)}
        accent={DELTA_POSITIVE}
        sub={`${stats.top.character}. My #${stats.top.myOverallRank}, meta #${stats.top.officialOverallRank}`}
      />
      <StatTile
        label="Biggest blind spot"
        value={formatDelta(stats.bottom.tierDelta)}
        accent={DELTA_NEGATIVE}
        sub={`${stats.bottom.character}. My #${stats.bottom.myOverallRank}, meta #${stats.bottom.officialOverallRank}`}
      />
    </div>
  );
}
