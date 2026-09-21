"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { INK } from "@/lib/palette";
import { formatDelta, mean } from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { FighterIcon, Legend, Segmented } from "./ui";

type Grouping = "franchise" | "franchiseGenre";
type Sort = "mine" | "gap";

const MINE = "#3987e5";
const META = "#898781";

interface Row {
  key: string;
  n: number;
  myMean: number;
  officialMean: number;
  members: Fighter[];
}

export default function FranchiseView({
  fighters,
  maxRank,
  hovered,
  onHover,
  onSelect,
}: {
  fighters: Fighter[];
  maxRank: number;
  hovered: string | null;
  onHover: (name: string | null) => void;
  onSelect: (name: string) => void;
}) {
  const reduce = useReducedMotion();
  const [grouping, setGrouping] = useState<Grouping>("franchise");
  const [minN, setMinN] = useState(2);
  const [sort, setSort] = useState<Sort>("mine");

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Fighter[]>();
    for (const f of fighters) {
      const k = grouping === "franchise" ? f.franchise : f.franchiseGenre;
      const b = map.get(k);
      if (b) b.push(f);
      else map.set(k, [f]);
    }
    const out = [...map.entries()].map(([key, members]) => ({
      key,
      n: members.length,
      myMean: mean(members.map((m) => m.myOverallRank)),
      officialMean: mean(members.map((m) => m.officialOverallRank)),
      members,
    }));
    return out
      .filter((r) => r.n >= minN)
      .sort((a, b) =>
        sort === "mine"
          ? a.myMean - b.myMean
          : b.officialMean - b.myMean - (a.officialMean - a.myMean)
      );
  }, [fighters, grouping, minN, sort]);

  const hiddenCount = useMemo(() => {
    const keys = new Set(
      fighters.map((f) => (grouping === "franchise" ? f.franchise : f.franchiseGenre))
    );
    return keys.size - rows.length;
  }, [fighters, grouping, rows.length]);

  const pct = (rank: number) => (1 - (rank - 1) / (maxRank - 1)) * 100;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Legend
          items={[
            { key: "mine", label: "My mean rank", color: MINE },
            { key: "meta", label: "Competitive mean rank", color: META },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Grouping>
            ariaLabel="Group by"
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: "franchise", label: "Franchise" },
              { value: "franchiseGenre", label: "Genre" },
            ]}
          />
          <Segmented<Sort>
            ariaLabel="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: "mine", label: "My rank" },
              { value: "gap", label: "Gap" },
            ]}
          />
          <label className="flex items-center gap-2 text-[11.5px] text-[var(--color-ink-muted)]">
            min n
            <input
              type="range"
              min={1}
              max={6}
              value={minN}
              onChange={(e) => setMinN(Number(e.target.value))}
              className="h-1 w-24 accent-[#3987e5]"
            />
            <span className="tnum w-3 text-[var(--color-ink-2)]">{minN}</span>
          </label>
        </div>
      </div>

      <p className="mb-3 text-[12px] leading-snug text-[var(--color-ink-muted)]">
        Longer bar means better mean rank. {hiddenCount > 0 && `${hiddenCount} groups hidden below the n threshold.`}
      </p>

      <ul className="max-h-[560px] space-y-0.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const gap = r.officialMean - r.myMean;
            const rowActive = r.members.some((m) => m.character === hovered);
            return (
              <motion.li
                key={r.key}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.28 }}
                className={`grid grid-cols-[140px_1fr_58px] items-center gap-3 rounded px-1 py-1 ${
                  rowActive ? "bg-[rgba(255,255,255,0.05)]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] text-[var(--color-ink-2)]">
                    {r.key}
                  </div>
                  <div className="tnum text-[10px] text-[var(--color-ink-muted)]">
                    n={r.n}
                  </div>
                </div>

                <div className="space-y-[3px]">
                  {/* 2px surface gap between the paired bars keeps them separate marks. */}
                  <motion.div
                    className="h-[9px] rounded-r-[4px]"
                    initial={false}
                    animate={{ width: `${pct(r.myMean)}%` }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
                    style={{ background: MINE }}
                    title={`My mean rank ${r.myMean.toFixed(1)}`}
                  />
                  <motion.div
                    className="h-[9px] rounded-r-[4px]"
                    initial={false}
                    animate={{ width: `${pct(r.officialMean)}%` }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
                    style={{ background: META }}
                    title={`Competitive mean rank ${r.officialMean.toFixed(1)}`}
                  />
                </div>

                <div
                  className="tnum text-right text-[11px]"
                  style={{ color: INK.muted }}
                  title="Mean competitive rank minus mean personal rank"
                >
                  {formatDelta(Math.round(gap * 10) / 10)}
                </div>

                <div className="col-span-3 flex flex-wrap gap-1 pl-[152px]">
                  {r.members.map((m) => (
                    <button
                      key={m.character}
                      type="button"
                      onMouseEnter={() => onHover(m.character)}
                      onMouseLeave={() => onHover(null)}
                      onClick={() => onSelect(m.character)}
                      className={`flex items-center gap-1 rounded px-1 text-[10px] transition-colors ${
                        hovered === m.character
                          ? "bg-[var(--color-ink)] text-[var(--color-plane)]"
                          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-2)]"
                      }`}
                    >
                      <FighterIcon character={m.character} size={16} />
                      {m.character}
                    </button>
                  ))}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
