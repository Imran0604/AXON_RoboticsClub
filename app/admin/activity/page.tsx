import type { Metadata } from "next";
import { getRecentActivity } from "@/lib/queries";
import { Empty } from "@/components/Empty";
import { fmtDateTime } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };

/** Human wording for each audit action, so the log reads as sentences. */
const PHRASING: Record<string, string> = {
  "user.signed_up": "created an account",
  "registration.confirmed": "registered and was confirmed",
  "registration.waitlisted": "registered and was waitlisted",
  "registration.cancelled": "cancelled a registration",
  "registration.rejected": "rejected a registration",
  "registration.checked_in": "checked a participant in",
  "registration.set_confirmed": "confirmed a registration",
  "registration.set_pending": "moved a registration to pending",
  "registration.set_waitlisted": "moved a registration to the waitlist",
  "registration.set_rejected": "rejected a registration",
  "registration.set_cancelled": "cancelled a registration",
  "registration.set_checked_in": "checked a participant in",
  "event.created": "created an event",
  "event.updated": "updated an event",
  "form_field.added": "added a form question",
  "form_field.deleted": "deleted a form question",
};

function tone(action: string): string {
  if (action.includes("reject") || action.includes("cancel") || action.includes("delete")) return "var(--crit)";
  if (action.includes("checked_in")) return "var(--done)";
  if (action.includes("confirm") || action.includes("created") || action.includes("signed_up")) return "var(--ok)";
  return "var(--info)";
}

export default async function ActivityPage() {
  const rows = await getRecentActivity(60);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[1.25rem] font-extrabold">Audit log</h2>
        <p className="mt-1 max-w-2xl text-[0.8125rem] text-ink-2">
          Every privileged change, with who made it and when. Written inside the same transaction as
          the change itself, so the log cannot disagree with the data.
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty
          title="Nothing logged yet"
          body="Approve, reject or check in a registration and it will appear here."
          actionHref="/admin/registrations"
          actionLabel="Go to participants"
        />
      ) : (
        <ol className="card divide-y" style={{ borderColor: "var(--line)" }}>
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-4 py-3" style={{ borderColor: "var(--line)" }}>
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: tone(r.action) }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem]">
                  <strong className="font-semibold">{r.actor_name ?? "A participant"}</strong>{" "}
                  <span className="text-ink-2">{PHRASING[r.action] ?? r.action}</span>
                </p>
                {Object.keys(r.meta).length > 0 && (
                  <p className="mono mt-0.5 text-[0.6875rem] text-ink-3">
                    {Object.entries(r.meta)
                      .filter(([, v]) => v !== null && v !== "")
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <time className="mono nums shrink-0 text-[0.6875rem] text-ink-3" dateTime={new Date(r.created_at).toISOString()}>
                {fmtDateTime(r.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
