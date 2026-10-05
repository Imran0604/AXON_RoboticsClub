"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Search bar in the hero.
 *
 * Putting a working control where a decorative banner would normally go means
 * the first thing on the page does something — and it puts the event search
 * one keystroke from the landing page instead of two clicks away.
 */
export function HeroSearch({ eventCount, suggestions }: { eventCount: number; suggestions: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function go(term: string) {
    const v = term.trim();
    router.push(v ? `/events?q=${encodeURIComponent(v)}` : "/events");
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex w-full max-w-xl overflow-hidden rounded border bg-surface"
        style={{ borderColor: "var(--line-2)" }}
        role="search"
      >
        <span className="grid w-11 shrink-0 place-items-center text-ink-3" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.6 10.6L14 14" strokeLinecap="round" />
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${eventCount} events…`}
          aria-label="Search events"
          className="min-w-0 flex-1 bg-transparent py-3 pr-3 text-[0.9375rem] text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="submit"
          className="mono shrink-0 px-5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] transition-colors"
          style={{ background: "var(--brand)", color: "var(--on-brand)" }}
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-0.5">Try</span>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            className="rounded-sm border px-2 py-1 text-[0.75rem] transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
