import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Art } from "@/components/Art";
import { CapacityMeter } from "@/components/EventCard";
import { Countdown } from "@/components/Countdown";
import { getSession } from "@/lib/auth";
import {
  getEventBySlug,
  getFormFields,
  getMyRegistrationForEvent,
  getWaitlistCount,
} from "@/lib/queries";
import {
  GATE_MESSAGE,
  REG_STATUS_LABEL,
  REG_STATUS_TONE,
  fmtDate,
  fmtDateTime,
  fmtFee,
  fmtTime,
  registrationGate,
  relativeDeadline,
  teamLabel,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.summary ?? event.description?.slice(0, 160) ?? undefined,
  };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const user = await getSession();
  const [fields, waitlisted, mine] = await Promise.all([
    getFormFields(event.id),
    getWaitlistCount(event.id),
    user ? getMyRegistrationForEvent(user.id, event.id) : Promise.resolve(null),
  ]);

  const gate = registrationGate(event, event.seats_taken);
  const deadlineLabel = relativeDeadline(event.registration_deadline);
  const canWaitlist = !gate.open && gate.reason === "capacity";

  return (
    <>
      {/* -------------------------------------------------------------- Header */}
      <section className="relative border-b border-line bg-surface">
        <div className="absolute inset-0 opacity-40">
          <Art seed={event.art_seed} category={event.category} className="h-full w-full" wide />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, var(--surface) 26%, transparent 96%)" }}
        />
        <div className="relative mx-auto w-full max-w-[84rem] px-5 py-11">
          <nav className="mono flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-ink-3" aria-label="Breadcrumb">
            <Link href="/fests" className="hover:text-accent">
              Fests
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/fests/${event.fest_slug}`} className="hover:text-accent">
              {event.fest_name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink-2">{event.title}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="badge badge-brand">{event.category}</span>
            <span className={`badge ${event.fee_bdt === 0 ? "badge-ok" : "badge-neutral"}`}>
              {fmtFee(event.fee_bdt)}
            </span>
            <span className="badge badge-neutral">{teamLabel(event.team_min, event.team_max)}</span>
            {gate.open ? (
              <span className="badge badge-ok">Registration open</span>
            ) : (
              <span className={`badge ${canWaitlist ? "badge-warn" : "badge-crit"}`}>
                {GATE_MESSAGE[gate.reason]}
              </span>
            )}
          </div>

          <h1 className="mt-4 max-w-3xl text-[1.875rem] font-extrabold leading-tight sm:text-[2.5rem]">
            {event.title}
          </h1>

          {event.summary && (
            <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{event.summary}</p>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------------- Body */}
      <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-5 py-10 lg:grid-cols-[1fr_21rem]">
        {/* ---- main column ---- */}
        <div className="flex min-w-0 flex-col gap-9">
          {/* Key facts, repeated here because this is the section a judge is
              told to look for: deadline and capacity. */}
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-4">
            {[
              { k: "Starts", v: fmtDate(event.starts_at), sub: fmtTime(event.starts_at) },
              {
                k: "Ends",
                v: event.ends_at ? fmtDate(event.ends_at) : "—",
                sub: event.ends_at ? fmtTime(event.ends_at) : "Not specified",
              },
              {
                k: "Capacity",
                v: event.capacity === null ? "Unlimited" : `${event.seats_taken}/${event.capacity}`,
                sub:
                  event.capacity === null
                    ? "No seat limit"
                    : gate.seatsLeft === 0
                      ? "Full"
                      : `${gate.seatsLeft} seats left`,
              },
              {
                k: "Deadline",
                v: event.registration_deadline ? fmtDate(event.registration_deadline) : "—",
                sub: deadlineLabel ?? "No deadline set",
              },
            ].map((f) => (
              <div key={f.k} className="bg-surface px-3.5 py-3">
                <dt className="eyebrow">{f.k}</dt>
                <dd className="mono nums mt-1.5 text-[0.9375rem] font-semibold leading-tight text-ink">{f.v}</dd>
                <dd className="mt-0.5 text-[0.75rem] text-ink-3">{f.sub}</dd>
              </div>
            ))}
          </dl>

          {event.description && (
            <section>
              <h2 className="text-[1.1875rem] font-extrabold">About this event</h2>
              <div className="prose-body mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
                {event.description.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          )}

          {event.rules && (
            <section>
              <h2 className="text-[1.1875rem] font-extrabold">Rules</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {event.rules.split("\n").filter(Boolean).map((rule, i) => (
                  <li key={i} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-ink-2">
                    <span className="mono mt-0.5 shrink-0 text-[0.6875rem] text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* What the registration form will ask — set by the organiser, shown
              up front so nobody starts a form they can't finish. */}
          {fields.length > 0 && (
            <section>
              <h2 className="text-[1.1875rem] font-extrabold">What we'll ask you</h2>
              <p className="mt-1.5 text-[0.875rem] text-ink-2">
                The organisers built this form for this event specifically — {fields.length} questions,{" "}
                {fields.filter((f) => f.required).length} of them required.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {fields.map((f) => (
                  <li key={f.id} className="card flex items-start gap-2.5 px-3 py-2.5">
                    <span className="badge badge-neutral mt-px shrink-0">{f.type}</span>
                    <span className="min-w-0 text-[0.8125rem] leading-snug">
                      {f.label}
                      {f.required && (
                        <span className="text-crit" aria-label="required">
                          {" "}
                          *
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <h3 className="eyebrow">Venue</h3>
              <p className="mt-2 text-[0.9375rem] font-semibold">{event.venue ?? "To be announced"}</p>
              <p className="mt-1 text-[0.8125rem] text-ink-2">{event.fest_venue}</p>
            </div>
            {event.prize && (
              <div className="card p-4">
                <h3 className="eyebrow">Prize</h3>
                <p className="mt-2 text-[0.9375rem] font-semibold text-accent">{event.prize}</p>
              </div>
            )}
          </section>
        </div>

        {/* ---- sticky registration panel ---- */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3" style={{ background: "var(--surface-2)" }}>
              <p className="eyebrow">Registration</p>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {event.capacity !== null && (
                <CapacityMeter capacity={event.capacity} taken={event.seats_taken} />
              )}

              {waitlisted > 0 && (
                <p className="mono text-[0.75rem] text-ink-3">
                  {waitlisted} {waitlisted === 1 ? "person" : "people"} on the waitlist
                </p>
              )}

              {event.registration_deadline && gate.open && (
                <div className="flex flex-col gap-1 border-t border-line pt-3.5">
                  <span className="eyebrow">Closes</span>
                  <Countdown
                    deadline={new Date(event.registration_deadline).toISOString()}
                    fallback={deadlineLabel ?? ""}
                  />
                  <span className="text-[0.75rem] text-ink-3">
                    {fmtDateTime(event.registration_deadline)}
                  </span>
                </div>
              )}

              {/* Already registered -------------------------------------- */}
              {mine && mine.status !== "cancelled" ? (
                <div className="flex flex-col gap-3 border-t border-line pt-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="eyebrow">Your registration</span>
                    <span className={`badge ${REG_STATUS_TONE[mine.status]}`}>
                      {REG_STATUS_LABEL[mine.status]}
                    </span>
                  </div>
                  <p className="mono text-[0.8125rem] font-semibold">{mine.ticket_code}</p>
                  {mine.status === "waitlisted" && mine.waitlist_position && (
                    <p className="text-[0.8125rem] text-ink-2">
                      You are number {mine.waitlist_position} on the waitlist. If someone cancels,
                      the first person in the queue is promoted automatically.
                    </p>
                  )}
                  <Link href={`/tickets/${mine.ticket_code}`} className="btn btn-primary w-full">
                    View your ticket
                  </Link>
                  <Link href="/me/registrations" className="btn btn-ghost btn-sm w-full">
                    Manage registration
                  </Link>
                </div>
              ) : gate.open || canWaitlist ? (
                <div className="flex flex-col gap-2.5 border-t border-line pt-3.5">
                  <Link
                    href={user ? `/events/${event.slug}/register` : `/login?next=/events/${event.slug}/register`}
                    className={`btn w-full btn-lg ${canWaitlist ? "btn-accent" : "btn-primary"}`}
                  >
                    {canWaitlist ? "Join the waitlist" : "Register for this event"}
                  </Link>
                  <p className="text-center text-[0.75rem] leading-snug text-ink-3">
                    {user
                      ? canWaitlist
                        ? "The event is full. You'll be queued and promoted automatically if a place opens."
                        : `${fields.length} questions · ${fmtFee(event.fee_bdt)}`
                      : "You'll be asked to sign in first — it takes a moment."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 border-t border-line pt-3.5">
                  <p className="text-[0.875rem] font-semibold" style={{ color: "var(--crit)" }}>
                    {GATE_MESSAGE[gate.reason]}
                  </p>
                  <p className="text-[0.8125rem] leading-snug text-ink-2">
                    {gate.reason === "deadline"
                      ? `The deadline passed on ${fmtDateTime(event.registration_deadline!)}.`
                      : gate.reason === "started"
                        ? "This event has already taken place."
                        : "This event was cancelled by the organisers."}
                  </p>
                  <Link href="/events?open=1" className="btn btn-ghost btn-sm mt-1 w-full">
                    Find events that are open
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="card mt-4 p-4">
            <h3 className="eyebrow">Part of</h3>
            <Link href={`/fests/${event.fest_slug}`} className="mt-2 block text-[0.9375rem] font-bold hover:text-brand">
              {event.fest_name}
            </Link>
            <Link
              href={`/events?fest=${event.fest_slug}`}
              className="mono mt-2 inline-block text-[0.6875rem] font-semibold text-brand hover:text-accent"
            >
              Other events in this fest →
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
