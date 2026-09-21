"use client";

import { useCallback, useMemo, useState } from "react";

import { applyFilters } from "@/lib/filters";
import { EMPTY_FILTERS, type Fighter, type FilterState } from "@/lib/types";

import CharacterPanel from "./CharacterPanel";
import CorrelationTable from "./CorrelationTable";
import DeltaScatter from "./DeltaScatter";
import DivergingBars from "./DivergingBars";
import FilterBar from "./FilterBar";
import FranchiseView from "./FranchiseView";
import GroupComparison from "./GroupComparison";
import Slopegraph from "./Slopegraph";
import StatHeader from "./StatHeader";
import { Card } from "./ui";

export default function Dashboard({ fighters }: { fighters: Fighter[] }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => applyFilters(fighters, filters), [fighters, filters]);
  const maxRank = fighters.length;

  const onHover = useCallback((name: string | null) => setHovered(name), []);
  const onSelect = useCallback(
    (name: string) => setSelected((cur) => (cur === name ? null : name)),
    []
  );

  const empty = filtered.length === 0;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight">
          Comfort vs. Meta
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[var(--color-ink-2)]">
          Every Smash Ultimate fighter ranked twice. Once by how well I play them. Once
          by competitive viability. <strong>Tier delta</strong> is the gap.{" "}
          <span style={{ color: "#3987e5" }}>Positive means I rate them above the meta.</span>{" "}
          <span style={{ color: "#e66767" }}>Negative means the meta rates them above me.</span>{" "}
          These charts test whether that gap has structure.
        </p>
      </header>

      <div className="mb-5">
        <FilterBar
          all={fighters}
          filters={filters}
          setFilters={setFilters}
          shown={filtered.length}
        />
      </div>

      <div className="mb-5">
        <StatHeader fighters={filtered} />
      </div>

      {empty ? (
        <div className="card p-10 text-center text-[13px] text-[var(--color-ink-muted)]">
          No fighters match these filters. Reset one to bring the charts back.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-5">
            <Card
              title="Where the gap comes from"
              subtitle="Mean tier delta per group. Every fighter behind each mean is drawn. Switch the split to test a different explanation."
            >
              <GroupComparison
                fighters={filtered}
                hovered={hovered}
                selected={selected}
                onHover={onHover}
                onSelect={onSelect}
              />
            </Card>

            <Card
              title="Rank against rank"
              subtitle="Distance from the dashed line is the tier delta. Marker size scales with absolute delta. Archetype uses both hue and shape."
              note="Eight hues cannot be told apart when every pair sits side by side, which is what a scatter does. Shape is the channel that separates archetypes here. Split by archetype is the colour-safe read."
            >
              <DeltaScatter
                fighters={filtered}
                maxRank={maxRank}
                hovered={hovered}
                selected={selected}
                onHover={onHover}
                onSelect={onSelect}
              />
            </Card>

            <Card
              title="Every fighter, ranked twice"
              subtitle="Left axis is my ranking. Right axis is the competitive one. A steep line means the two lists disagree. Hover to isolate. Click to pin."
            >
              <Slopegraph
                fighters={filtered}
                maxRank={maxRank}
                hovered={hovered}
                selected={selected}
                onHover={onHover}
                onSelect={onSelect}
              />
            </Card>

            <Card
              title="Biggest disagreements"
              subtitle="Tier delta per fighter, sorted. The top of the list runs in my favour. The bottom runs in the meta favour."
            >
              <DivergingBars
                fighters={filtered}
                hovered={hovered}
                selected={selected}
                onHover={onHover}
                onSelect={onSelect}
              />
            </Card>

            <Card
              title="Rank correlation"
              subtitle="Spearman rank correlation overall and inside each group."
            >
              <CorrelationTable
                fighters={filtered}
                hovered={hovered}
                onHover={onHover}
              />
            </Card>

            <Card
              title="By franchise and genre"
              subtitle="Mean personal rank against mean competitive rank per series."
            >
              <FranchiseView
                fighters={filtered}
                maxRank={maxRank}
                hovered={hovered}
                onHover={onHover}
                onSelect={onSelect}
              />
            </Card>
          </div>

          <aside className="xl:sticky xl:top-[152px] xl:h-fit">
            <Card title="Fighter detail" className="h-full">
              <CharacterPanel
                all={fighters}
                visible={filtered}
                selected={selected}
                hovered={hovered}
                onSelect={(n) => setSelected(n)}
                onHover={onHover}
                maxRank={maxRank}
              />
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
