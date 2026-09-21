"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { DELTA_NEGATIVE, DELTA_POSITIVE, INK, deltaColor } from "@/lib/palette";
import {
  formatDelta,
  histogram,
  kernelDensity,
  mean,
  normalPdf,
  shareWithin,
  stdDev,
} from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { FighterIcon, Segmented, Tooltip, useMeasure } from "./ui";

const MARGIN = { top: 18, right: 16, bottom: 52, left: 44 };
const HEIGHT = 320;
const BIN_WIDTH = 10;
/** Shading weight for the 1, 2 and 3 sd bands, innermost first. */
const BAND_FILL = [0.09, 0.055, 0.025];

type Mode = "density" | "bins" | "both";

export default function DeltaDistribution({
  fighters,
  hovered,
  onHover,
  onSelect,
}: {
  fighters: Fighter[];
  hovered: string | null;
  onHover: (name: string | null) => void;
  onSelect: (name: string) => void;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("both");
  const [showNormal, setShowNormal] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; body: React.ReactNode } | null>(
    null
  );

  const stats = useMemo(() => {
    const values = fighters.map((f) => f.tierDelta);
    const mu = values.length ? mean(values) : 0;
    const sd = values.length > 1 ? stdDev(values) : 0;
    // A fixed domain keeps the curve steady while filters change the sample.
    const extent = values.length ? Math.max(...values.map((v) => Math.abs(v - mu))) : 0;
    // Wide enough for the data and for the 3 sd markers, and no wider.
    const limit = Math.ceil((Math.max(extent + 8, 3.05 * sd) + Math.abs(mu)) / 10) * 10;
    return {
      values,
      mu,
      sd,
      from: -limit,
      to: limit,
      shares: [1, 2, 3].map((k) => shareWithin(values, k)),
    };
  }, [fighters]);

  const curve = useMemo(
    () =>
      stats.values.length > 1
        ? kernelDensity(stats.values, stats.from, stats.to, 180)
        : [],
    [stats]
  );

  const bins = useMemo(
    () => histogram(stats.values, stats.from, stats.to, BIN_WIDTH),
    [stats]
  );

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 80);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // Bins are drawn as a density too, so the two live on one axis.
  const binDensity = (n: number) =>
    stats.values.length ? n / (stats.values.length * BIN_WIDTH) : 0;

  const peak = Math.max(
    1e-9,
    ...curve.map((p) => p.y),
    ...(mode === "density" ? [] : bins.map((b) => binDensity(b.n))),
    ...(showNormal && stats.sd > 0
      ? [normalPdf(stats.mu, stats.mu, stats.sd)]
      : [])
  );

  const x = (v: number) =>
    MARGIN.left + ((v - stats.from) / (stats.to - stats.from)) * innerW;
  const y = (d: number) => MARGIN.top + innerH - (d / (peak * 1.1)) * innerH;

  const area = useMemo(() => {
    if (curve.length === 0) return "";
    const top = curve.map((p) => `${x(p.x)},${y(p.y)}`).join(" L");
    return `M${x(stats.from)},${y(0)} L${top} L${x(stats.to)},${y(0)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve, width, peak, stats]);

  const normalPath = useMemo(() => {
    if (!showNormal || stats.sd <= 0) return "";
    const pts: string[] = [];
    for (let i = 0; i <= 180; i++) {
      const v = stats.from + ((stats.to - stats.from) * i) / 180;
      pts.push(`${x(v)},${y(normalPdf(v, stats.mu, stats.sd))}`);
    }
    return `M${pts.join(" L")}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNormal, stats, width, peak]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = stats.from; v <= stats.to; v += 30) out.push(v);
    return out;
  }, [stats]);

  const hoveredFighter = fighters.find((f) => f.character === hovered) ?? null;

  if (fighters.length < 2) {
    return (
      <p className="text-[12.5px] text-[var(--color-ink-muted)]">
        Needs at least two fighters. Loosen a filter.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-[3px] w-5 rounded"
              style={{ background: INK.secondary }}
            />
            density of tier delta
          </span>
          {showNormal && (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-[3px] w-5 rounded"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, #898781 0 4px, transparent 4px 7px)",
                }}
              />
              normal curve for the same mean and spread
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNormal((v) => !v)}
            aria-pressed={showNormal}
            className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
              showNormal
                ? "border-transparent bg-[var(--color-ink)] text-[var(--color-plane)]"
                : "border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-muted)]"
            }`}
          >
            Normal overlay
          </button>
          <Segmented<Mode>
            ariaLabel="How to draw the distribution"
            value={mode}
            onChange={setMode}
            options={[
              { value: "both", label: "Curve and bins" },
              { value: "density", label: "Curve only" },
              { value: "bins", label: "Bins only" },
            ]}
          />
        </div>
      </div>

      <div ref={ref} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Continuous distribution of tier delta across the roster"
            onMouseLeave={() => setTip(null)}
          >
            {/* Standard deviation bands, widest first so they stack correctly. */}
            {stats.sd > 0 &&
              [3, 2, 1].map((k) => (
                <rect
                  key={k}
                  x={x(stats.mu - k * stats.sd)}
                  y={MARGIN.top}
                  width={x(stats.mu + k * stats.sd) - x(stats.mu - k * stats.sd)}
                  height={innerH}
                  fill={INK.primary}
                  fillOpacity={BAND_FILL[k - 1]}
                />
              ))}

            {/* Zero line. The roster mean sits here by construction. */}
            <line
              x1={x(0)}
              x2={x(0)}
              y1={MARGIN.top - 6}
              y2={MARGIN.top + innerH}
              stroke={INK.axis}
              strokeWidth={1.5}
            />

            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={MARGIN.top}
                  y2={MARGIN.top + innerH}
                  stroke={INK.grid}
                  strokeWidth={1}
                />
                <text
                  x={x(t)}
                  y={MARGIN.top + innerH + 15}
                  textAnchor="middle"
                  className="tnum"
                  fontSize={10}
                  fill={INK.muted}
                >
                  {t > 0 ? `+${t}` : t}
                </text>
              </g>
            ))}

            {/* Bins, drawn as density so they share the curve axis. */}
            {mode !== "density" &&
              bins.map((b) => {
                const d = binDensity(b.n);
                if (b.n === 0) return null;
                const mid = (b.x0 + b.x1) / 2;
                return (
                  <motion.rect
                    key={b.x0}
                    x={x(b.x0) + 1}
                    width={Math.max(1, x(b.x1) - x(b.x0) - 2)}
                    rx={2}
                    initial={false}
                    animate={{ y: y(d), height: Math.max(0, y(0) - y(d)) }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
                    fill={deltaColor(mid)}
                    fillOpacity={mode === "bins" ? 0.85 : 0.4}
                    onMouseEnter={(e) => {
                      const box = (
                        e.currentTarget.ownerSVGElement as SVGSVGElement
                      ).getBoundingClientRect();
                      setTip({
                        x: e.clientX - box.left,
                        y: e.clientY - box.top,
                        body: (
                          <>
                            <div className="tnum font-semibold text-[var(--color-ink)]">
                              delta {formatDelta(b.x0)} to {formatDelta(b.x1)}
                            </div>
                            <div className="tnum mt-1">
                              {b.n} fighter{b.n === 1 ? "" : "s"},{" "}
                              {((b.n / stats.values.length) * 100).toFixed(1)} percent
                            </div>
                          </>
                        ),
                      });
                    }}
                  />
                );
              })}

            {/* The continuous read. */}
            {mode !== "bins" && curve.length > 0 && (
              <>
                <motion.path
                  d={area}
                  initial={false}
                  animate={{ opacity: 1 }}
                  fill={DELTA_POSITIVE}
                  fillOpacity={0.14}
                />
                <motion.path
                  d={area}
                  initial={false}
                  fill="none"
                  stroke={INK.secondary}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </>
            )}

            {showNormal && normalPath && (
              <path
                d={normalPath}
                fill="none"
                stroke={INK.muted}
                strokeWidth={1.75}
                strokeDasharray="5 4"
              />
            )}

            {/* Standard deviation markers with the share actually inside. */}
            {stats.sd > 0 &&
              [1, 2, 3].map((k) => {
                const share = stats.shares[k - 1] * 100;
                const expected = [68.3, 95.4, 99.7][k - 1];
                return (
                  <g key={`sd-${k}`}>
                    {[-1, 1].map((sign) => (
                      <line
                        key={sign}
                        x1={x(stats.mu + sign * k * stats.sd)}
                        x2={x(stats.mu + sign * k * stats.sd)}
                        y1={MARGIN.top}
                        y2={MARGIN.top + innerH}
                        stroke={INK.axis}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    ))}
                    <text
                      x={x(stats.mu + k * stats.sd)}
                      y={MARGIN.top - 5}
                      textAnchor="middle"
                      className="tnum"
                      fontSize={9.5}
                      fill={Math.abs(share - expected) > 2 ? DELTA_NEGATIVE : INK.muted}
                    >
                      {k} sd
                    </text>
                  </g>
                );
              })}

            {/* Every fighter as a rug tick, so the sample stays visible. */}
            {fighters.map((f) => {
              const lit = f.character === hovered;
              return (
                <line
                  key={f.character}
                  x1={x(f.tierDelta)}
                  x2={x(f.tierDelta)}
                  y1={MARGIN.top + innerH}
                  y2={MARGIN.top + innerH + (lit ? 12 : 7)}
                  stroke={lit ? INK.primary : deltaColor(f.tierDelta)}
                  strokeWidth={lit ? 2.5 : 1.25}
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
                            <FighterIcon character={f.character} size={22} />
                            <span className="font-semibold text-[var(--color-ink)]">
                              {f.character}
                            </span>
                          </div>
                          <div className="tnum mt-1">
                            delta {formatDelta(f.tierDelta)}
                            {stats.sd > 0 && (
                              <>
                                {" "}
                                ={" "}
                                {((f.tierDelta - stats.mu) / stats.sd).toFixed(2)} sd
                              </>
                            )}
                          </div>
                        </>
                      ),
                    });
                  }}
                  onMouseLeave={() => {
                    onHover(null);
                    setTip(null);
                  }}
                  onClick={() => onSelect(f.character)}
                />
              );
            })}

            <text
              x={MARGIN.left + innerW / 2}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize={10.5}
              fill={INK.secondary}
            >
              ← META RATES HIGHER · TIER DELTA · I RATE HIGHER →
            </text>

            <text
              x={MARGIN.left - 34}
              y={MARGIN.top + innerH / 2}
              transform={`rotate(-90 ${MARGIN.left - 34} ${MARGIN.top + innerH / 2})`}
              textAnchor="middle"
              fontSize={10.5}
              fill={INK.muted}
            >
              DENSITY
            </text>
          </svg>
        )}

        {tip && (
          <Tooltip x={tip.x} y={tip.y} containerWidth={width}>
            {tip.body}
          </Tooltip>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-[var(--color-hairline)] pt-3 text-[11.5px] text-[var(--color-ink-muted)]">
        <span className="tnum">
          mean{" "}
          <strong className="text-[var(--color-ink-2)]">
            {formatDelta(Math.round(stats.mu * 100) / 100)}
          </strong>
        </span>
        <span className="tnum">
          sd{" "}
          <strong className="text-[var(--color-ink-2)]">{stats.sd.toFixed(2)}</strong>
        </span>
        <span className="tnum">
          n <strong className="text-[var(--color-ink-2)]">{fighters.length}</strong>
        </span>
        {hoveredFighter && (
          <span className="tnum">
            {hoveredFighter.character} at{" "}
            <strong
              style={{
                color:
                  hoveredFighter.tierDelta >= 0 ? DELTA_POSITIVE : DELTA_NEGATIVE,
              }}
            >
              {formatDelta(hoveredFighter.tierDelta)}
            </strong>
          </span>
        )}
      </div>

      {/* How closely the roster follows a normal curve, band by band. */}
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5">
        {[1, 2, 3].map((k) => {
          const share = stats.shares[k - 1] * 100;
          const expected = [68.3, 95.4, 99.7][k - 1];
          const off = Math.abs(share - expected) > 2;
          return (
            <li key={k} className="tnum text-[11.5px] text-[var(--color-ink-muted)]">
              within {k} sd{" "}
              <strong style={{ color: off ? DELTA_NEGATIVE : "var(--color-ink-2)" }}>
                {share.toFixed(1)} percent
              </strong>{" "}
              against {expected} for a normal curve
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
        The curve is a Gaussian kernel density estimate over the same values the bins
        count, so the area under it is 1 and filtered groups of different size stay
        comparable. Shaded bands are 1, 2 and 3 standard deviations from the mean. Ticks
        under the axis are the individual fighters. On the full roster the mean is 0 by
        construction, the middle tracks a normal curve closely, and the tails are lighter,
        because a delta cannot exceed the size of the roster.
      </p>
    </div>
  );
}
