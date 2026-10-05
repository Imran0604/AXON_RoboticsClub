import type { Metadata } from "next";
import Link from "next/link";
import { ArtChip } from "@/components/Art";
import { CancelButton } from "@/components/CancelButton";
import { Empty, PageHeader } from "@/components/Empty";
import { requireUser } from "@/lib/auth";
import { getMyRegistrations } from "@/lib/queries";
import {
  REG_STATUS_LABEL,
  REG_STATUS_TONE,
  fmtDateTime,
  fmtFee,
  type RegStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My registrations",
  robots: { index: false, follow: false },
};

/** Statuses a participant is still allowed to cancel out of themselves. */
const CANCELLABLE: RegStatus[] = ["pending", "confirmed", "waitlisted"];

export default async function MyRegistrationsPage() {
  const user = await requireUser("/me/registrations");
  const regs = await getMyRegistrations(user.id);

  const now = Date.now();
  const live = regs.filter(
    (r) => r.status !== "cancelled" && r.status !== "rejected" && new Date(r.event_starts_at).getTime() >= now
  );
  const past = regs.filter(
    (r) => new Date(r.event_starts_at).getTime() < now && r.status !== "cancelled" && r.status !== "rejected"
  );
  const closed = regs.filter((r) => r.status === "cancelled" || r.status === "rejected");

  const counts = {
    confirmed: regs.filter((r) => r.status === "confirmed").length,
    waitlisted: regs.filter((r) => r.status === "waitlisted").length,
    pending: regs.filter((r) => r.status === "pending").length,
    spend: regs
      .filter((r) => r.status === "confirmed" || r.status === "checked_in")
      .reduce((sum, r) => sum + r.event_fee, 0),
  };

  return (
    <>
      <PageHeader
        eyebrow={user.name}
        title="My registrations"
        lede="Every event you've signed up for, with its current status. You can cancel anything that hasn't happened yet."
      >
        {regs.length > 0 && (
          <dl className="mt-6 flex flex-wrap gap-x-9 gap-y-4">
            {[
              { k: "Confirmed", v: String(counts.confirmed) },
              { k: "Waitlisted", v: String(counts.waitlisted) },
              { k: "Pending", v: String(counts.pending) },
              { k: "Total fees", v: fmtFee(counts.spend) },
            ].map((s) => (
              <div key={s.k}>
                <dt className="eyebrow">{s.k}</dt>
                <dd className="mono nums mt-1 text-[1.125rem] font-semibold text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
        )}
      </PageHeader>

      <div className="mx-auto w-full max-w-[72rem] px-5 py-10">
        {regs.length === 0 ? (
          <Empty
            title="You haven't registered for anything yet"
            body="Browse the event directory and sign up for something. Several workshops are free, and a few events are beginner-first."
            actionHref="/events?open=1"
            actionLabel="Browse open events"
          />
        ) : (
          <div className="flex flex-col gap-11">
            <Group title="Upcoming" blurb="Events you're signed up for that haven't happened yet." items={live} cancellable />
            <Group title="Attended" blurb="Events that have already taken place." items={past} />
            <Group title="Cancelled and rejected" blurb="No longer active. Kept for your records." items={closed} />
          </div>
        )}
      </div>
    </>
  );
}

function Group({
  title,
  blurb,
  items,
  cancellable = false,
}: {
  title: string;
  blurb: string;
  items: Awaited<ReturnType<typeof getMyRegistrations>>;
  cancellable?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline gap-3">
        <h2 className="text-[1.25rem] font-extrabold">{title}</h2>
        <span className="mono nums text-[0.75rem] text-ink-3">{items.length}</span>
      </div>
      <p className="mt-1 text-[0.8125rem] text-ink-2">{blurb}</p>

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((r) => (
          <li key={r.id} className="card p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <ArtChip seed={r.event_art_seed} category={r.event_category} size={46} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${REG_STATUS_TONE[r.status]}`}>{REG_STATUS_LABEL[r.status]}</span>
                  <span className="badge badge-neutral">{r.event_category}</span>
                  {r.status === "waitlisted" && r.waitlist_position && (
                    <span className="badge badge-info">Queue position {r.waitlist_position}</span>
                  )}
                </div>

                <h3 className="mt-2 text-[1rem] font-bold leading-snug">
                  <Link href={`/events/${r.event_slug}`} className="hover:text-navy">
                    {r.event_title}
                  </Link>
                </h3>

                <p className="mt-0.5 text-[0.8125rem] text-ink-2">
                  <Link href={`/fests/${r.fest_slug}`} className="hover:text-brass">
                    {r.fest_name}
                  </Link>
                  {" · "}
                  {fmtDateTime(r.event_starts_at)}
                  {r.event_venue ? ` · ${r.event_venue}` : ""}
                </p>

                {r.team_name && (
                  <p className="mt-1.5 text-[0.8125rem] text-ink-2">
                    Team <span className="font-semibold text-ink">{r.team_name}</span>
                    {r.team_members.length > 0 && ` · ${r.team_members.length + 1} people`}
                  </p>
                )}

                <p className="mono mt-2 text-[0.75rem] text-ink-3">{r.ticket_code}</p>
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                {r.status !== "cancelled" && r.status !== "rejected" && (
                  <Link href={`/tickets/${r.ticket_code}`} className="btn btn-ghost btn-sm">
                    View ticket
                  </Link>
                )}
                {cancellable && CANCELLABLE.includes(r.status) && (
                  <CancelButton registrationId={r.id} eventTitle={r.event_title} />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
