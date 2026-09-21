"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { activeFilterCount, cycleTri, toggleInList, uniqueSorted } from "@/lib/filters";
import { ARCHETYPE_COLOR, ARCHETYPE_ORDER } from "@/lib/palette";
import { EMPTY_FILTERS, type Fighter, type FilterState } from "@/lib/types";
import { Chip, TriToggle } from "./ui";

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[10.5px] uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function FilterBar({
  all,
  filters,
  setFilters,
  shown,
}: {
  all: Fighter[];
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  shown: number;
}) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  const franchises = useMemo(() => uniqueSorted(all, (f) => f.franchise), [all]);
  const mobilities = ["Very Fast", "Fast", "Average", "Slow"];
  const weights = [
    "Featherweight",
    "Lightweight",
    "Middleweight",
    "Heavyweight",
    "Super Heavyweight",
  ];

  const count = activeFilterCount(filters);
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setFilters({ ...filters, [k]: v });

  return (
    <div className="card sticky top-[60px] z-20 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Group label="Archetype">
          {ARCHETYPE_ORDER.map((a) => (
            <Chip
              key={a}
              color={ARCHETYPE_COLOR[a]}
              active={filters.archetype.includes(a)}
              onClick={() => set("archetype", toggleInList(filters.archetype, a))}
            >
              {a}
            </Chip>
          ))}
        </Group>

        <Group label="Origin">
          {["First-party", "Third-party"].map((p) => (
            <Chip
              key={p}
              active={filters.party.includes(p)}
              onClick={() => set("party", toggleInList(filters.party, p))}
            >
              {p.replace("-party", "")}
            </Chip>
          ))}
          <TriToggle
            label="DLC"
            state={filters.isDlc}
            onClick={() => set("isDlc", cycleTri(filters.isDlc))}
          />
          <TriToggle
            label="Echo"
            state={filters.isEcho}
            onClick={() => set("isEcho", cycleTri(filters.isEcho))}
          />
        </Group>

        <Group label="Traits">
          <TriToggle
            label="Gimmick"
            hint="Resource / meter / summon systems"
            state={filters.hasGimmickMechanic}
            onClick={() =>
              set("hasGimmickMechanic", cycleTri(filters.hasGimmickMechanic))
            }
          />
          <TriToggle
            label="Projectile"
            state={filters.projectileUser}
            onClick={() => set("projectileUser", cycleTri(filters.projectileUser))}
          />
          <TriToggle
            label="Disjoint"
            state={filters.disjointUser}
            onClick={() => set("disjointUser", cycleTri(filters.disjointUser))}
          />
        </Group>

        <div className="ml-auto flex items-center gap-3">
          <span className="tnum text-[12px] text-[var(--color-ink-2)]">
            <span className="font-semibold text-[var(--color-ink)]">{shown}</span> of{" "}
            {all.length} shown
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-[var(--color-hairline)] px-2.5 py-1 text-[12px] text-[var(--color-ink-2)] hover:border-[var(--color-ink-muted)]"
          >
            {expanded ? "Fewer filters" : "More filters"}
          </button>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            disabled={count === 0}
            className="rounded-full border border-[var(--color-hairline)] px-2.5 py-1 text-[12px] text-[var(--color-ink-2)] transition-opacity hover:border-[var(--color-ink-muted)] disabled:opacity-35"
          >
            Reset{count > 0 ? ` (${count})` : ""}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-3 border-t border-[var(--color-hairline)] pt-3">
              <Group label="Mobility">
                {mobilities.map((m) => (
                  <Chip
                    key={m}
                    active={filters.mobility.includes(m)}
                    onClick={() => set("mobility", toggleInList(filters.mobility, m))}
                  >
                    {m}
                  </Chip>
                ))}
              </Group>
              <Group label="Weight">
                {weights.map((w) => (
                  <Chip
                    key={w}
                    active={filters.weightClass.includes(w)}
                    onClick={() =>
                      set("weightClass", toggleInList(filters.weightClass, w))
                    }
                  >
                    {w}
                  </Chip>
                ))}
              </Group>
              <Group label="Franchise">
                {franchises.map((fr) => (
                  <Chip
                    key={fr}
                    active={filters.franchise.includes(fr)}
                    onClick={() => set("franchise", toggleInList(filters.franchise, fr))}
                  >
                    {fr}
                  </Chip>
                ))}
              </Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
