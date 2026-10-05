import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Art } from "@/components/Art";
import { EventCardTile } from "@/components/EventCard";
import { Empty } from "@/components/Empty";
import { getEventsForFest, getFestBySlug } from "@/lib/queries";
import {
  FEST_PHASE_LABEL,
  FEST_PHASE_TONE,
  festPhase,
  fmtDateRange,
  registrationGate,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/fests/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const fest = await getFestBySlug(slug);
  if (!fest) return { title: "Fest not found" };
  return {
    title: fest.name,
    description: fest.tagline ?? fest.description?.slice(0, 160) ?? undefined,
  };
}

export default async function FestPage({ params }: PageProps<"/fests/[slug]">) {
  const { slug } = await params;
  const fest = await getFestBySlug(slug);
  if (!fest) notFound();

  const events = await getEventsForFest(fest.id);
  const phase = festPhase(fest);
  const openCount = events.filter((e) => registrationGate(e, e.seats_taken).open).length;

  // Group events by the day they run, which is how a participant actually
  // plans a festival visit.
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const key = new Date(e.starts_at).toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      {/* ------------------------------------------------------------- Banner */}
      <section className="relative border-b border-line bg-surface">
        <div className="absolute inset-0 opacity-45">
          <Art seed={fest.art_seed} category="Hardware" className="h-full w-full" wide />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, var(--surface) 22%, transparent 95%)" }}
        />
        <div className="relative mx-auto w-full max-w-[84rem] px-5 py-12">
          <nav className="mono flex items-center gap-1.5 text-[0.6875rem] text-ink-3" aria-label="Breadcrumb">
            <Link href="/fests" className="hover:text-accent">
              Fests
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink-2">{fest.name}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`badge ${FEST_PHASE_TONE[phase]}`}>{FEST_PHASE_LABEL[phase]}</span>
            <span className="badge badge-neutral">{fmtDateRange(fest.start_date, fest.end_date)}</span>
            {openCount > 0 && <span className="badge badge-accent">{openCount} open now</span>}
          </div>

          <h1 className="mt-3.5 max-w-3xl text-[2rem] font-extrabold leading-tight sm:text-[2.625rem]">
            {fest.name}
          </h1>

          {fest.tagline && (
            <p className="mt-2 max-w-2xl text-[1.0625rem] italic text-ink-2">{fest.tagline}</p>
          )}

          {fest.description && (
            <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">
              {fest.description}
            </p>
          )}

          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { k: "Events", v: String(fest.event_count) },
              { k: "Registrations", v: String(fest.registration_count) },
              { k: "Venue", v: fest.venue ?? "To be announced" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="eyebrow">{s.k}</dt>
                <dd className="mono nums mt-1 text-[0.9375rem] font-semibold text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------- Events */}
      <div className="mx-auto w-full max-w-[84rem] px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Event list</p>
            <h2 className="mt-1.5 text-[1.5rem] font-extrabold">
              {events.length} {events.length === 1 ? "event" : "events"} in this fest
            </h2>
          </div>
          <Link
            href={`/events?fest=${fest.slug}`}
            className="mono text-[0.75rem] font-semibold text-brand hover:text-accent"
          >
            Search and filter these events →
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="mt-6">
            <Empty
              title="No events published for this fest yet"
              body="The schedule is still being put together. Check the other festivals in the meantime."
              actionHref="/fests"
              actionLabel="Back to fests"
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-10">
            {days.map(([day, dayEvents]) => (
              <section key={day}>
                <div className="flex items-center gap-3">
                  <h3 className="mono text-[0.8125rem] font-semibold text-ink">
                    {new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </h3>
                  <span className="h-px flex-1" style={{ background: "var(--line)" }} />
                  <span className="mono nums text-[0.6875rem] text-ink-3">
                    {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {dayEvents.map((e) => (
                    <EventCardTile key={e.id} event={e} showFest={false} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
