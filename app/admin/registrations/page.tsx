import type { Metadata } from "next";
import Link from "next/link";
import { AdminRegFilters } from "@/components/AdminRegFilters";
import { BulkToolbar } from "@/components/BulkToolbar";
import { Empty } from "@/components/Empty";
import { bulkStatusAction, setRegistrationStatusAction } from "@/app/actions/admin";
import {
  getFests,
  listAllEventsForAdmin,
  listRegistrations,
  type AdminRegFilters as Filters,
} from "@/lib/queries";
import {
  REG_STATUS_LABEL,
  REG_STATUS_TONE,
  fmtDateTime,
  type RegStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Participants", robots: { index: false } };

const BULK_FORM = "bulk-form";

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

/** Quick actions offered per row, given its current status. */
function nextActions(status: RegStatus): { status: RegStatus; label: string; tone: string }[] {
  switch (status) {
    case "pending":
      return [
        { status: "confirmed", label: "Approve", tone: "btn-primary" },
        { status: "rejected", label: "Reject", tone: "btn-quiet" },
      ];
    case "confirmed":
      return [
        { status: "checked_in", label: "Check in", tone: "btn-ghost" },
        { status: "cancelled", label: "Cancel", tone: "btn-quiet" },
      ];
    case "waitlisted":
      return [
        { status: "confirmed", label: "Promote", tone: "btn-primary" },
        { status: "rejected", label: "Reject", tone: "btn-quiet" },
      ];
    case "checked_in":
      return [{ status: "confirmed", label: "Undo check-in", tone: "btn-quiet" }];
    case "rejected":
    case "cancelled":
      return [{ status: "confirmed", label: "Reinstate", tone: "btn-ghost" }];
    default:
      return [];
  }
}

export default async function AdminRegistrationsPage({
  searchParams,
}: PageProps<"/admin/registrations">) {
  const sp = await searchParams;

  const filters: Filters = {
    q: one(sp.q),
    status: one(sp.status) as RegStatus | undefined,
    event: one(sp.event),
    fest: one(sp.fest),
    sort: (["newest", "oldest", "name", "event"] as const).find((s) => s === one(sp.sort)) ?? "newest",
    page: Number(one(sp.page) ?? 1) || 1,
    perPage: 25,
  };

  const [result, events, fests] = await Promise.all([
    listRegistrations(filters),
    listAllEventsForAdmin(),
    getFests(),
  ]);

  const qs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]]
    )
  );
  const pageHref = (p: number) => {
    const next = new URLSearchParams(qs);
    next.set("page", String(p));
    return `/admin/registrations?${next}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <AdminRegFilters
          events={events.map((e) => ({ slug: e.slug, title: e.title }))}
          fests={fests.map((f) => ({ slug: f.slug, name: f.name }))}
          total={result.total}
        />
      </div>

      {/* The bulk form lives outside the table; checkboxes join it by id. */}
      <form action={bulkStatusAction} id={BULK_FORM} />
      <BulkToolbar formId={BULK_FORM} />

      {result.rows.length === 0 ? (
        <Empty
          title="No registrations match these filters"
          body="Try clearing the search box or widening the status and event filters."
          actionHref="/admin/registrations"
          actionLabel="Clear all filters"
        />
      ) : (
        <>
          {/* ---------------------------------------------- desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col" className="w-8" />
                    <th scope="col">Participant</th>
                    <th scope="col">Event</th>
                    <th scope="col">Status</th>
                    <th scope="col">Ticket</th>
                    <th scope="col">Registered</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <input
                          type="checkbox"
                          name="selected"
                          value={r.id}
                          form={BULK_FORM}
                          className="check"
                          aria-label={`Select ${r.participant_name}`}
                        />
                      </td>
                      <td className="min-w-[13rem]">
                        <span className="font-semibold">{r.participant_name}</span>
                        <span className="block text-[0.6875rem] text-ink-3">{r.participant_email}</span>
                        <span className="block text-[0.6875rem] text-ink-3">
                          {r.participant_institution}
                          {r.participant_phone ? ` · ${r.participant_phone}` : ""}
                        </span>
                        {r.team_name && (
                          <span className="mt-1 inline-block text-[0.6875rem] text-ink-2">
                            Team <strong>{r.team_name}</strong>
                            {r.team_members.length > 0 && ` (${r.team_members.length + 1})`}
                          </span>
                        )}
                      </td>
                      <td className="min-w-[11rem]">
                        <Link href={`/events/${r.event_slug}`} className="font-medium hover:text-brand">
                          {r.event_title}
                        </Link>
                        <span className="block text-[0.6875rem] text-ink-3">{r.fest_name}</span>
                      </td>
                      <td>
                        <span className={`badge ${REG_STATUS_TONE[r.status]}`}>
                          {REG_STATUS_LABEL[r.status]}
                        </span>
                        {r.status === "waitlisted" && r.waitlist_position && (
                          <span className="mono mt-1 block text-[0.625rem] text-ink-3">
                            queue #{r.waitlist_position}
                          </span>
                        )}
                      </td>
                      <td className="mono text-[0.75rem] text-ink-2">
                        <Link href={`/tickets/${r.ticket_code}`} className="hover:text-brand">
                          {r.ticket_code}
                        </Link>
                      </td>
                      <td className="mono nums whitespace-nowrap text-[0.75rem] text-ink-3">
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {nextActions(r.status).map((a) => (
                            <form key={a.status} action={setRegistrationStatusAction}>
                              <input type="hidden" name="registration_id" value={r.id} />
                              <input type="hidden" name="status" value={a.status} />
                              <button type="submit" className={`btn ${a.tone} btn-sm`}>
                                {a.label}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Per-row answers, collapsed. <details> needs no JavaScript. */}
            <div className="border-t border-line px-4 py-3">
              <p className="eyebrow mb-2">Submitted form answers</p>
              <div className="flex flex-col gap-1.5">
                {result.rows.map((r) => (
                  <details key={r.id} className="text-[0.8125rem]">
                    <summary className="cursor-pointer py-1 font-medium hover:text-brand">
                      {r.participant_name}
                      <span className="mono ml-2 text-[0.6875rem] text-ink-3">{r.ticket_code}</span>
                    </summary>
                    <dl className="mt-2 grid gap-x-6 gap-y-1.5 border-l-2 pl-3 sm:grid-cols-2" style={{ borderColor: "var(--accent)" }}>
                      {Object.entries(r.answers).length === 0 ? (
                        <p className="text-ink-3">No answers recorded.</p>
                      ) : (
                        Object.entries(r.answers).map(([k, v]) => (
                          <div key={k}>
                            <dt className="eyebrow">{k.replace(/_/g, " ")}</dt>
                            <dd className="text-ink-2">{v || "—"}</dd>
                          </div>
                        ))
                      )}
                      {r.team_members.length > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="eyebrow">Team members</dt>
                          <dd className="text-ink-2">
                            {r.team_members.map((m) => `${m.name}${m.institution ? ` (${m.institution})` : ""}`).join(", ")}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------- mobile cards */}
          <ul className="flex flex-col gap-2.5 md:hidden">
            {result.rows.map((r) => (
              <li key={r.id} className="card p-3.5">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    name="selected"
                    value={r.id}
                    form={BULK_FORM}
                    className="check mt-1"
                    aria-label={`Select ${r.participant_name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${REG_STATUS_TONE[r.status]}`}>
                        {REG_STATUS_LABEL[r.status]}
                      </span>
                      {r.status === "waitlisted" && r.waitlist_position && (
                        <span className="badge badge-info">queue #{r.waitlist_position}</span>
                      )}
                    </div>

                    <p className="mt-1.5 font-semibold">{r.participant_name}</p>
                    <p className="text-[0.75rem] text-ink-3">{r.participant_email}</p>
                    <p className="text-[0.75rem] text-ink-3">{r.participant_institution}</p>

                    <p className="mt-2 text-[0.8125rem]">
                      <Link href={`/events/${r.event_slug}`} className="font-medium hover:text-brand">
                        {r.event_title}
                      </Link>
                    </p>
                    <p className="mono mt-1 text-[0.6875rem] text-ink-3">
                      {r.ticket_code} · {fmtDateTime(r.created_at)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {nextActions(r.status).map((a) => (
                        <form key={a.status} action={setRegistrationStatusAction}>
                          <input type="hidden" name="registration_id" value={r.id} />
                          <input type="hidden" name="status" value={a.status} />
                          <button type="submit" className={`btn ${a.tone} btn-sm`}>
                            {a.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* ------------------------------------------------- pagination */}
          {result.pages > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
              <p className="mono nums text-[0.75rem] text-ink-3">
                Page {result.page} of {result.pages} · {result.total} registrations
              </p>
              <div className="flex gap-1.5">
                <Link
                  href={pageHref(Math.max(1, result.page - 1))}
                  aria-disabled={result.page === 1}
                  className="btn btn-ghost btn-sm"
                  style={result.page === 1 ? { opacity: 0.4, pointerEvents: "none" } : undefined}
                >
                  Previous
                </Link>
                <Link
                  href={pageHref(Math.min(result.pages, result.page + 1))}
                  aria-disabled={result.page === result.pages}
                  className="btn btn-ghost btn-sm"
                  style={result.page === result.pages ? { opacity: 0.4, pointerEvents: "none" } : undefined}
                >
                  Next
                </Link>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
