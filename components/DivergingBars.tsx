"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { deltaColor, DELTA_NEGATIVE, DELTA_POSITIVE, INK } from "@/lib/palette";
import { formatDelta } from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { FighterIcon, Segmented } from "./ui";

type View = "extremes" | "over" | "under" | "all";

const ROW_H = 22;

export default function DivergingBars({
  fighters,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  fighters: Fighter[];
  hovered: string | null;
  selected: string | null;
  onHover: (name: string | null) => void;
  onSelect: (name: string) => void;
}) {
  const reduce = useReducedMotion();
  const [view, setView] = useState<View>("extremes");

  const sorted = useMemo(
    () =>
      [...fighters].sort(
        (a, b) => b.tierDelta - a.tierDelta || a.character.localeCompare(b.character)
      ),
    [fighters]
  );

  const rows = useMemo(() => {
    if (view === "all") return sorted;
    if (view === "over") return sorted.slice(0, 20);
    if (view === "under") return sorted.slice(-20).reverse();
    // "extremes": the 20 biggest gaps each way, in one continuous ranking.
    if (sorted.length <= 40) return sorted;
    return [...sorted.slice(0, 20), ...sorted.slice(-20)];
  }, [sorted, view]);

  const maxAbs = useMemo(
    () => Math.max(1, ...fighters.map((f) => Math.abs(f.tierDelta))),
    [fighters]
  );

  const active = hovered ?? selected;
  const gapIndex =
    view === "extremes" && sorted.length > 40 ? 20 : -1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[11.5px] text-[var(--color-ink-muted)]">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: DELTA_NEGATIVE }}
            />
            meta rates higher than me
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: DELTA_POSITIVE }}
            />
            I rate higher than the meta
          </span>
        </div>
        <Segmented<View>
          ariaLabel="Which fighters to list"
          value={view}
          onChange={setView}
          options={[
            { value: "extremes", label: "Top & bottom 20" },
            { value: "over", label: "Top 20 only" },
            { value: "under", label: "Bottom 20 only" },
            { value: "all", label: `All ${fighters.length}` },
          ]}
        />
      </div>

      <div
        className={`relative ${view === "all" ? "max-h-[620px] overflow-y-auto pr-1" : ""}`}
      >
        {/* Zero baseline runs the full height of the plot. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-[50%] w-px"
          style={{ background: INK.axis }}
        />

        <ul className="relative">
          <AnimatePresence initial={false}>
            {rows.map((f, i) => {
              const isActive = active === f.character;
              const dimmed = active !== null && !isActive;
              const pct = (Math.abs(f.tierDelta) / maxAbs) * 48;
              const pos = f.tierDelta >= 0;
              const colour = deltaColor(f.tierDelta);

              return (
                <motion.li
                  key={f.character}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: dimmed ? 0.3 : 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
                  onMouseEnter={() => onHover(f.character)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(f.character)}
                  className={`group relative flex cursor-pointer items-center ${
                    gapIndex === i ? "mt-3 border-t border-dashed border-[#2c2c2a] pt-3" : ""
                  }`}
                  style={{ height: ROW_H }}
                >
                  {/* Row hover wash, full bleed. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 inset-y-px rounded ${
                      isActive ? "bg-[rgba(255,255,255,0.06)]" : ""
                    }`}
                  />

                  {/* Name sits on the side the bar grows away from, so it never overlaps. */}
                  <span
                    className={`absolute flex w-[46%] items-center gap-1.5 text-[11.5px] ${
                      pos
                        ? "right-[50.5%] flex-row-reverse text-right"
                        : "left-[50.5%] text-left"
                    }`}
                    style={{ color: isActive ? INK.primary : INK.secondary }}
                  >
                    <FighterIcon character={f.character} size={16} />
                    <span className="truncate">{f.character}</span>
                  </span>

                  <motion.span
                    aria-hidden
                    layout={!reduce}
                    className="absolute h-[11px]"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
                    style={{
                      left: pos ? "50%" : undefined,
                      right: pos ? undefined : "50%",
                      background: colour,
                      borderRadius: pos ? "0 4px 4px 0" : "4px 0 0 4px",
                      outline: isActive ? `2px solid ${INK.primary}` : "none",
                      outlineOffset: 1,
                    }}
                  />

                  <span
                    className="tnum absolute text-[11px]"
                    style={{
                      left: pos ? `calc(50% + ${pct}% + 6px)` : undefined,
                      right: pos ? undefined : `calc(50% + ${pct}% + 6px)`,
                      color: isActive ? INK.primary : INK.muted,
                    }}
                  >
                    {formatDelta(f.tierDelta)}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
