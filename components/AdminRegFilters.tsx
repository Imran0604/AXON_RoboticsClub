"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { REG_STATUS_LABEL } from "@/lib/types";

const STATUSES = Object.entries(REG_STATUS_LABEL) as [string, string][];

/**
 * Participant search and filters. Same URL-as-state approach as the public
 * directory, which also means the CSV export can simply reuse the current
 * query string and export exactly what the organiser is looking at.
 */
export function AdminRegFilters({
  events,
  fests,
  total,
}: {
  events: { slug: string; title: string }[];
  fests: { slug: string; name: string }[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  const push = useCallback(
    (mutate: (sp: URLSearchParams) => void) => {
      const sp = new URLSearchParams(params.toString());
      mutate(sp);
      sp.delete("page"); // any filter change resets pagination
      startTransition(() => {
        router.push(sp.toString() ? `/admin/registrations?${sp}` : "/admin/registrations", {
          scroll: false,
        });
      });
    },
    [params, router]
  );

  function set(key: string, value: string | null) {
    push((sp) => (value ? sp.set(key, value) : sp.delete(key)));
  }

  function onSearch(v: string) {
    setDraft(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set("q", v.trim() || null), 280);
  }

  const activeCount = ["q", "status", "event", "fest"].filter((k) => params.get(k)).length;
  const exportHref = `/api/admin/export?${params.toString()}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 lg:flex-row">
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
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, email, phone, institution, ticket code or team…"
            aria-label="Search participants"
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

        <a href={exportHref} className="btn btn-ghost shrink-0" download>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M8 2v8M4.8 7l3.2 3.2L11.2 7M2.5 13.5h11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <label className="flex items-center gap-2">
          <span className="eyebrow">Status</span>
          <select
            value={params.get("status") ?? ""}
            onChange={(e) => set("status", e.target.value || null)}
            className="field max-w-[11rem] py-1.5 text-[0.8125rem]"
            aria-label="Filter by status"
          >
            <option value="">Any status</option>
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="eyebrow">Fest</span>
          <select
            value={params.get("fest") ?? ""}
            onChange={(e) => set("fest", e.target.value || null)}
            className="field max-w-[13rem] py-1.5 text-[0.8125rem]"
            aria-label="Filter by fest"
          >
            <option value="">All fests</option>
            {fests.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="eyebrow">Event</span>
          <select
            value={params.get("event") ?? ""}
            onChange={(e) => set("event", e.target.value || null)}
            className="field max-w-[15rem] py-1.5 text-[0.8125rem]"
            aria-label="Filter by event"
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="eyebrow">Sort</span>
          <select
            value={params.get("sort") ?? "newest"}
            onChange={(e) => set("sort", e.target.value === "newest" ? null : e.target.value)}
            className="field max-w-[10rem] py-1.5 text-[0.8125rem]"
            aria-label="Sort"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">By name</option>
            <option value="event">By event</option>
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <span className="mono nums text-[0.75rem] text-ink-3">{total} matching</span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => router.push("/admin/registrations", { scroll: false })}
              className="btn btn-quiet btn-sm"
            >
              Clear {activeCount}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
