import type { Metadata } from "next";
import Link from "next/link";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { listAllFestsForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New event", robots: { index: false } };

export default async function NewEventPage() {
  const fests = await listAllFestsForAdmin();

  // Sensible starting point: next Friday at 10:00 Dhaka time.
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + ((5 - start.getUTCDay() + 7) % 7 || 7));
  const startInput = `${start.toISOString().slice(0, 10)}T10:00`;
  const deadline = new Date(start.getTime() - 2 * 86400000);

  const values: EventFormValues = {
    fest_id: fests[0]?.id ?? "",
    title: "",
    category: "",
    summary: "",
    description: "",
    starts_at: startInput,
    ends_at: "",
    venue: "",
    capacity: "40",
    registration_deadline: `${deadline.toISOString().slice(0, 10)}T23:59`,
    fee_bdt: "0",
    team_min: "1",
    team_max: "1",
    prize: "",
    rules: "",
    status: "draft",
  };

  return (
    <div className="flex flex-col gap-5">
      <nav className="mono flex items-center gap-1.5 text-[0.6875rem] text-ink-3" aria-label="Breadcrumb">
        <Link href="/admin/events" className="hover:text-brass">
          Events
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-2">New</span>
      </nav>

      <div>
        <h2 className="text-[1.375rem] font-extrabold">Create an event</h2>
        <p className="mt-1 max-w-xl text-[0.8125rem] text-ink-2">
          It starts as a draft with three default questions — name, institution and year — so it is
          registerable straight away. Open it afterwards to add event-specific questions.
        </p>
      </div>

      <div className="card max-w-3xl p-4 sm:p-6">
        <EventForm mode="create" fests={fests.map((f) => ({ id: f.id, name: f.name }))} values={values} />
      </div>
    </div>
  );
}
