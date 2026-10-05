import type { Metadata } from "next";
import Link from "next/link";
import { BarList, FillBars, StatTile, StatusStrip, TimeSeries } from "@/components/Charts";
import {
  getCategoryBreakdown,
  getDashboardStats,
  getEventFill,
  getRegistrationsByDay,
} from "@/lib/queries";
import { fmtDate, fmtFee } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default async function AnalyticsPage() {
  const [stats, byDay, categories, fill] = await Promise.all([
    getDashboardStats(),
    getRegistrationsByDay(60),
    getCategoryBreakdown(),
    getEventFill(),
  ]);

  const totalSeats = fill.reduce((s, e) => s + (e.capacity ?? 0), 0);
  const takenSeats = fill.reduce((s, e) => s + e.seats_taken, 0);
  const fillRate = totalSeats > 0 ? Math.round((takenSeats / totalSeats) * 100) : 0;

  // Conversion funnel: every registration starts somewhere and ends in one of
  // a few places. Showing it as a funnel makes the drop-off legible.
  const funnel = [
    { label: "Registrations created", value: stats.total_registrations },
    { label: "Holding a seat", value: stats.confirmed + stats.pending + stats.checked_in },
    { label: "Confirmed", value: stats.confirmed + stats.checked_in },
    { label: "Attended (checked in)", value: stats.checked_in },
  ];

  const avgPerEvent =
    stats.total_events > 0 ? (stats.total_registrations / stats.total_events).toFixed(1) : "0";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.25rem] font-extrabold">Analytics</h2>
        <p className="mt-1 text-[0.8125rem] text-ink-2">
          Operational figures across all {stats.total_fests} fests and {stats.total_events} events.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Seat fill rate" value={`${fillRate}%`} sub={`${takenSeats} of ${totalSeats} seats`} tone={fillRate >= 80 ? "warn" : "ok"} />
        <StatTile label="Avg per event" value={avgPerEvent} sub="Registrations per event" />
        <StatTile label="Unique participants" value={stats.total_participants} sub="Distinct accounts registered" />
        <StatTile label="Fees collected" value={fmtFee(stats.revenue_bdt)} sub="Confirmed + checked in" tone="accent" />
      </section>

      <section className="card p-4 sm:p-5">
        <h3 className="text-[1rem] font-extrabold">Registration velocity</h3>
        <p className="mt-0.5 text-[0.75rem] text-ink-3">Daily new registrations over 60 days</p>
        <div className="mt-4">
          <TimeSeries data={byDay} height={180} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <h3 className="text-[1rem] font-extrabold">By category</h3>
          <p className="mt-0.5 text-[0.75rem] text-ink-3">Seat-occupying registrations</p>
          <div className="mt-4">
            <BarList data={categories.map((c) => ({ label: c.category, value: c.count }))} />
          </div>
        </div>

        <div className="card flex flex-col gap-5 p-4 sm:p-5">
          <div>
            <h3 className="text-[1rem] font-extrabold">Registration funnel</h3>
            <p className="mt-0.5 text-[0.75rem] text-ink-3">Where registrations end up</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {funnel.map((f, i) => {
                const pct = funnel[0].value > 0 ? (f.value / funnel[0].value) * 100 : 0;
                return (
                  <li key={f.label} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.8125rem]">{f.label}</span>
                      <span className="mono nums text-[0.8125rem] font-semibold">
                        {f.value}
                        <span className="ml-1.5 text-[0.6875rem] font-normal text-ink-3">
                          {Math.round(pct)}%
                        </span>
                      </span>
                    </div>
                    <span
                      className="h-2 overflow-hidden rounded-sm"
                      style={{ background: "var(--surface-3)" }}
                    >
                      <span
                        className="block h-full rounded-sm"
                        style={{
                          width: `${Math.max(1.5, pct)}%`,
                          background: "var(--brand)",
                          opacity: 1 - i * 0.16,
                        }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="text-[0.8125rem] font-bold">All statuses</h3>
            <div className="mt-3">
              <StatusStrip
                segments={[
                  { label: "Confirmed", value: stats.confirmed, color: "var(--ok)" },
                  { label: "Checked in", value: stats.checked_in, color: "var(--done)" },
                  { label: "Pending", value: stats.pending, color: "var(--warn)" },
                  { label: "Waitlisted", value: stats.waitlisted, color: "var(--info)" },
                  { label: "Cancelled", value: stats.cancelled, color: "var(--ink-3)" },
                  { label: "Rejected", value: stats.rejected, color: "var(--crit)" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <h3 className="text-[1rem] font-extrabold">Capacity by event</h3>
        <p className="mt-0.5 text-[0.75rem] text-ink-3">
          Sorted by how full each event is. State is labelled, not colour-coded alone.
        </p>
        <div className="mt-4">
          <FillBars
            data={fill.map((e) => ({
              label: e.title,
              taken: e.seats_taken,
              capacity: e.capacity,
              waitlisted: e.waitlisted,
            }))}
          />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-[1rem] font-extrabold">Event detail</h3>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Fest</th>
                <th scope="col">Category</th>
                <th scope="col">Date</th>
                <th scope="col">Seats</th>
                <th scope="col">Waitlist</th>
                <th scope="col">Fill</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {fill.map((e) => {
                const pct = e.capacity ? Math.round((e.seats_taken / e.capacity) * 100) : 0;
                return (
                  <tr key={e.id}>
                    <td className="font-medium">{e.title}</td>
                    <td className="text-ink-2">{e.fest_name}</td>
                    <td>
                      <span className="badge badge-neutral">{e.category}</span>
                    </td>
                    <td className="mono nums whitespace-nowrap text-ink-3">{fmtDate(e.starts_at)}</td>
                    <td className="mono nums">
                      {e.capacity === null ? `${e.seats_taken} / ∞` : `${e.seats_taken} / ${e.capacity}`}
                    </td>
                    <td className="mono nums">{e.waitlisted || "—"}</td>
                    <td className="mono nums">{e.capacity ? `${pct}%` : "—"}</td>
                    <td>
                      <Link
                        href={`/admin/registrations?event=${e.slug}`}
                        className="mono text-[0.6875rem] font-semibold text-brand hover:text-accent"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
