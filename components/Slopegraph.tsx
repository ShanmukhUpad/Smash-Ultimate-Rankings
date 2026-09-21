"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { deltaColor, DELTA_NEGATIVE, DELTA_POSITIVE, INK } from "@/lib/palette";
import { iconSrcAt } from "@/lib/icons";
import { useIconTick } from "@/lib/useIconTick";
import { formatDelta } from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { FighterIcon, Tooltip, useMeasure } from "./ui";

const MARGIN = { top: 34, right: 190, bottom: 26, left: 190 };
const HEIGHT = 760;
/** Names drawn without hovering: the most extreme movers on each side. */
const LABELLED_PER_SIDE = 7;
/** Minimum vertical spacing between two standing labels on the same axis. */
const LABEL_MIN_GAP = 15;
/** Portrait drawn beside a standing label. */
const LABEL_ICON = 15;

export default function Slopegraph({
  fighters,
  maxRank,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  fighters: Fighter[];
  maxRank: number;
  hovered: string | null;
  selected: string | null;
  onHover: (name: string | null) => void;
  onSelect: (name: string) => void;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const reduce = useReducedMotion();
  const iconTick = useIconTick();
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 80);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // Rank positions are pinned to the full 1..maxRank roster so that filtering
  // removes lines without rescaling the survivors.
  const y = (rank: number) => MARGIN.top + ((rank - 1) / (maxRank - 1)) * innerH;
  const xLeft = MARGIN.left;
  const xRight = MARGIN.left + innerW;

  const alwaysLabelled = useMemo(() => {
    const sorted = [...fighters].sort((a, b) => b.tierDelta - a.tierDelta);
    return new Set([
      ...sorted.slice(0, LABELLED_PER_SIDE).map((f) => f.character),
      ...sorted.slice(-LABELLED_PER_SIDE).map((f) => f.character),
    ]);
  }, [fighters]);

  /**
   * Standing labels cluster at the top and bottom of each axis, where the
   * extreme movers live. Nudge them apart so the names stay readable; the line
   * endpoints themselves never move.
   */
  const labelY = useMemo(() => {
    const out = new Map<string, { left: number; right: number }>();
    const marked = fighters.filter((f) => alwaysLabelled.has(f.character));

    const spread = (rankOf: (f: Fighter) => number) => {
      const placed = [...marked]
        .sort((a, b) => rankOf(a) - rankOf(b))
        .map((f) => ({ name: f.character, y: y(rankOf(f)) }));
      for (let i = 1; i < placed.length; i++) {
        const gap = placed[i].y - placed[i - 1].y;
        if (gap < LABEL_MIN_GAP) placed[i].y = placed[i - 1].y + LABEL_MIN_GAP;
      }
      return new Map(placed.map((p) => [p.name, p.y]));
    };

    const left = spread((f) => f.myOverallRank);
    const right = spread((f) => f.officialOverallRank);
    for (const f of marked) {
      out.set(f.character, {
        left: left.get(f.character) ?? y(f.myOverallRank),
        right: right.get(f.character) ?? y(f.officialOverallRank),
      });
    }
    return out;
    // y is derived from maxRank and the fixed geometry constants.
  }, [fighters, alwaysLabelled, maxRank]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = hovered ?? selected;
  const activeFighter = fighters.find((f) => f.character === active) ?? null;
  const ticks = useMemo(() => {
    const out = [1];
    for (let r = 10; r <= maxRank; r += 10) out.push(r);
    if (out[out.length - 1] !== maxRank) out.push(maxRank);
    return out;
  }, [maxRank]);

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Slopegraph of personal rank against competitive rank for each fighter"
          onMouseLeave={() => {
            onHover(null);
            setPointer(null);
          }}
        >
          <text
            x={xLeft}
            y={16}
            textAnchor="end"
            className="tnum"
            fontSize={11}
            fill={INK.secondary}
          >
            MY RANK
          </text>
          <text x={xRight} y={16} fontSize={11} fill={INK.secondary}>
            COMPETITIVE RANK
          </text>

          {/* Rank gridlines, recessive. */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={xLeft}
                x2={xRight}
                y1={y(t)}
                y2={y(t)}
                stroke={INK.grid}
                strokeWidth={1}
              />
              <text
                x={xLeft - 10}
                y={y(t) + 3.5}
                textAnchor="end"
                className="tnum"
                fontSize={10}
                fill={INK.muted}
              >
                {t}
              </text>
              <text
                x={xRight + 10}
                y={y(t) + 3.5}
                className="tnum"
                fontSize={10}
                fill={INK.muted}
              >
                {t}
              </text>
            </g>
          ))}

          <line
            x1={xLeft}
            x2={xLeft}
            y1={MARGIN.top - 8}
            y2={MARGIN.top + innerH + 8}
            stroke={INK.axis}
            strokeWidth={1.5}
          />
          <line
            x1={xRight}
            x2={xRight}
            y1={MARGIN.top - 8}
            y2={MARGIN.top + innerH + 8}
            stroke={INK.axis}
            strokeWidth={1.5}
          />

          <AnimatePresence>
            {fighters.map((f) => {
              const y1 = y(f.myOverallRank);
              const y2 = y(f.officialOverallRank);
              const isActive = active === f.character;
              const dimmed = active !== null && !isActive;
              const colour = deltaColor(f.tierDelta);
              const showLabel = isActive || alwaysLabelled.has(f.character);

              return (
                <motion.g
                  key={f.character}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: dimmed ? 0.12 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                  onMouseEnter={() => onHover(f.character)}
                  onMouseMove={(e) => {
                    const box = (
                      e.currentTarget.ownerSVGElement as SVGSVGElement
                    ).getBoundingClientRect();
                    setPointer({ x: e.clientX - box.left, y: e.clientY - box.top });
                  }}
                  onClick={() => onSelect(f.character)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Wide invisible stroke: the hit target is bigger than the mark. */}
                  <line
                    x1={xLeft}
                    x2={xRight}
                    y1={y1}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth={9}
                  />
                  <motion.line
                    x1={xLeft}
                    x2={xRight}
                    animate={{ y1, y2 }}
                    initial={false}
                    transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
                    stroke={colour}
                    strokeWidth={isActive ? 2.75 : 1.4}
                    strokeLinecap="round"
                  />
                  <motion.circle
                    cx={xLeft}
                    r={isActive ? 3.6 : 2}
                    animate={{ cy: y1 }}
                    initial={false}
                    transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
                    fill={colour}
                    stroke={INK.surface}
                    strokeWidth={isActive ? 2 : 0}
                  />
                  <motion.circle
                    cx={xRight}
                    r={isActive ? 3.6 : 2}
                    animate={{ cy: y2 }}
                    initial={false}
                    transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
                    fill={colour}
                    stroke={INK.surface}
                    strokeWidth={isActive ? 2 : 0}
                  />

                  {showLabel && (
                    <>
                      <motion.image
                        href={iconSrcAt(f.character, iconTick)}
                        width={LABEL_ICON}
                        height={LABEL_ICON}
                        x={xLeft - 26 - LABEL_ICON}
                        animate={{
                          y:
                            (labelY.get(f.character)?.left ?? y1) - LABEL_ICON / 2,
                        }}
                        initial={false}
                        transition={{ duration: reduce ? 0 : 0.45 }}
                        preserveAspectRatio="xMidYMid meet"
                      />
                      <motion.text
                        x={xLeft - 26 - LABEL_ICON - 5}
                        textAnchor="end"
                        animate={{
                          y: (labelY.get(f.character)?.left ?? y1) + 3.5,
                        }}
                        initial={false}
                        transition={{ duration: reduce ? 0 : 0.45 }}
                        fontSize={10.5}
                        fontWeight={isActive ? 700 : 400}
                        fill={isActive ? INK.primary : INK.secondary}
                      >
                        {f.character}
                      </motion.text>
                      <motion.image
                        href={iconSrcAt(f.character, iconTick)}
                        width={LABEL_ICON}
                        height={LABEL_ICON}
                        x={xRight + 26}
                        animate={{
                          y:
                            (labelY.get(f.character)?.right ?? y2) - LABEL_ICON / 2,
                        }}
                        initial={false}
                        transition={{ duration: reduce ? 0 : 0.45 }}
                        preserveAspectRatio="xMidYMid meet"
                      />
                      <motion.text
                        x={xRight + 26 + LABEL_ICON + 5}
                        animate={{
                          y: (labelY.get(f.character)?.right ?? y2) + 3.5,
                        }}
                        initial={false}
                        transition={{ duration: reduce ? 0 : 0.45 }}
                        fontSize={10.5}
                        fontWeight={isActive ? 700 : 400}
                        fill={isActive ? INK.primary : INK.secondary}
                      >
                        {f.character}
                      </motion.text>
                    </>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>
      )}

      {activeFighter && pointer && (
        <Tooltip x={pointer.x} y={pointer.y} containerWidth={width}>
          <div className="flex items-center gap-2">
            <FighterIcon character={activeFighter.character} size={26} />
            <span className="font-semibold text-[var(--color-ink)]">
              {activeFighter.character}
            </span>
          </div>
          <div className="tnum mt-1">
            my #{activeFighter.myOverallRank} ({activeFighter.myTier}) → meta #
            {activeFighter.officialOverallRank} ({activeFighter.officialTier})
          </div>
          <div
            className="tnum mt-1 font-semibold"
            style={{
              color:
                activeFighter.tierDelta >= 0 ? DELTA_POSITIVE : DELTA_NEGATIVE,
            }}
          >
            delta {formatDelta(activeFighter.tierDelta)}{" "}
            {activeFighter.tierDelta >= 0 ? "(I rate higher)" : "(meta rates higher)"}
          </div>
          <div className="mt-1 text-[var(--color-ink-muted)]">
            {activeFighter.archetype} · {activeFighter.franchise}
          </div>
        </Tooltip>
      )}
    </div>
  );
}
