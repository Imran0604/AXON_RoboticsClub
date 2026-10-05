"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

/**
 * Search and filter bar for the event directory.
 *
 * Every control writes to the URL rather than to local state, so any filtered
 * view is linkable, survives a reload, and works with the back button. The
 * search box is debounced so typing doesn't fire a request per keystroke.
 */

export interface FilterOptions {
  categories: { category: string; count: number }[];
  fests: { slug: string; name: string }[];
}

export function EventFilters({ categories, fests, resultCount }: FilterOptions & { resultCount: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in step when the URL changes from elsewhere (back button,
  // a "clear all" click, a link into a filtered view).
  useEffect(() => {
    setDraft(q);
  }, [q]);

  const push = useCallback(
    (mutate: (sp: URLSearchParams) => void) => {
      const sp = new URLSearchParams(params.toString());
      mutate(sp);
      startTransition(() => {
        router.push(sp.toString() ? `/events?${sp}` : "/events", { scroll: false });
      });
    },
    [params, router]
  );

  function setParam(key: string, value: string | null) {
    push((sp) => {
      if (value === null || value === "") sp.delete(key);
      else sp.set(key, value);
    });
  }

  function onSearchChange(value: string) {
    setDraft(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam("q", value.trim() || null), 280);
  }

  const active = ["q", "category", "fest", "fee", "team", "open"].filter((k) => params.get(k));
  const sort = params.get("sort") ?? "soonest";

  return (
    <div className="flex flex-col gap-4">
      {/* Search ------------------------------------------------------------ */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 16 16"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.6 10.6L14 14" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={draft}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events by name, description, category or venue…"
            aria-label="Search events"
            className="field pl-9"
          />
          {pending && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg viewBox="0 0 16 16" width="14" height="14" className="animate-spin text-ink-3" aria-hidden="true">
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value === "soonest" ? null : e.target.value)}
          aria-label="Sort events"
          className="field sm:w-52"
        >
          <option value="soonest">Soonest first</option>
          <option value="latest">Latest first</option>
          <option value="seats">Fewest seats left</option>
          <option value="title">A to Z</option>
        </select>
      </div>

      {/* Category chips --------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
        <span className="eyebrow mr-1">Category</span>
        <button
          type="button"
          onClick={() => setParam("category", null)}
          aria-pressed={!params.get("category")}
          className="badge"
          style={
            !params.get("category")
              ? { background: "var(--navy)", color: "var(--on-navy)", borderColor: "var(--navy)" }
              : { background: "var(--surface)", color: "var(--ink-2)", borderColor: "var(--line-2)" }
          }
        >
          All
        </button>
        {categories.map((c) => {
          const on = params.get("category") === c.category;
          return (
            <button
              key={c.category}
              type="button"
              onClick={() => setParam("category", on ? null : c.category)}
              aria-pressed={on}
              className="badge"
              style={
                on
                  ? { background: "var(--navy)", color: "var(--on-navy)", borderColor: "var(--navy)" }
                  : { background: "var(--surface)", color: "var(--ink-2)", borderColor: "var(--line-2)" }
              }
            >
              {c.category}
              <span className="nums opacity-60">{c.count}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary filters ------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-3.5">
        <label className="flex items-center gap-2">
          <span className="eyebrow">Fest</span>
          <select
            value={params.get("fest") ?? ""}
            onChange={(e) => setParam("fest", e.target.value || null)}
            aria-label="Filter by fest"
            className="field py-1.5 text-[0.8125rem] max-w-[14rem]"
          >
            <option value="">All fests</option>
            {fests.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <Toggle label="Fee" options={[["", "Any"], ["free", "Free"], ["paid", "Paid"]]} value={params.get("fee") ?? ""} onChange={(v) => setParam("fee", v || null)} />
        <Toggle label="Entry" options={[["", "Any"], ["solo", "Solo"], ["team", "Team"]]} value={params.get("team") ?? ""} onChange={(v) => setParam("team", v || null)} />

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="check"
            checked={params.get("open") === "1"}
            onChange={(e) => setParam("open", e.target.checked ? "1" : null)}
          />
          <span className="text-[0.8125rem] font-medium">Open for registration only</span>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <span className="mono nums text-[0.75rem] text-ink-3">
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </span>
          {active.length > 0 && (
            <button type="button" onClick={() => router.push("/events", { scroll: false })} className="btn btn-quiet btn-sm">
              Clear {active.length} filter{active.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow">{label}</span>
      <div className="flex rounded-sm border border-line-2 bg-surface p-0.5" role="group" aria-label={label}>
        {options.map(([v, l]) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={on}
              className="rounded-[3px] px-2 py-1 text-[0.75rem] font-semibold transition-colors"
              style={{
                background: on ? "var(--navy)" : "transparent",
                color: on ? "var(--on-navy)" : "var(--ink-3)",
              }}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
