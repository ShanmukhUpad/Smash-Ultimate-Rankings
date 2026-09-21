"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import {
  deltaColor,
  DELTA_NEGATIVE,
  DELTA_POSITIVE,
  INK,
  MY_TIER_ORDER,
  OFFICIAL_TIER_ORDER,
} from "@/lib/palette";
import { formatDelta, mean } from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { FighterIcon, Legend, Segmented, Tooltip, useMeasure } from "./ui";

type Mode = "mine" | "official" | "both";

const MINE = "#3987e5";
const META = "#898781";

const MARGIN = { top: 16, right: 12, bottom: 28, left: 34 };
const PANEL_H = 168;
/** Gap between the two stacked panels in the comparison view. */
const PANEL_GAP = 44;

interface Band {
  tier: string;
  n: number;
  meanDelta: number;
  members: Fighter[];
}

function bands(fighters: Fighter[], order: string[], get: (f: Fighter) => string): Band[] {
  return order.map((tier) => {
    const members = fighters.filter((f) => get(f) === tier);
    return {
      tier,
      n: members.length,
      meanDelta: members.length ? mean(members.map((m) => m.tierDelta)) : 0,
      members,
    };
  });
}

export default function TierHistogram({
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
  const [mode, setMode] = useState<Mode>("mine");
  const [tip, setTip] = useState<{ x: number; y: number; band: Band } | null>(null);

  const mineBands = useMemo(
    () => bands(fighters, MY_TIER_ORDER, (f) => f.myTier),
    [fighters]
  );
  const officialBands = useMemo(
    () => bands(fighters, OFFICIAL_TIER_ORDER, (f) => f.officialTier),
    [fighters]
  );

  const rows = mode === "official" ? officialBands : mineBands;
  const paired = mode === "both";

  // The two rankings do not share a band scale. Mine has 7 bands, the
  // competitive list 12, so my S does not correspond to their S minus. Pairing
  // them as grouped bars would invent that correspondence, so the comparison
  // view stacks two panels over a shared count axis instead.
  const maxN = Math.max(
    1,
    ...(paired
      ? [...mineBands, ...officialBands].map((b) => b.n)
      : rows.map((b) => b.n))
  );

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 80);
  const innerH = PANEL_H;
  const HEIGHT =
    MARGIN.top + PANEL_H + (paired ? PANEL_GAP + PANEL_H : 0) + MARGIN.bottom + 20;
  const y = (n: number) => innerH - (n / maxN) * innerH;

  const ticks = useMemo(() => {
    const step = maxN > 20 ? 10 : maxN > 8 ? 5 : 2;
    const out: number[] = [];
    for (let v = 0; v <= maxN; v += step) out.push(v);
    return out;
  }, [maxN]);

  const showTip = (e: React.MouseEvent, band: Band) => {
    const box = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, band });
  };

  /** One panel of bars. Each panel spans the full width with its own bands. */
  function Panel({
    data,
    colourOf,
    top: panelTop,
    labelColour,
    caption,
  }: {
    data: Band[];
    colourOf: (b: Band) => string;
    top: number;
    labelColour: string;
    caption: string;
  }) {
    const slot = innerW / data.length;
    const barW = Math.max(10, slot * 0.62);
    return (
      <g>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + innerW}
              y1={panelTop + y(t)}
              y2={panelTop + y(t)}
              stroke={t === 0 ? INK.axis : INK.grid}
              strokeWidth={t === 0 ? 1.5 : 1}
            />
            <text
              x={MARGIN.left - 8}
              y={panelTop + y(t) + 3.5}
              textAnchor="end"
              className="tnum"
              fontSize={10}
              fill={INK.muted}
            >
              {t}
            </text>
          </g>
        ))}

        {data.map((b, i) => {
          const cx = MARGIN.left + slot * i + slot / 2;
          const barTop = panelTop + y(b.n);
          const h = innerH - y(b.n);
          const lit = b.members.some((m) => m.character === hovered);
          return (
            <g key={b.tier}>
              {/* Hit target covers the full column, so a short bar is still easy to hit. */}
              <rect
                x={cx - slot / 2}
                y={panelTop}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={(e) => showTip(e, b)}
                onMouseLeave={() => setTip(null)}
              />
              <motion.rect
                x={cx - barW / 2}
                width={barW}
                rx={4}
                initial={false}
                animate={{ y: barTop, height: Math.max(h, b.n > 0 ? 2 : 0) }}
                transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
                fill={colourOf(b)}
                fillOpacity={lit ? 1 : 0.9}
                stroke={lit ? INK.primary : "transparent"}
                strokeWidth={1.5}
                pointerEvents="none"
              />
              {b.n > 0 && (
                <text
                  x={cx}
                  y={barTop - 4}
                  textAnchor="middle"
                  className="tnum"
                  fontSize={10.5}
                  fill={INK.secondary}
                  pointerEvents="none"
                >
                  {b.n}
                </text>
              )}
              <text
                x={cx}
                y={panelTop + innerH + 15}
                textAnchor="middle"
                fontSize={10.5}
                fill={labelColour}
                pointerEvents="none"
              >
                {b.tier}
              </text>
            </g>
          );
        })}

        <text
          x={MARGIN.left + innerW / 2}
          y={panelTop + innerH + 29}
          textAnchor="middle"
          fontSize={10.5}
          fill={INK.muted}
        >
          {caption}
        </text>
      </g>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {paired ? (
          <Legend
            items={[
              { key: "mine", label: "My tiers", color: MINE },
              { key: "meta", label: "Competitive tiers", color: META },
            ]}
          />
        ) : (
          <p className="flex items-center gap-3 text-[11.5px] text-[var(--color-ink-muted)]">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-4 rounded-sm"
                style={{ background: DELTA_NEGATIVE }}
              />
              band the meta rates higher
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-4 rounded-sm"
                style={{ background: DELTA_POSITIVE }}
              />
              band I rate higher
            </span>
          </p>
        )}
        <Segmented<Mode>
          ariaLabel="Which tier list to count"
          value={mode}
          onChange={setMode}
          options={[
            { value: "mine", label: "My tiers" },
            { value: "official", label: "Competitive tiers" },
            { value: "both", label: "Both" },
          ]}
        />
      </div>

      <div ref={ref} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Count of fighters in each tier band"
          >
            {paired ? (
              <>
                <Panel
                  data={mineBands}
                  colourOf={() => MINE}
                  top={MARGIN.top}
                  labelColour={MINE}
                  caption="MY TIER BAND, 7 BANDS"
                />
                <Panel
                  data={officialBands}
                  colourOf={() => META}
                  top={MARGIN.top + PANEL_H + PANEL_GAP}
                  labelColour={META}
                  caption="COMPETITIVE TIER BAND, 12 BANDS"
                />
              </>
            ) : (
              <Panel
                data={rows}
                colourOf={(b) => (b.n === 0 ? "#2c2c2a" : deltaColor(b.meanDelta))}
                top={MARGIN.top}
                labelColour={INK.secondary}
                caption={mode === "mine" ? "MY TIER BAND" : "COMPETITIVE TIER BAND"}
              />
            )}
          </svg>
        )}

        {tip && (
          <Tooltip x={tip.x} y={tip.y} containerWidth={width}>
            <div className="font-semibold text-[var(--color-ink)]">
              {tip.band.tier} tier
            </div>
            <div className="tnum mt-1">
              {tip.band.n} fighter{tip.band.n === 1 ? "" : "s"}
              {tip.band.n > 0 && (
                <>
                  {" "}
                  · mean delta{" "}
                  <span
                    style={{
                      color:
                        tip.band.meanDelta >= 0 ? DELTA_POSITIVE : DELTA_NEGATIVE,
                    }}
                  >
                    {formatDelta(Math.round(tip.band.meanDelta * 10) / 10)}
                  </span>
                </>
              )}
            </div>
            {tip.band.n > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tip.band.members.slice(0, 14).map((m) => (
                  <FighterIcon key={m.character} character={m.character} size={18} />
                ))}
                {tip.band.n > 14 && (
                  <span className="tnum text-[10px] text-[var(--color-ink-muted)]">
                    +{tip.band.n - 14}
                  </span>
                )}
              </div>
            )}
          </Tooltip>
        )}
      </div>

      {/* A roster-wide read of the shape, without asking anyone to count bars. */}
      <p className="mt-3 border-t border-[var(--color-hairline)] pt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
        My list uses {MY_TIER_ORDER.length} bands. The competitive list uses{" "}
        {OFFICIAL_TIER_ORDER.length}. The two do not line up, so my S is not the competitive
        S minus. Both stacks them over one count axis rather than pairing bands that do not
        correspond. Bar colour in the single views is the mean tier delta for that band, so a
        red band is one the meta rates above me. Hover a bar for the fighters in it.
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {hovered &&
          fighters
            .filter((f) => f.character === hovered)
            .map((f) => (
              <button
                key={f.character}
                type="button"
                onClick={() => onSelect(f.character)}
                onMouseEnter={() => onHover(f.character)}
                className="flex items-center gap-1.5 rounded px-1 text-[11px] text-[var(--color-ink-2)]"
              >
                <FighterIcon character={f.character} size={16} />
                {f.character} sits in {f.myTier} for me and {f.officialTier} for the meta
              </button>
            ))}
      </div>
    </div>
  );
}
