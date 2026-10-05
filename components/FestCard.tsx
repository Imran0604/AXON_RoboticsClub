import Link from "next/link";
import { Art } from "@/components/Art";
import type { FestCard as FestCardData } from "@/lib/queries";
import { FEST_PHASE_LABEL, FEST_PHASE_TONE, fmtDateRange, festPhase } from "@/lib/types";

export function FestCardTile({ fest }: { fest: FestCardData }) {
  const phase = festPhase(fest);

  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link href={`/fests/${fest.slug}`} className="block">
        <div className="relative h-36 overflow-hidden border-b border-line">
          <Art seed={fest.art_seed} category="Hardware" className="h-full w-full" wide />
          <span className={`badge ${FEST_PHASE_TONE[phase]} absolute left-3 top-3`}>
            {phase === "ongoing" && (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "currentColor" }}
                aria-hidden="true"
              />
            )}
            {FEST_PHASE_LABEL[phase]}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="mono text-[0.6875rem] text-ink-3">{fmtDateRange(fest.start_date, fest.end_date)}</p>
          <h3 className="mt-1 text-[1.0625rem] font-bold leading-snug">
            <Link href={`/fests/${fest.slug}`} className="hover:text-navy">
              {fest.name}
            </Link>
          </h3>
        </div>

        {fest.tagline && <p className="text-[0.8125rem] italic leading-snug text-ink-2">{fest.tagline}</p>}

        {fest.venue && <p className="text-[0.75rem] text-ink-3">{fest.venue}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex gap-4">
            <span className="flex flex-col">
              <span className="mono nums text-[0.9375rem] font-semibold leading-none text-ink">
                {fest.event_count}
              </span>
              <span className="eyebrow mt-1 text-[0.5625rem]">Events</span>
            </span>
            <span className="flex flex-col">
              <span className="mono nums text-[0.9375rem] font-semibold leading-none text-ink">
                {fest.registration_count}
              </span>
              <span className="eyebrow mt-1 text-[0.5625rem]">Registered</span>
            </span>
          </div>
          <Link
            href={`/fests/${fest.slug}`}
            className="mono text-[0.6875rem] font-semibold text-navy group-hover:text-brass"
          >
            View events →
          </Link>
        </div>
      </div>
    </article>
  );
}
