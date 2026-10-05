import Link from "next/link";
import { Art } from "@/components/Art";
import type { EventCard as EventCardData } from "@/lib/queries";
import {
  GATE_MESSAGE,
  fmtDate,
  fmtFee,
  fmtTime,
  registrationGate,
  relativeDeadline,
  teamLabel,
} from "@/lib/types";

/** Capacity meter. Colour shifts as an event fills, so pressure reads at a glance. */
export function CapacityMeter({
  capacity,
  taken,
  showLabel = true,
}: {
  capacity: number | null;
  taken: number;
  showLabel?: boolean;
}) {
  if (capacity === null) {
    return showLabel ? <p className="mono text-[0.6875rem] text-ink-3">Unlimited places</p> : null;
  }
  const pct = Math.min(100, Math.round((taken / capacity) * 100));
  const level = pct >= 100 ? "full" : pct >= 80 ? "warn" : "ok";
  const left = Math.max(0, capacity - taken);

  return (
    <div className="flex flex-col gap-1.5">
      {showLabel && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="mono text-[0.6875rem] text-ink-2">
            {taken}/{capacity} seats
          </span>
          <span
            className="mono text-[0.6875rem] font-semibold"
            style={{
              color: level === "full" ? "var(--crit)" : level === "warn" ? "var(--warn)" : "var(--ink-3)",
            }}
          >
            {left === 0 ? "Full" : `${left} left`}
          </span>
        </div>
      )}
      <div
        className="meter"
        data-level={level}
        role="progressbar"
        aria-valuenow={taken}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-label={`${taken} of ${capacity} seats taken`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const ICON = {
  calendar: (
    <path
      d="M3 5.5h10M4.5 2.5v2M11.5 2.5v2M3 5.5v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  pin: <path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 9.8 8 14 8 14Z M8 8.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" strokeLinejoin="round" />,
  users: (
    <path
      d="M10.8 13.5v-1a2.5 2.5 0 0 0-2.5-2.5H4.9a2.5 2.5 0 0 0-2.5 2.5v1M6.6 7.4a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6M13.6 13.5v-1a2.5 2.5 0 0 0-1.9-2.4M10.2 2.9a2.3 2.3 0 0 1 0 4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  tag: <path d="M2.5 7.3V3.4a.9.9 0 0 1 .9-.9h3.9L13.5 9 9 13.5 2.5 7.3Z M5.3 5.4h.01" strokeLinecap="round" strokeLinejoin="round" />,
} as const;

function Meta({ icon, children }: { icon: keyof typeof ICON; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-[0.75rem] leading-snug text-ink-2">
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" className="mt-[2px] shrink-0 text-ink-3">
        {ICON[icon]}
      </svg>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function EventCardTile({ event, showFest = true }: { event: EventCardData; showFest?: boolean }) {
  const gate = registrationGate(event, event.seats_taken);
  const deadline = relativeDeadline(event.registration_deadline);

  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link href={`/events/${event.slug}`} className="block focus-visible:outline-offset-[-2px]">
        <div className="relative h-32 overflow-hidden border-b border-line">
          <Art seed={event.art_seed} category={event.category} className="h-full w-full" />
          <span className="badge badge-brand absolute left-2.5 top-2.5 backdrop-blur-sm">
            {event.category}
          </span>
          {event.fee_bdt === 0 && (
            <span className="badge badge-ok absolute right-2.5 top-2.5 backdrop-blur-sm">Free</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div>
          {showFest && (
            <Link href={`/fests/${event.fest_slug}`} className="eyebrow hover:text-accent">
              {event.fest_name}
            </Link>
          )}
          <h3 className="mt-1 text-[0.9375rem] font-bold leading-snug">
            <Link href={`/events/${event.slug}`} className="hover:text-brand">
              {event.title}
            </Link>
          </h3>
        </div>

        {event.summary && (
          <p className="line-clamp-2 text-[0.8125rem] leading-snug text-ink-2">{event.summary}</p>
        )}

        <div className="flex flex-col gap-1.5">
          <Meta icon="calendar">
            {fmtDate(event.starts_at)} · {fmtTime(event.starts_at)}
          </Meta>
          {event.venue && <Meta icon="pin">{event.venue}</Meta>}
          <Meta icon="users">{teamLabel(event.team_min, event.team_max)}</Meta>
          <Meta icon="tag">{fmtFee(event.fee_bdt)}</Meta>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <CapacityMeter capacity={event.capacity} taken={event.seats_taken} />

          <div className="flex items-center justify-between gap-2">
            {gate.open ? (
              <span className="mono text-[0.6875rem] text-ok">{deadline ?? "Open"}</span>
            ) : (
              <span className="mono text-[0.6875rem]" style={{ color: "var(--ink-3)" }}>
                {GATE_MESSAGE[gate.reason]}
              </span>
            )}
            <Link
              href={`/events/${event.slug}`}
              className="mono text-[0.6875rem] font-semibold text-brand group-hover:text-accent"
            >
              Details →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
