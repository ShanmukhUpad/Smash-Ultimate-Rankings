"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/assets";
import { iconFrames } from "@/lib/icons";
import { useIconTick } from "@/lib/useIconTick";
import { INK } from "@/lib/palette";

/** Measures a container so the hand-built SVG charts can size themselves. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function Card({
  title,
  subtitle,
  note,
  actions,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  note?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-[var(--color-ink-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-1.5">{actions}</div>}
      </header>
      {children}
      {note && (
        <p className="mt-3 border-t border-[var(--color-hairline)] pt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
          {note}
        </p>
      )}
    </section>
  );
}

export function Chip({
  active,
  onClick,
  children,
  color,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
        active
          ? "border-transparent bg-[var(--color-ink)] text-[var(--color-plane)]"
          : "border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-muted)]"
      }`}
    >
      {color && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </button>
  );
}

/** Small segmented control. Values must be unique. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
            value === o.value
              ? "bg-[var(--color-ink)] text-[var(--color-plane)]"
              : "text-[var(--color-ink-2)] hover:bg-[#2e2e2c]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TriToggle({
  label,
  state,
  onClick,
  hint,
}: {
  label: string;
  state: boolean | null;
  onClick: () => void;
  hint?: string;
}) {
  const text = state === null ? "any" : state ? "yes" : "no";
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
        state === null
          ? "border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-muted)]"
          : "border-transparent bg-[var(--color-ink)] text-[var(--color-plane)]"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded px-1 text-[10.5px] uppercase tracking-wide ${
          state === null
            ? "bg-[#2e2e2c] text-[var(--color-ink-muted)]"
            : "bg-[rgba(0,0,0,0.15)]"
        }`}
      >
        {text}
      </span>
    </button>
  );
}

/** Legend entries carry identity so colour is never the only channel. */
export function Legend({
  items,
  onHover,
  onToggle,
  mutedKeys,
}: {
  items: { key: string; label: string; color: string; symbol?: React.ReactNode }[];
  onHover?: (key: string | null) => void;
  onToggle?: (key: string) => void;
  mutedKeys?: Set<string>;
}) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {items.map((it) => {
        const muted = mutedKeys?.has(it.key) ?? false;
        const Tag = onToggle ? "button" : "span";
        return (
          <li key={it.key}>
            <Tag
              {...(onToggle
                ? { type: "button" as const, onClick: () => onToggle(it.key) }
                : {})}
              onMouseEnter={() => onHover?.(it.key)}
              onMouseLeave={() => onHover?.(null)}
              className={`flex items-center gap-1.5 text-[11.5px] transition-opacity ${
                muted ? "opacity-35" : "opacity-100"
              } ${onToggle ? "cursor-pointer hover:opacity-80" : ""}`}
            >
              {it.symbol ?? (
                <span
                  aria-hidden
                  className="size-2.5 rounded-sm"
                  style={{ background: it.color }}
                />
              )}
              <span className="text-[var(--color-ink-2)]">{it.label}</span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  /** ReactNode so glyphs that must not be uppercased (rho) can opt out. */
  label: React.ReactNode;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </div>
      <div
        className="mt-1 text-[26px] font-semibold leading-none"
        style={{ color: accent ?? INK.primary }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 text-[11.5px] leading-snug text-[var(--color-ink-muted)]">
          {sub}
        </div>
      )}
    </div>
  );
}

/** n < 5: shown, never presented as a finding. */
export function UnderpoweredBadge({ n }: { n: number }) {
  return (
    <span
      title={`n = ${n}. Too few fighters for a stable mean. Statistics suppressed.`}
      className="rounded border border-[var(--color-hairline)] px-1 text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]"
    >
      n={n} low
    </span>
  );
}

export function Tooltip({
  x,
  y,
  children,
  containerWidth,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  containerWidth: number;
}) {
  const flip = x > containerWidth - 200;
  return (
    <div
      className="pointer-events-none absolute z-30 max-w-[240px] rounded-lg border border-[var(--color-hairline)] bg-[#232321] px-2.5 py-2 text-[11.5px] leading-snug text-[var(--color-ink-2)] shadow-xl"
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? containerWidth - x + 12 : undefined,
        top: y + 12,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stock icon for a fighter. Plain <img> rather than next/image: the set is 84
 * fixed 200px sprites served straight out of /public, and the static export has
 * no image optimiser to call.
 */
export function FighterIcon({
  character,
  size = 20,
  ring,
  dimmed,
  className = "",
}: {
  character: string;
  size?: number;
  /** Archetype colour drawn as a ring, when identity needs a second channel. */
  ring?: string;
  dimmed?: boolean;
  className?: string;
}) {
  const tick = useIconTick();
  const frames = iconFrames(character);
  const frame = tick % frames.length;

  return (
    <span
      className={`relative inline-block shrink-0 align-middle ${className}`}
      style={{
        width: size,
        height: size,
        opacity: dimmed ? 0.3 : 1,
        borderRadius: ring ? "50%" : undefined,
        boxShadow: ring ? `0 0 0 1.5px ${ring}` : undefined,
      }}
    >
      {/* Every frame stays mounted and only its opacity changes, so a rotating
          portrait cross-fades instead of flashing a blank box while it loads.

          suppressHydrationWarning: content blockers and image-scanning
          extensions stamp their own attributes and classes onto every <img>
          before React hydrates, which React then reports as a mismatch. What
          this component renders is deterministic - a pure slug and a tick that
          is 0 on both server and first client render - so the only mismatches
          possible here come from outside the app. */}
      {frames.map((slug, i) => (
        <img
          key={slug}
          suppressHydrationWarning
          src={asset(`/icons/${slug}.png`)}
          alt=""
          aria-hidden
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 select-none transition-opacity duration-500"
          style={{
            width: size,
            height: size,
            opacity: i === frame ? 1 : 0,
          }}
        />
      ))}
    </span>
  );
}
