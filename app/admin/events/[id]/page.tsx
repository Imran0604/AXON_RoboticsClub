import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { FormBuilder } from "@/components/FormBuilder";
import { CapacityMeter } from "@/components/EventCard";
import { getEventById, getFormFields, getWaitlistCount, listAllFestsForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit event", robots: { index: false } };

/** Date for a datetime-local input, expressed in Asia/Dhaka (UTC+6). */
function toDhakaInput(d: Date | string | null): string {
  if (!d) return "";
  const shifted = new Date(new Date(d).getTime() + 6 * 3600 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;

  const event = await getEventById(id);
  if (!event) notFound();

  const [fields, fests, waitlisted] = await Promise.all([
    getFormFields(event.id),
    listAllFestsForAdmin(),
    getWaitlistCount(event.id),
  ]);

  const values: EventFormValues = {
    id: event.id,
    fest_id: event.fest_id,
    title: event.title,
    category: event.category,
    summary: event.summary ?? "",
    description: event.description ?? "",
    starts_at: toDhakaInput(event.starts_at),
    ends_at: toDhakaInput(event.ends_at),
    venue: event.venue ?? "",
    capacity: event.capacity === null ? "" : String(event.capacity),
    registration_deadline: toDhakaInput(event.registration_deadline),
    fee_bdt: String(event.fee_bdt),
    team_min: String(event.team_min),
    team_max: String(event.team_max),
    prize: event.prize ?? "",
    rules: event.rules ?? "",
    status: event.status,
  };

  return (
    <div className="flex flex-col gap-5">
      <nav className="mono flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-ink-3" aria-label="Breadcrumb">
        <Link href="/admin/events" className="hover:text-brass">
          Events
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-2">{event.title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.375rem] font-extrabold">{event.title}</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-2">
            {event.fest_name} · {event.category}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/events/${event.slug}`} className="btn btn-ghost btn-sm">
            View public page
          </Link>
          <Link href={`/admin/registrations?event=${event.slug}`} className="btn btn-ghost btn-sm">
            {event.seats_taken} participants
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <p className="eyebrow">Seats</p>
            <div className="mt-2">
              <CapacityMeter capacity={event.capacity} taken={event.seats_taken} />
            </div>
          </div>
          <div>
            <p className="eyebrow">Waitlist</p>
            <p className="mono nums mt-2 text-[1.125rem] font-semibold">{waitlisted}</p>
          </div>
          <div>
            <p className="eyebrow">Form questions</p>
            <p className="mono nums mt-2 text-[1.125rem] font-semibold">{fields.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="card p-4 sm:p-6">
          <EventForm mode="edit" fests={fests.map((f) => ({ id: f.id, name: f.name }))} values={values} />
        </div>

        <div className="card p-4 sm:p-5 xl:sticky xl:top-20 xl:self-start">
          <FormBuilder eventId={event.id} fields={fields} />
        </div>
      </div>
    </div>
  );
}
