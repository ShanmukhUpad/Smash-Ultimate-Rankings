"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import {
  archetypeColor,
  DELTA_NEGATIVE,
  DELTA_POSITIVE,
  deltaColor,
  INK,
} from "@/lib/palette";
import { iconFrameLabel, iconFrames } from "@/lib/icons";
import { useIconTick } from "@/lib/useIconTick";
import { formatDelta, formatRho, mean, spearmanOf } from "@/lib/stats";
import type { Fighter } from "@/lib/types";
import { FighterIcon } from "./ui";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-hairline)] py-1.5 last:border-0">
      <dt className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="text-right text-[12.5px] text-[var(--color-ink-2)]">{value}</dd>
    </div>
  );
}

function YesNo({ v }: { v: boolean }) {
  return (
    <span className={v ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}>
      {v ? "yes" : "no"}
    </span>
  );
}

export default function CharacterPanel({
  all,
  visible,
  selected,
  hovered,
  onSelect,
  onHover,
  maxRank,
}: {
  all: Fighter[];
  visible: Fighter[];
  selected: string | null;
  hovered: string | null;
  onSelect: (name: string | null) => void;
  onHover: (name: string | null) => void;
  maxRank: number;
}) {
  const reduce = useReducedMotion();
  const iconTick = useIconTick();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? all : visible;
    if (!q) return [...pool].sort((a, b) => a.myOverallRank - b.myOverallRank);
    return pool
      .filter(
        (f) =>
          f.character.toLowerCase().includes(q) ||
          f.franchise.toLowerCase().includes(q) ||
          f.archetype.toLowerCase().includes(q)
      )
      .sort((a, b) => a.myOverallRank - b.myOverallRank);
  }, [query, all, visible]);

  const active = all.find((f) => f.character === (selected ?? hovered)) ?? null;

  const peers = useMemo(
    () => (active ? all.filter((f) => f.archetype === active.archetype) : []),
    [active, all]
  );
  const peerMean = peers.length ? mean(peers.map((p) => p.tierDelta)) : null;
  const peerRho = peers.length >= 5 ? spearmanOf(peers) : null;

  const visibleNames = useMemo(
    () => new Set(visible.map((v) => v.character)),
    [visible]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <label className="sr-only" htmlFor="character-search">
          Search characters
        </label>
        <input
          id="character-search"
          type="search"
          value={query}
          placeholder="Search all 86 by name, franchise or archetype"
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[#3987e5] focus:outline-none"
        />
        {query && (
          <p className="mt-1.5 text-[11px] text-[var(--color-ink-muted)]">
            Searching the full roster, filters ignored. {results.length} match
            {results.length === 1 ? "" : "es"}.
          </p>
        )}
      </div>

      <ul className="max-h-[230px] overflow-y-auto pr-1">
        {results.map((f) => {
          const isSel = selected === f.character;
          const outsideFilter = !visibleNames.has(f.character);
          return (
            <li key={f.character}>
              <button
                type="button"
                onMouseEnter={() => onHover(f.character)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect(isSel ? null : f.character)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] transition-colors ${
                  isSel
                    ? "bg-[var(--color-ink)] text-[var(--color-plane)]"
                    : "text-[var(--color-ink-2)] hover:bg-[#2a2a28]"
                }`}
              >
                <FighterIcon
                  character={f.character}
                  size={20}
                  ring={archetypeColor(f.archetype)}
                  dimmed={outsideFilter}
                />
                <span className={`flex-1 truncate ${outsideFilter ? "opacity-50" : ""}`}>
                  {f.character}
                  {outsideFilter && (
                    <span className="ml-1 text-[10px] opacity-70">(filtered out)</span>
                  )}
                </span>
                <span
                  className="tnum shrink-0 text-[11px]"
                  style={{
                    color: isSel
                      ? undefined
                      : f.tierDelta >= 0
                        ? DELTA_POSITIVE
                        : DELTA_NEGATIVE,
                  }}
                >
                  {formatDelta(f.tierDelta)}
                </span>
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="px-2 py-3 text-[12px] text-[var(--color-ink-muted)]">
            No match.
          </li>
        )}
      </ul>

      {active ? (
        <motion.div
          key={active.character}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
          className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <FighterIcon
                character={active.character}
                size={44}
                ring={archetypeColor(active.archetype)}
              />
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-[var(--color-ink)]">
                  {active.character}
                </h3>
                <p className="text-[11.5px] text-[var(--color-ink-muted)]">
                  {active.franchise} · {active.franchiseGenre}
                </p>
                {iconFrames(active.character).length > 1 && (
                  <p className="text-[10.5px] text-[var(--color-ink-muted)] opacity-80">
                    showing {iconFrameLabel(active.character, iconTick)}
                  </p>
                )}
              </div>
            </div>
            <span
              className="tnum rounded px-2 py-0.5 text-[13px] font-semibold"
              style={{
                background: deltaColor(active.tierDelta),
                color: "#0d0d0d",
              }}
            >
              {formatDelta(active.tierDelta)}
            </span>
          </div>

          {/* Two rank positions on one track: the gap is tier_delta. */}
          <div className="relative mt-3 h-9">
            <div
              aria-hidden
              className="absolute inset-x-0 top-[18px] h-px"
              style={{ background: INK.axis }}
            />
            {(
              [
                { label: "me", rank: active.myOverallRank, colour: "#3987e5", top: 0 },
                {
                  label: "meta",
                  rank: active.officialOverallRank,
                  colour: "#898781",
                  top: 22,
                },
              ] as const
            ).map((m) => (
              <div key={m.label}>
                <motion.span
                  className="absolute size-2.5 -translate-x-1/2 rounded-full"
                  initial={false}
                  animate={{ left: `${((m.rank - 1) / (maxRank - 1)) * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.35 }}
                  style={{ top: 13, background: m.colour }}
                />
                <motion.span
                  className="tnum absolute -translate-x-1/2 text-[10px]"
                  initial={false}
                  animate={{ left: `${((m.rank - 1) / (maxRank - 1)) * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.35 }}
                  style={{ top: m.top, color: m.colour }}
                >
                  {m.label} #{m.rank}
                </motion.span>
              </div>
            ))}
          </div>

          <dl className="mt-3">
            <Field
              label="My tier"
              value={`${active.myTier} (#${active.myRankInTier} in tier)`}
            />
            <Field
              label="Competitive tier"
              value={`${active.officialTier} (#${active.officialRankInTier} in tier)`}
            />
            <Field
              label="Archetype"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: archetypeColor(active.archetype) }}
                  />
                  {active.archetype}
                </span>
              }
            />
            <Field label="Weight" value={active.weightClass} />
            <Field label="Mobility" value={active.mobility} />
            <Field label="Gimmick mechanic" value={<YesNo v={active.hasGimmickMechanic} />} />
            <Field label="Projectile" value={<YesNo v={active.projectileUser} />} />
            <Field label="Disjoint" value={<YesNo v={active.disjointUser} />} />
            <Field label="Debut" value={active.smashDebut} />
            <Field
              label="Origin"
              value={`${active.party}${active.isDlc ? " · DLC" : ""}${
                active.isEcho ? " · echo" : ""
              }`}
            />
          </dl>

          {peerMean !== null && (
            <p className="mt-3 border-t border-[var(--color-hairline)] pt-2 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
              {active.archetype} averages{" "}
              <span
                className="tnum font-semibold"
                style={{ color: peerMean >= 0 ? DELTA_POSITIVE : DELTA_NEGATIVE }}
              >
                {formatDelta(Math.round(peerMean * 10) / 10)}
              </span>{" "}
              across {peers.length} fighters
              {peerRho !== null && <> (within-group ρ {formatRho(peerRho)})</>}.{" "}
              {active.character} sits{" "}
              <span className="tnum font-semibold text-[var(--color-ink-2)]">
                {formatDelta(Math.round((active.tierDelta - peerMean) * 10) / 10)}
              </span>{" "}
              from that group mean.
            </p>
          )}
        </motion.div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--color-hairline)] p-4 text-[12px] text-[var(--color-ink-muted)]">
          Pick a fighter. Or hover any mark in the charts.
        </p>
      )}
    </div>
  );
}
