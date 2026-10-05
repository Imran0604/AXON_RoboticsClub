import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DynamicForm } from "@/components/DynamicForm";
import { CapacityMeter } from "@/components/EventCard";
import { ArtChip } from "@/components/Art";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getEventBySlug, getFormFields, getMyRegistrationForEvent } from "@/lib/queries";
import {
  GATE_MESSAGE,
  fmtDateTime,
  fmtFee,
  registrationGate,
  teamLabel,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/events/[slug]/register">): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return { title: event ? `Register — ${event.title}` : "Register" };
}

export default async function RegisterPage({ params }: PageProps<"/events/[slug]/register">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const user = await requireUser(`/events/${slug}/register`);

  // Already holding a live registration? Send them to it rather than letting
  // them fill a form that the unique constraint would reject.
  const existing = await getMyRegistrationForEvent(user.id, event.id);
  if (existing && existing.status !== "cancelled") {
    redirect(`/tickets/${existing.ticket_code}`);
  }

  const gate = registrationGate(event, event.seats_taken);
  const isWaitlist = !gate.open && gate.reason === "capacity";

  // Hard closed — deadline passed, cancelled, or already started.
  if (!gate.open && !isWaitlist) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16">
        <div className="card flex flex-col gap-4 p-7 text-center">
          <h1 className="text-[1.375rem] font-extrabold">{GATE_MESSAGE[gate.reason]}</h1>
          <p className="text-[0.9375rem] leading-relaxed text-ink-2">
            {gate.reason === "deadline"
              ? `Registration for ${event.title} closed on ${fmtDateTime(event.registration_deadline!)}.`
              : gate.reason === "started"
                ? `${event.title} has already taken place.`
                : `${event.title} was cancelled by the organisers.`}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/events?open=1" className="btn btn-primary">
              Browse open events
            </Link>
            <Link href={`/events/${event.slug}`} className="btn btn-ghost">
              Back to event
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [fields, profile] = await Promise.all([
    getFormFields(event.id),
    sql<{ name: string; email: string; institution: string | null }[]>`
      select name, email, institution from users where id = ${user.id} limit 1
    `,
  ]);

  return (
    <div className="mx-auto w-full max-w-[64rem] px-5 py-10">
      <nav className="mono flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-ink-3" aria-label="Breadcrumb">
        <Link href={`/fests/${event.fest_slug}`} className="hover:text-accent">
          {event.fest_name}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/events/${event.slug}`} className="hover:text-accent">
          {event.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-2">Register</span>
      </nav>

      <div className="mt-4 flex items-start gap-3.5">
        <ArtChip seed={event.art_seed} category={event.category} size={52} />
        <div className="min-w-0">
          <h1 className="text-[1.625rem] font-extrabold leading-tight">{event.title}</h1>
          <p className="mt-1 text-[0.875rem] text-ink-2">
            {event.fest_name} · {fmtFee(event.fee_bdt)} · {teamLabel(event.team_min, event.team_max)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_17rem]">
        <div className="card p-5 sm:p-7">
          <DynamicForm
            eventId={event.id}
            eventSlug={event.slug}
            fields={fields}
            teamMin={event.team_min}
            teamMax={event.team_max}
            isWaitlist={isWaitlist}
            defaults={{
              name: profile[0]?.name ?? user.name,
              email: profile[0]?.email ?? user.email,
              institution: profile[0]?.institution ?? null,
            }}
          />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <p className="eyebrow">Availability</p>
            <div className="mt-3">
              <CapacityMeter capacity={event.capacity} taken={event.seats_taken} />
            </div>
            {event.registration_deadline && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="eyebrow">Closes</p>
                <p className="mono mt-1.5 text-[0.8125rem] font-semibold">
                  {fmtDateTime(event.registration_deadline)}
                </p>
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="eyebrow">Signed in as</p>
            <p className="mt-2 text-[0.875rem] font-semibold">{user.name}</p>
            <p className="text-[0.75rem] text-ink-3">{user.email}</p>
          </div>

          <div className="card p-4">
            <p className="eyebrow">Event details</p>
            <dl className="mt-2.5 flex flex-col gap-2 text-[0.8125rem]">
              <div>
                <dt className="text-ink-3">Starts</dt>
                <dd className="font-medium">{fmtDateTime(event.starts_at)}</dd>
              </div>
              {event.venue && (
                <div>
                  <dt className="text-ink-3">Venue</dt>
                  <dd className="font-medium">{event.venue}</dd>
                </div>
              )}
            </dl>
            <Link
              href={`/events/${event.slug}`}
              className="mono mt-3 inline-block text-[0.6875rem] font-semibold text-brand hover:text-accent"
            >
              ← Back to full details
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
