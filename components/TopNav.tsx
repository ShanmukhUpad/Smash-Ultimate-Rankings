"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Analysis" },
  { href: "/tier-lists", label: "Tier lists" },
] as const;

/** Site chrome: wordmark on the left, page tabs on the right. */
export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 h-[52px] border-b border-[var(--color-hairline)] bg-[rgba(13,13,13,0.92)] backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <span className="truncate text-[12.5px] uppercase tracking-wide text-[var(--color-ink-muted)]">
          Smash Ultimate · comfort vs. meta
        </span>

        <div
          role="tablist"
          aria-label="Pages"
          className="flex shrink-0 gap-1 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-1"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={active}
                className={`rounded-md px-3 py-1 text-[12.5px] transition-colors ${
                  active
                    ? "bg-[var(--color-ink)] text-[var(--color-plane)]"
                    : "text-[var(--color-ink-2)] hover:bg-[#2e2e2c]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
