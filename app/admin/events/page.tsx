import type { Metadata } from "next";
import Link from "next/link";
import { ArtChip } from "@/components/Art";
import { listAllEventsForAdmin, listAllFestsForAdmin } from "@/lib/queries";
import { fmtDate, fmtDateRange, fmtFee, registrationGate, GATE_MESSAGE } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Events & forms", robots: { index: false } };

export default async function AdminEventsPage() {
  const [events, fests] = await Promise.all([listAllEventsForAdmin(), listAllFestsForAdmin()]);

  const byFest = new Map<string, typeof events>();
  for (const e of events) {
    if (!byFest.has(e.fest_id)) byFest.set(e.fest_id, []);
    byFest.get(e.fest_id)!.push(e);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[1.25rem] font-extrabold">Events &amp; registration forms</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-2">
            {events.length} events across {fests.length} fests. Open an event to edit its details or
            build its registration form.
          </p>
        </div>
        <Link href="/admin/events/new" className="btn btn-primary">
          + New event
        </Link>
      </div>

      <div className="flex flex-col gap-7">
        {fests.map((fest) => {
          const list = byFest.get(fest.id) ?? [];
          return (
            <section key={fest.id}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[1rem] font-extrabold">{fest.name}</h3>
                <span className="mono text-[0.6875rem] text-ink-3">
                  {fmtDateRange(fest.start_date, fest.end_date)} · {list.length} events ·{" "}
                  {fest.registration_count} registrations
                </span>
              </div>

              {list.length === 0 ? (
                <p className="mt-2 text-[0.8125rem] text-ink-3">No events in this fest yet.</p>
              ) : (
                <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
                  {list.map((e) => {
                    const gate = registrationGate(e, e.seats_taken);
                    return (
                      <li key={e.id} className="card card-hover p-3.5">
                        <div className="flex items-start gap-3">
                          <ArtChip seed={e.art_seed} category={e.category} size={42} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="badge badge-neutral">{e.category}</span>
                              <span
                                className={`badge ${
                                  e.status === "published"
                                    ? "badge-ok"
                                    : e.status === "draft"
                                      ? "badge-warn"
                                      : "badge-crit"
                                }`}
                              >
                                {e.status}
                              </span>
                              {gate.open ? (
                                <span className="badge badge-navy">Open</span>
                              ) : (
                                <span className="badge badge-neutral">{GATE_MESSAGE[gate.reason]}</span>
                              )}
                            </div>

                            <h4 className="mt-1.5 text-[0.9375rem] font-bold leading-snug">
                              <Link href={`/admin/events/${e.id}`} className="hover:text-navy">
                                {e.title}
                              </Link>
                            </h4>

                            <p className="mono mt-1 text-[0.6875rem] text-ink-3">
                              {fmtDate(e.starts_at)} · {fmtFee(e.fee_bdt)} ·{" "}
                              {e.capacity === null ? "no limit" : `${e.seats_taken}/${e.capacity} seats`}
                            </p>
                          </div>

                          <Link href={`/admin/events/${e.id}`} className="btn btn-ghost btn-sm shrink-0">
                            Edit
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
