import type { Metadata } from "next";
import Link from "next/link";
import { BarList, FillBars, StatTile, StatusStrip, TimeSeries } from "@/components/Charts";
import {
  getCategoryBreakdown,
  getDashboardStats,
  getEventFill,
  getRegistrationsByDay,
  listRegistrations,
} from "@/lib/queries";
import { REG_STATUS_LABEL, REG_STATUS_TONE, fmtDateTime, fmtFee } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function AdminDashboard() {
  const [stats, byDay, categories, fill, recent] = await Promise.all([
    getDashboardStats(),
    getRegistrationsByDay(30),
    getCategoryBreakdown(),
    getEventFill(),
    listRegistrations({ page: 1, perPage: 8, sort: "newest" }),
  ]);

  // Events that need an organiser's attention, most urgent first.
  const attention = fill
    .filter((e) => {
      const pct = e.capacity ? e.seats_taken / e.capacity : 0;
      const closing =
        e.registration_deadline &&
        new Date(e.registration_deadline).getTime() - Date.now() < 4 * 86400000 &&
        new Date(e.registration_deadline).getTime() > Date.now();
      return pct >= 0.8 || e.waitlisted > 0 || closing;
    })
    .slice(0, 6);

  const totalSeats = fill.reduce((s, e) => s + (e.capacity ?? 0), 0);
  const takenSeats = fill.reduce((s, e) => s + e.seats_taken, 0);
  const fillRate = totalSeats > 0 ? Math.round((takenSeats / totalSeats) * 100) : 0;

  return (
    <div className="flex flex-col gap-7">
      {/* ------------------------------------------------------------- KPIs */}
      <section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <StatTile label="Registrations" value={stats.total_registrations} sub="All statuses, all time" />
          <StatTile label="Confirmed" value={stats.confirmed} sub="Holding a seat" tone="ok" />
          <StatTile
            label="Needs review"
            value={stats.pending}
            sub={stats.pending > 0 ? "Awaiting approval" : "Nothing waiting"}
            tone={stats.pending > 0 ? "warn" : "default"}
          />
          <StatTile label="Waitlisted" value={stats.waitlisted} sub="Queued for a place" />
          <StatTile label="Checked in" value={stats.checked_in} sub="Scanned at a venue" tone="accent" />
          <StatTile label="Fees collected" value={fmtFee(stats.revenue_bdt)} sub="Confirmed + checked in" />
        </div>
      </section>

      {/* -------------------------------------------- time series + strip */}
      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-[1rem] font-extrabold">Registrations per day</h2>
              <p className="mt-0.5 text-[0.75rem] text-ink-3">Last 30 days</p>
            </div>
            <p className="mono nums text-[0.8125rem] text-ink-2">
              <span className="font-semibold text-ink">{stats.last_7_days}</span> in the last 7 days
            </p>
          </div>
          <div className="mt-4">
            <TimeSeries data={byDay} />
          </div>
        </div>

        <div className="card flex flex-col gap-5 p-4 sm:p-5">
          <div>
            <h2 className="text-[1rem] font-extrabold">Status breakdown</h2>
            <p className="mt-0.5 text-[0.75rem] text-ink-3">Every registration by state</p>
            <div className="mt-4">
              <StatusStrip
                segments={[
                  { label: "Confirmed", value: stats.confirmed, color: "var(--ok)" },
                  { label: "Checked in", value: stats.checked_in, color: "var(--accent)" },
                  { label: "Pending", value: stats.pending, color: "var(--warn)" },
                  { label: "Waitlisted", value: stats.waitlisted, color: "var(--info)" },
                  { label: "Cancelled", value: stats.cancelled, color: "var(--ink-3)" },
                  { label: "Rejected", value: stats.rejected, color: "var(--crit)" },
                ]}
              />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[0.8125rem] font-bold">Overall seat fill</h3>
              <span className="mono nums text-[0.8125rem] font-semibold text-ink">{fillRate}%</span>
            </div>
            <div className="meter mt-2" data-level={fillRate >= 90 ? "full" : fillRate >= 70 ? "warn" : "ok"}>
              <span style={{ width: `${fillRate}%` }} />
            </div>
            <p className="mono mt-1.5 text-[0.6875rem] text-ink-3">
              {takenSeats} of {totalSeats} seats across {stats.total_events} events
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- attention + categories */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <h2 className="text-[1rem] font-extrabold">Needs attention</h2>
          <p className="mt-0.5 text-[0.75rem] text-ink-3">
            Nearly full, has a waitlist, or closing within four days
          </p>
          <div className="mt-4">
            {attention.length === 0 ? (
              <p className="text-[0.8125rem] text-ink-2">
                Nothing urgent. No event is above 80% full or closing imminently.
              </p>
            ) : (
              <FillBars
                data={attention.map((e) => ({
                  label: e.title,
                  taken: e.seats_taken,
                  capacity: e.capacity,
                  waitlisted: e.waitlisted,
                }))}
              />
            )}
          </div>
          <Link
            href="/admin/analytics"
            className="mono mt-4 inline-block text-[0.6875rem] font-semibold text-brand hover:text-accent"
          >
            All {fill.length} events by fill rate →
          </Link>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="text-[1rem] font-extrabold">Registrations by category</h2>
          <p className="mt-0.5 text-[0.75rem] text-ink-3">Seat-occupying registrations only</p>
          <div className="mt-4">
            <BarList data={categories.map((c) => ({ label: c.category, value: c.count }))} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- latest rows */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-[1rem] font-extrabold">Latest registrations</h2>
          <Link href="/admin/registrations" className="btn btn-ghost btn-sm">
            Manage all {stats.total_registrations}
          </Link>
        </div>

        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Participant</th>
                <th scope="col">Event</th>
                <th scope="col">Status</th>
                <th scope="col">Ticket</th>
                <th scope="col">Registered</th>
              </tr>
            </thead>
            <tbody>
              {recent.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="font-semibold">{r.participant_name}</span>
                    <span className="block text-[0.6875rem] text-ink-3">{r.participant_institution}</span>
                  </td>
                  <td>
                    <Link href={`/events/${r.event_slug}`} className="hover:text-brand">
                      {r.event_title}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${REG_STATUS_TONE[r.status]}`}>{REG_STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className="mono text-[0.75rem] text-ink-2">{r.ticket_code}</td>
                  <td className="mono nums whitespace-nowrap text-[0.75rem] text-ink-3">
                    {fmtDateTime(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
