"use client";

import { motion, useReducedMotion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Symbols,
  XAxis,
  YAxis,
  ZAxis,
  ResponsiveContainer,
} from "recharts";

import {
  ARCHETYPE_COLOR,
  ARCHETYPE_ORDER,
  ARCHETYPE_SYMBOL,
  archetypeColor,
  INK,
} from "@/lib/palette";
import { iconSrcAt } from "@/lib/icons";
import { useIconTick } from "@/lib/useIconTick";
import { formatDelta } from "@/lib/stats";
import type { Archetype, Fighter } from "@/lib/types";
import { FighterIcon, Legend, Segmented, Tooltip } from "./ui";

type Mode = "single" | "facet";
type Marks = "symbol" | "icon";

/** Plot insets for the full-size chart, matching the ScatterChart margins
 *  plus the rendered YAxis width. Needed to turn pixels into rank units. */
const PLOT_INSET = { left: 16 + 54, right: 18, top: 12, bottom: 40 };
/** Never zoom in past this many ranks across, or the axes stop meaning much. */
const MIN_SPAN = 6;

type Span = [number, number];

function clampSpan([lo, hi]: Span, min: number, max: number): Span {
  let span = Math.min(hi - lo, max - min);
  span = Math.max(span, MIN_SPAN);
  let a = lo;
  if (a < min) a = min;
  if (a + span > max) a = max - span;
  return [a, a + span];
}

interface Point {
  x: number;
  y: number;
  z: number;
  f: Fighter;
}

const QUADRANTS = [
  {
    id: "shared-strong",
    label: "Shared favourites",
    detail: "high for me, high for the meta",
  },
  {
    id: "comfort",
    label: "My comfort picks",
    detail: "I rate them well above the meta",
  },
  {
    id: "untapped",
    label: "Untapped strength",
    detail: "the meta rates them well above me",
  },
  {
    id: "written-off",
    label: "Mutually written off",
    detail: "low for me, low for the meta",
  },
] as const;

/**
 * One mark per fighter. Archetype is carried by BOTH hue and marker shape:
 * the eight-hue palette clears the validator on adjacent pairs but not on the
 * all-pairs test a scatter implies, so shape is the channel that actually
 * separates them for a colour-blind reader.
 */
const FighterMark = memo(function FighterMark(props: {
  cx?: number;
  cy?: number;
  size?: number;
  payload?: Point;
  activeName?: string | null;
  dimmed?: boolean;
  marks?: Marks;
  iconTick?: number;
  /** True while panning or zooming: the mark must track the cursor exactly. */
  instant?: boolean;
  reduce?: boolean | null;
  onHover?: (p: Point | null, ev?: React.MouseEvent) => void;
  onSelect?: (name: string) => void;
}) {
  const { cx, cy, size = 80, payload, activeName, dimmed, marks, reduce, instant } =
    props;
  const iconTick = props.iconTick ?? 0;
  if (cx == null || cy == null || !payload) return null;

  const f = payload.f;
  const isActive = activeName === f.character;
  const colour = archetypeColor(f.archetype);
  // Recharts hands us an AREA; portraits need a diameter, kept in a band where
  // a 200px stock icon still reads as a face.
  const d = Math.min(38, Math.max(17, Math.sqrt(size / Math.PI) * 2.3));
  // Active emphasis is a static step, never an animated scale.
  const shown = isActive ? d * 1.45 : d;

  return (
    <motion.g
      // initial={false}: position and opacity tween when the data changes, but
      // the mark never plays an entrance animation. Recharts rebuilds these
      // elements on every chart render, so an entrance would restart each time
      // and read as the cloud zooming in and out.
      initial={false}
      animate={{ x: cx, y: cy, opacity: dimmed ? 0.14 : 1 }}
      transition={{ duration: reduce || instant ? 0 : 0.4, ease: "easeOut" }}
      style={{ cursor: "pointer" }}
      // Hover state is set on enter and leave only. Updating it on mousemove
      // re-rendered the whole chart on every pointer event.
      onMouseEnter={(e) => props.onHover?.(payload, e)}
      onMouseLeave={() => props.onHover?.(null)}
      onClick={() => props.onSelect?.(f.character)}
    >
      {marks === "icon" ? (
        <g>
          {/* Backing disc + archetype ring: the portrait carries identity, the
              ring keeps the archetype encoding the symbol mode provides. */}
          <circle
            r={shown / 2 + 1.5}
            fill={INK.surface}
            stroke={isActive ? INK.primary : colour}
            strokeWidth={isActive ? 2.5 : 1.75}
          />
          <image
            href={iconSrcAt(f.character, iconTick)}
            x={-shown / 2}
            y={-shown / 2}
            width={shown}
            height={shown}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      ) : (
        <Symbols
          cx={0}
          cy={0}
          type={ARCHETYPE_SYMBOL[f.archetype] as never}
          size={isActive ? size * 2.1 : size}
          fill={colour}
          fillOpacity={0.85}
          // 2px surface ring keeps overlapping marks readable.
          stroke={isActive ? INK.primary : INK.surface}
          strokeWidth={2}
        />
      )}
    </motion.g>
  );
});

