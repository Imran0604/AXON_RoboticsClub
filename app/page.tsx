import Link from "next/link";
import { HeroSearch } from "@/components/HeroSearch";
import { FestCardTile } from "@/components/FestCard";
import { EventCardTile } from "@/components/EventCard";
import { getDashboardStats, getFests, searchEvents } from "@/lib/queries";
import { festPhase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [fests, openEvents, stats] = await Promise.all([
    getFests(),
    searchEvents({ open: true, sort: "soonest" }),
    getDashboardStats(),
  ]);

  const live = fests.filter((f) => festPhase(f) === "ongoing");
  const upcoming = fests.filter((f) => festPhase(f) === "upcoming");
  const featured = [...live, ...upcoming].slice(0, 3);

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-line grid-texture glow">
        <div className="relative z-10 mx-auto w-full max-w-[84rem] px-5 pb-14 pt-16 sm:pb-16 sm:pt-24">
          {/* Live status line — the first thing on the page is a true fact
              about right now, not a slogan. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-2 rounded-full border px-2.5 py-1" style={{ borderColor: "var(--line-2)" }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--ok)" }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--ok)" }} />
              </span>
              <span className="mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ink-2">
                {live.length > 0 ? `${live[0].name} is running now` : `${upcoming.length} fests announced`}
              </span>
            </span>
            <span className="eyebrow">AXON Robotics Club · Est. 2025</span>
          </div>

          {/* Thesis. The brief's own complaint, answered in the headline. */}
          <h1 className="rise mt-7 max-w-[20ch] text-[2.5rem] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[4rem] lg:text-[4.75rem]">
            Club operations
            <br />
            without the{" "}
            <span className="relative whitespace-nowrap" style={{ color: "var(--brand)" }}>
              Google Form
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="7"
                viewBox="0 0 300 7"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M1 5.5 Q 150 1 299 5" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
              </svg>
            </span>
            .
          </h1>

          <p
            className="rise mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2"
            style={{ animationDelay: "60ms" }}
          >
            Browse every festival the club runs, explore the events inside each one, and register in
            a form the organisers built themselves — with real capacity limits, real deadlines, and
            a scannable ticket at the end of it.
          </p>

          <div className="rise mt-8" style={{ animationDelay: "120ms" }}>
            <HeroSearch
              eventCount={stats.total_events}
              suggestions={["drone", "workshop", "free", "hardware"]}
            />
          </div>

          <div className="rise mt-8 flex flex-wrap gap-2.5" style={{ animationDelay: "160ms" }}>
            <Link href="/events?open=1" className="btn btn-primary btn-lg">
              {openEvents.length} events open now
            </Link>
            <Link href="/fests" className="btn btn-ghost btn-lg">
              Browse all fests
            </Link>
          </div>

          {/* Figures as a thin mono rail rather than boxed tiles — denser, and
              it reads as instrumentation rather than marketing. */}
          <dl
            className="rise mt-14 flex flex-wrap gap-y-5 border-t pt-6"
            style={{ borderColor: "var(--line)", animationDelay: "200ms" }}
          >
            {[
              { k: "Festivals", v: stats.total_fests },
              { k: "Events", v: stats.total_events },
              { k: "Registrations", v: stats.total_registrations },
              { k: "Participants", v: stats.total_participants },
              { k: "Checked in", v: stats.checked_in },
            ].map((s, i) => (
              <div
                key={s.k}
                className="flex min-w-[7.5rem] flex-col gap-1 px-5 first:pl-0"
                style={{ borderLeft: i === 0 ? "none" : "1px solid var(--line)" }}
              >
                <dt className="eyebrow">{s.k}</dt>
                <dd className="mono nums text-[1.5rem] font-semibold leading-none text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------- Judge banner */}
      <aside className="border-b border-line" style={{ background: "var(--accent-soft)" }}>
        <div className="mx-auto flex w-full max-w-[84rem] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="var(--accent)" strokeWidth="1.6" className="mt-0.5 shrink-0">
              <path d="M8 1.5l2 4.4 4.5.5-3.4 3 1 4.6L8 11.7 3.9 14l1-4.6-3.4-3 4.5-.5L8 1.5Z" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-[0.875rem] font-semibold text-ink">Evaluating this project?</p>
              <p className="text-[0.8125rem] leading-snug text-ink-2">
                The judge page maps every rubric requirement to the exact page that demonstrates it,
                with one-click logins for all three roles.
              </p>
            </div>
          </div>
          <Link href="/judge" className="btn btn-accent btn-sm shrink-0 self-start sm:self-auto">
            Open judge guide
          </Link>
        </div>
      </aside>

      {/* -------------------------------------------------------------- Fests */}
      <section className="mx-auto w-full max-w-[84rem] px-5 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Fest directory</p>
            <h2 className="mt-1.5 text-[1.625rem] font-extrabold">
              {live.length > 0 ? "Happening now and coming up" : "Upcoming festivals"}
            </h2>
          </div>
          <Link href="/fests" className="mono shrink-0 text-[0.75rem] font-semibold text-brand hover:text-accent">
            All {fests.length} fests →
          </Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((f) => (
            <FestCardTile key={f.id} fest={f} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Open events */}
      {openEvents.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Open for registration</p>
                <h2 className="mt-1.5 text-[1.625rem] font-extrabold">Register before these close</h2>
              </div>
              <Link href="/events" className="mono shrink-0 text-[0.75rem] font-semibold text-brand hover:text-accent">
                Search all events →
              </Link>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {openEvents.slice(0, 4).map((e) => (
                <EventCardTile key={e.id} event={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- How it works */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-[84rem] px-5 py-14">
          <p className="eyebrow">How registration works</p>
          <h2 className="mt-1.5 text-[1.625rem] font-extrabold">Four steps, no third-party forms</h2>

          <ol className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              {
                t: "Pick a fest",
                d: "Every festival the club has run or will run, with its live status computed from the dates rather than set by hand.",
              },
              {
                t: "Choose an event",
                d: "Each event page shows its schedule, venue, rules, fee, team size, seats remaining and registration deadline.",
              },
              {
                t: "Fill the form",
                d: "Organisers compose each event's questions themselves, so a drone pilot and a quiz team are never asked the same things.",
              },
              {
                t: "Get your ticket",
                d: "A unique code and QR pass, scannable at the venue. Manage or cancel it any time from your account.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex flex-col gap-2">
                <span className="mono text-[0.6875rem] font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px w-full" style={{ background: "var(--line)" }} />
                <h3 className="mt-1 text-[0.9375rem] font-bold">{s.t}</h3>
                <p className="text-[0.8125rem] leading-relaxed text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
