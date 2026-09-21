"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { deltaColor, FACETS, INK, STATUS } from "@/lib/palette";
import { formatDelta, formatP, formatRho, groupStats, mulberry32, seedFrom } from "@/lib/stats";
import { MIN_GROUP_N, type Fighter, type GroupStat } from "@/lib/types";
import { FighterIcon, Segmented, Tooltip, useMeasure } from "./ui";

const MARGIN = { top: 26, right: 74, bottom: 34, left: 186 };
const ROW_H = 58;
const BOX_H = 17;

/** Deterministic vertical jitter so the dots never move between renders. */
function jitter(name: string): number {
  return mulberry32(seedFrom(name))() * 2 - 1;
}

export default function GroupComparison({
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
  const { ref, width } = useMeasure<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [facetId, setFacetId] = useState(FACETS[0].id);
  const [tip, setTip] = useState<{ x: number; y: number; body: React.ReactNode } | null>(
    null
  );

  const facet = FACETS.find((f) => f.id === facetId) ?? FACETS[0];

  const stats = useMemo<GroupStat[]>(
    () => groupStats(fighters, facet.get, { order: facet.order }),
    [fighters, facet]
  );

  const maxAbs = useMemo(
    () => Math.max(10, ...fighters.map((f) => Math.abs(f.tierDelta))),
    [fighters]
  );

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 120);
  const height = MARGIN.top + stats.length * ROW_H + MARGIN.bottom;
  const domain = maxAbs * 1.08;
  const x = (v: number) => MARGIN.left + ((v + domain) / (2 * domain)) * innerW;
  const rowY = (i: number) => MARGIN.top + i * ROW_H + ROW_H / 2;

  const active = hovered ?? selected;
  const ticks = useMemo(() => {
    const step = domain > 60 ? 20 : 10;
    const out: number[] = [];
    for (let v = -Math.floor(domain / step) * step; v <= domain; v += step) out.push(v);
    return out;
  }, [domain]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Split the roster by"
          value={facetId}
          onChange={setFacetId}
          options={FACETS.map((f) => ({ value: f.id, label: f.label, title: f.hint }))}
        />
      </div>
      <p className="mb-3 text-[12px] leading-snug text-[var(--color-ink-muted)]">
        {facet.hint}
      </p>

      <div ref={ref} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Distribution of tier delta by ${facet.label}`}
            onMouseLeave={() => {
              onHover(null);
              setTip(null);
            }}
          >
            {/* x grid */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={MARGIN.top - 6}
                  y2={height - MARGIN.bottom}
                  stroke={t === 0 ? INK.axis : INK.grid}
                  strokeWidth={t === 0 ? 1.5 : 1}
                />
                <text
                  x={x(t)}
                  y={height - MARGIN.bottom + 15}
                  textAnchor="middle"
                  className="tnum"
                  fontSize={10}
                  fill={INK.muted}
                >
                  {t > 0 ? `+${t}` : t}
                </text>
              </g>
            ))}
            <text
              x={MARGIN.left + innerW / 2}
              y={height - 4}
              textAnchor="middle"
              fontSize={10.5}
              fill={INK.secondary}
            >
              ← META RATES HIGHER · TIER DELTA · I RATE HIGHER →
            </text>

            <AnimatePresence>
              {stats.map((g, i) => {
                const cy = rowY(i);
                const significant =
                  !g.underpowered && g.p !== null && g.p < 0.05;

                return (
                  <motion.g
                    key={g.key}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : i * 0.03 }}
                  >
                    {/* Row label block */}
                    <text
                      x={MARGIN.left - 12}
                      y={cy - 4}
                      textAnchor="end"
                      fontSize={12}
                      fontWeight={significant ? 700 : 400}
                      fill={g.underpowered ? INK.muted : INK.primary}
                    >
                      {g.key}
                    </text>
                    <text
                      x={MARGIN.left - 12}
                      y={cy + 10}
                      textAnchor="end"
                      className="tnum"
                      fontSize={10}
                      fill={INK.muted}
                    >
                      {g.underpowered
                        ? `n=${g.n} · too few`
                        : `n=${g.n} · ${formatP(g.p)} · ρ ${formatRho(g.rho)}`}
                    </text>

                    {/* whiskers */}
                    <line
                      x1={x(g.min)}
                      x2={x(g.max)}
                      y1={cy}
                      y2={cy}
                      stroke={INK.axis}
                      strokeWidth={1}
                    />
                    {/* box */}
                    <rect
                      x={x(g.q1)}
                      y={cy - BOX_H / 2}
                      width={Math.max(x(g.q3) - x(g.q1), 1)}
                      height={BOX_H}
                      rx={3}
                      fill={g.underpowered ? "#2c2c2a" : deltaColor(g.mean)}
                      fillOpacity={g.underpowered ? 0.5 : 0.22}
                      stroke={g.underpowered ? INK.axis : deltaColor(g.mean)}
                      strokeWidth={1}
                    />
                    {/* median */}
                    <line
                      x1={x(g.median)}
                      x2={x(g.median)}
                      y1={cy - BOX_H / 2}
                      y2={cy + BOX_H / 2}
                      stroke={INK.primary}
                      strokeWidth={1.75}
                    />

                    {/* individual fighters */}
                    {g.members.map((f) => {
                      const isActive = active === f.character;
                      return (
                        <circle
                          key={f.character}
                          cx={x(f.tierDelta)}
                          cy={cy + jitter(f.character) * (BOX_H / 2 + 5)}
                          r={isActive ? 4.5 : 2.6}
                          fill={deltaColor(f.tierDelta)}
                          fillOpacity={
                            active === null ? 0.85 : isActive ? 1 : 0.18
                          }
                          stroke={isActive ? INK.primary : INK.surface}
                          strokeWidth={isActive ? 1.75 : 0.75}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => {
                            onHover(f.character);
                            const box = (
                              e.currentTarget.ownerSVGElement as SVGSVGElement
                            ).getBoundingClientRect();
                            setTip({
                              x: e.clientX - box.left,
                              y: e.clientY - box.top,
                              body: (
                                <>
                                  <div className="flex items-center gap-2">
                                    <FighterIcon character={f.character} size={24} />
                                    <span className="font-semibold text-[var(--color-ink)]">
                                      {f.character}
                                    </span>
                                  </div>
                                  <div className="tnum mt-1">
                                    delta {formatDelta(f.tierDelta)} · my #
                                    {f.myOverallRank} → meta #{f.officialOverallRank}
                                  </div>
                                </>
                              ),
                            });
                          }}
                          onClick={() => onSelect(f.character)}
                        />
                      );
                    })}

                    {/* bootstrap CI of the mean, then the mean itself */}
                    {g.ci && (
                      <g>
                        <line
                          x1={x(g.ci[0])}
                          x2={x(g.ci[1])}
                          y1={cy + BOX_H / 2 + 12}
                          y2={cy + BOX_H / 2 + 12}
                          stroke={significant ? STATUS.warning : INK.secondary}
                          strokeWidth={2}
                        />
                        {[g.ci[0], g.ci[1]].map((v, k) => (
                          <line
                            key={k}
                            x1={x(v)}
                            x2={x(v)}
                            y1={cy + BOX_H / 2 + 8}
                            y2={cy + BOX_H / 2 + 16}
                            stroke={significant ? STATUS.warning : INK.secondary}
                            strokeWidth={2}
                          />
                        ))}
                      </g>
                    )}
                    <motion.g
                      initial={false}
                      animate={{ x: x(g.mean) }}
                      transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
                    >
                      <rect
                        x={-5}
                        y={cy + BOX_H / 2 + 7}
                        width={10}
                        height={10}
                        transform={`rotate(45 0 ${cy + BOX_H / 2 + 12})`}
                        fill={g.underpowered ? INK.muted : INK.primary}
                        stroke={INK.surface}
                        strokeWidth={1.5}
                      />
                    </motion.g>
                    {/* Mean value gets its own column so it never lands on the CI bar. */}
                    <text
                      x={MARGIN.left + innerW + 10}
                      y={cy + 4}
                      className="tnum"
                      fontSize={11.5}
                      fontWeight={600}
                      fill={g.underpowered ? INK.muted : INK.primary}
                    >
                      {formatDelta(Math.round(g.mean * 10) / 10)}
                    </text>
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>
        )}

        {tip && (
          <Tooltip x={tip.x} y={tip.y} containerWidth={width}>
            {tip.body}
          </Tooltip>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-[var(--color-hairline)] pt-3 text-[11.5px] text-[var(--color-ink-muted)] sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-[var(--color-ink-2)]">Box</dt>
          <dd>Q1 to Q3 with the median. Whisker spans the full range.</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-[var(--color-ink-2)]">◆ bar</dt>
          <dd>
            Group mean with a 95% bootstrap CI, 2,000 resamples. A bar clear of 0 is the
            signal. Amber marks p under 0.05.
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-[var(--color-ink-2)]">p</dt>
          <dd>
            5,000 rep permutation test. Deltas reshuffled across the same group sizes.
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-[var(--color-ink-2)]">Zero</dt>
          <dd>
            Roster-wide mean delta is exactly 0 by construction. Group means are deviations
            from it and sum back to zero. Groups under n={MIN_GROUP_N} are drawn but never
            tested.
          </dd>
        </div>
      </dl>
    </div>
  );
}