export default function DeltaScatter({
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
  const reduce = useReducedMotion();
  const iconTick = useIconTick();
  const [mode, setMode] = useState<Mode>("single");
  const [marks, setMarks] = useState<Marks>("symbol");
  const [focus, setFocus] = useState<Archetype | null>(null);
  const [tip, setTip] = useState<{ p: Point; x: number; y: number } | null>(null);

  // null means the full 1..maxRank view. Panning and zooming narrow it.
  const [xSpan, setXSpan] = useState<Span | null>(null);
  const [ySpan, setYSpan] = useState<Span | null>(null);
  const [gesturing, setGesturing] = useState(false);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ px: number; py: number; x: Span; y: Span } | null>(null);

  const xView: Span = xSpan ?? [1, maxRank];
  const yView: Span = ySpan ?? [1, maxRank];
  const zoomed = xSpan !== null || ySpan !== null;

  const resetView = useCallback(() => {
    setXSpan(null);
    setYSpan(null);
  }, []);

  /** Plot rectangle in CSS pixels, for pixel-to-rank conversion. */
  const plotBox = useCallback(() => {
    const el = plotRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const w = r.width - PLOT_INSET.left - PLOT_INSET.right;
    const h = r.height - PLOT_INSET.top - PLOT_INSET.bottom;
    if (w <= 0 || h <= 0) return null;
    return { r, w, h };
  }, []);

  // Wheel zoom has to be a non-passive listener or the page scrolls instead.
  useEffect(() => {
    const el = plotRef.current;
    if (!el || mode !== "single") return;

    const onWheel = (e: WheelEvent) => {
      const box = plotBox();
      if (!box) return;
      e.preventDefault();

      const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
      // Anchor the zoom on the rank under the cursor so it stays put.
      const fx = (e.clientX - box.r.left - PLOT_INSET.left) / box.w;
      const fy = (e.clientY - box.r.top - PLOT_INSET.top) / box.h;

      setXSpan((cur) => {
        const [lo, hi] = cur ?? ([1, maxRank] as Span);
        const at = lo + (hi - lo) * Math.min(Math.max(fx, 0), 1);
        const span = (hi - lo) * factor;
        return clampSpan([at - span * fx, at + span * (1 - fx)], 1, maxRank);
      });
      setYSpan((cur) => {
        const [lo, hi] = cur ?? ([1, maxRank] as Span);
        const at = lo + (hi - lo) * Math.min(Math.max(fy, 0), 1);
        const span = (hi - lo) * factor;
        return clampSpan([at - span * fy, at + span * (1 - fy)], 1, maxRank);
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mode, maxRank, plotBox]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { px: e.clientX, py: e.clientY, x: xView, y: yView };
    setGesturing(true);
    // Capture keeps the drag alive past the plot edge. Not every pointer can be
    // captured, and a failure here must not abandon the drag.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* drag still works, it just stops at the edge */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const box = plotBox();
    if (!drag || !box) return;

    // Drag right moves the view left, as with any map.
    const dx = ((e.clientX - drag.px) / box.w) * (drag.x[1] - drag.x[0]);
    // The y axis is reversed, so a downward drag also moves the view down.
    const dy = ((e.clientY - drag.py) / box.h) * (drag.y[1] - drag.y[0]);

    setXSpan(clampSpan([drag.x[0] - dx, drag.x[1] - dx], 1, maxRank));
    setYSpan(clampSpan([drag.y[0] - dy, drag.y[1] - dy], 1, maxRank));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setGesturing(false);
    try {
      const el = e.currentTarget as HTMLElement;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch {
      /* nothing to release */
    }
  };

  const active = hovered ?? selected;
  const mid = (maxRank + 1) / 2;

  const points = useMemo<Point[]>(
    () =>
      fighters.map((f) => ({
        x: f.myOverallRank,
        y: f.officialOverallRank,
        z: Math.abs(f.tierDelta),
        f,
      })),
    [fighters]
  );

  const presentArchetypes = useMemo(
    () => ARCHETYPE_ORDER.filter((a) => fighters.some((f) => f.archetype === a)),
    [fighters]
  );

  const handleHover = (p: Point | null, ev?: React.MouseEvent) => {
    if (!p) {
      onHover(null);
      setTip(null);
      return;
    }
    onHover(p.f.character);
    if (ev) {
      const host = (ev.currentTarget as SVGGElement).closest(
        "[data-scatter-host]"
      ) as HTMLElement | null;
      if (host) {
        const box = host.getBoundingClientRect();
        setTip({ p, x: ev.clientX - box.left, y: ev.clientY - box.top });
      }
    }
  };

  const axisProps = {
    type: "number" as const,
    tick: { fill: INK.muted, fontSize: 11 },
    stroke: INK.axis,
    // allowDataOverflow is what makes a narrowed domain actually clip.
    allowDataOverflow: true,
  };

  const renderMark = useCallback(
    (markProps: object) => {
      const point = (markProps as { payload?: Point }).payload;
      return (
        <FighterMark
          {...(markProps as Record<string, never>)}
          activeName={active}
          dimmed={
            (focus !== null && point?.f.archetype !== focus) ||
            (active !== null && point?.f.character !== active)
          }
          marks={marks}
          iconTick={iconTick}
          instant={gesturing}
          reduce={reduce}
          onHover={handleHover}
          onSelect={onSelect}
        />
      );
    },
    // handleHover is stable enough for this: it only closes over setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, focus, marks, iconTick, reduce, onSelect, gesturing]
  );

  const renderChart = (
    subset: Point[],
    opts: { compact?: boolean; title?: string; colourKey?: Archetype } = {}
  ) => (
    <ScatterChart
      margin={
        opts.compact
          ? { top: 8, right: 10, bottom: 24, left: 4 }
          : { top: 12, right: 18, bottom: 40, left: 16 }
      }
    >
      <CartesianGrid stroke={INK.grid} strokeDasharray="0" />
      {!opts.compact && (
        <>
          <ReferenceArea
            x1={1}
            x2={mid}
            y1={1}
            y2={mid}
            fill={INK.primary}
            fillOpacity={0.02}
          />
          <ReferenceArea
            x1={mid}
            x2={maxRank}
            y1={mid}
            y2={maxRank}
            fill={INK.primary}
            fillOpacity={0.02}
          />
        </>
      )}
      <XAxis
        {...axisProps}
        dataKey="x"
        name="My rank"
        domain={opts.compact ? [1, maxRank] : xView}
        label={
          opts.compact
            ? undefined
            : {
                value: "MY RANK  (1 = most comfortable)  →",
                position: "insideBottom",
                offset: -22,
                fill: INK.secondary,
                fontSize: 11,
              }
        }
      />
      <YAxis
        {...axisProps}
        dataKey="y"
        name="Competitive rank"
        domain={opts.compact ? [1, maxRank] : yView}
        reversed
        width={opts.compact ? 30 : 54}
        label={
          opts.compact
            ? undefined
            : {
                value: "COMPETITIVE RANK  (1 = strongest)",
                angle: -90,
                position: "insideLeft",
                offset: 4,
                fill: INK.secondary,
                fontSize: 11,
                style: { textAnchor: "middle" },
              }
        }
      />
      <ZAxis dataKey="z" range={opts.compact ? [18, 150] : [35, 420]} name="|delta|" />

      {/* Perfect agreement. Distance from this line IS tier_delta. */}
      <ReferenceLine
        segment={[
          { x: 1, y: 1 },
          { x: maxRank, y: maxRank },
        ]}
        stroke={INK.secondary}
        strokeDasharray="5 4"
        strokeWidth={1.25}
        ifOverflow="hidden"
      />

      <Scatter data={subset} isAnimationActive={false} shape={renderMark} />
    </ScatterChart>
  );

  return (
    <div data-scatter-host className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Legend
          items={presentArchetypes.map((a) => ({
            key: a,
            label: a,
            color: ARCHETYPE_COLOR[a],
            symbol: (
              <svg width={13} height={13} aria-hidden>
                <Symbols
                  cx={6.5}
                  cy={6.5}
                  type={ARCHETYPE_SYMBOL[a] as never}
                  size={48}
                  fill={ARCHETYPE_COLOR[a]}
                />
              </svg>
            ),
          }))}
          onToggle={(k) => setFocus((cur) => (cur === k ? null : (k as Archetype)))}
          mutedKeys={
            focus ? new Set(presentArchetypes.filter((a) => a !== focus)) : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Marks>
            ariaLabel="Mark style"
            value={marks}
            onChange={setMarks}
            options={[
              {
                value: "symbol",
                label: "Shapes",
                title: "Archetype as hue plus a distinct marker shape.",
              },
              {
                value: "icon",
                label: "Portraits",
                title:
                  "Stock icons ringed in their archetype colour. Easiest for finding one fighter.",
              },
            ]}
          />
          <Segmented<Mode>
            ariaLabel="Scatter layout"
            value={mode}
            onChange={setMode}
            options={[
              { value: "single", label: "All together" },
              {
                value: "facet",
                label: "Split by archetype",
                title:
                  "One panel per archetype. The colour-safe way to read eight categories.",
              },
            ]}
          />
        </div>
      </div>

      {mode === "single" ? (
        <>
          <div
            ref={plotRef}
            data-plot="scatter"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative h-[520px] w-full touch-none"
            style={{ cursor: gesturing ? "grabbing" : "grab" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(points)}
            </ResponsiveContainer>
            <QuadrantCaptions />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11.5px] text-[var(--color-ink-muted)]">
              Drag to pan. Scroll to zoom.{" "}
              {zoomed && (
                <span className="tnum">
                  Showing my rank {Math.round(xView[0])} to {Math.round(xView[1])}, meta
                  rank {Math.round(yView[0])} to {Math.round(yView[1])}.
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={resetView}
              disabled={!zoomed}
              className="rounded-full border border-[var(--color-hairline)] px-2.5 py-1 text-[11.5px] text-[var(--color-ink-2)] transition-opacity hover:border-[var(--color-ink-muted)] disabled:opacity-35"
            >
              Reset view
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {presentArchetypes.map((a) => {
            const subset = points.filter((p) => p.f.archetype === a);
            return (
              <div key={a} className="rounded-lg border border-[var(--color-hairline)] p-2">
                <div className="mb-1 flex items-center gap-1.5 px-1">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-sm"
                    style={{ background: ARCHETYPE_COLOR[a] }}
                  />
                  <span className="text-[12px] text-[var(--color-ink-2)]">{a}</span>
                  <span className="tnum text-[11px] text-[var(--color-ink-muted)]">
                    n={subset.length}
                  </span>
                </div>
                <div className="h-[190px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart(subset, { compact: true })}
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tip && (
        <Tooltip x={tip.x} y={tip.y} containerWidth={9999}>
          <div className="flex items-center gap-2">
            <FighterIcon character={tip.p.f.character} size={26} />
            <span className="font-semibold text-[var(--color-ink)]">
              {tip.p.f.character}
            </span>
          </div>
          <div className="tnum mt-1">
            my #{tip.p.f.myOverallRank} → meta #{tip.p.f.officialOverallRank}
          </div>
          <div className="tnum">delta {formatDelta(tip.p.f.tierDelta)}</div>
          <div className="mt-1 text-[var(--color-ink-muted)]">
            {tip.p.f.archetype} · {tip.p.f.weightClass} · {tip.p.f.mobility}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Corner captions sit outside the SVG so they never intercept a mark hover.
 * Kept deliberately low-contrast - they orient, they do not compete.
 */
function QuadrantCaptions() {
  // A translucent plane-coloured backdrop keeps these readable where marks
  // crowd a corner, without hiding the marks underneath.
  const base =
    "pointer-events-none absolute max-w-[148px] rounded bg-[rgba(13,13,13,0.72)] px-1.5 py-1 text-[10.5px] uppercase leading-tight tracking-wide text-[var(--color-ink-muted)]";
  return (
    <>
      <div className={`${base} left-[70px] top-[14px]`}>
        {QUADRANTS[0].label}
        <span className="block normal-case tracking-normal opacity-70">
          {QUADRANTS[0].detail}
        </span>
      </div>
      <div className={`${base} bottom-[52px] left-[70px]`}>
        {QUADRANTS[1].label}
        <span className="block normal-case tracking-normal opacity-70">
          {QUADRANTS[1].detail}
        </span>
      </div>
      <div className={`${base} right-[14px] top-[14px] text-right`}>
        {QUADRANTS[2].label}
        <span className="block normal-case tracking-normal opacity-70">
          {QUADRANTS[2].detail}
        </span>
      </div>
      <div className={`${base} bottom-[52px] right-[14px] text-right`}>
        {QUADRANTS[3].label}
        <span className="block normal-case tracking-normal opacity-70">
          {QUADRANTS[3].detail}
        </span>
      </div>
    </>
  );
}
