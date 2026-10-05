import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Art } from "@/components/Art";
import { getSession, isStaff } from "@/lib/auth";
import { getRegistrationByCode } from "@/lib/queries";
import {
  REG_STATUS_LABEL,
  REG_STATUS_TONE,
  fmtDate,
  fmtDateTime,
  fmtFee,
  fmtTime,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your ticket",
  robots: { index: false, follow: false },
};

export default async function TicketPage({ params, searchParams }: PageProps<"/tickets/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  const isNew = (Array.isArray(sp.new) ? sp.new[0] : sp.new) === "1";

  const reg = await getRegistrationByCode(code);
  if (!reg) notFound();

  const viewer = await getSession();
  // The owner, or any staff member scanning at the door.
  const mayView = viewer && (viewer.id === reg.user_id || isStaff(viewer.role));

  if (!mayView) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <div className="card flex flex-col gap-4 p-7 text-center">
          <h1 className="text-[1.25rem] font-extrabold">This ticket is private</h1>
          <p className="text-[0.875rem] leading-relaxed text-ink-2">
            Sign in with the account that holds this registration to view it, or ask an organiser to
            look it up.
          </p>
          <Link href={`/login?next=/tickets/${code}`} className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // The QR encodes the check-in URL, so a scan from any camera app lands an
  // organiser directly on the verification screen.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qrSvg = await QRCode.toString(`${base}/admin/scan?code=${reg.ticket_code}`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#101820", light: "#00000000" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      {isNew && (
        <div
          className="mb-6 flex items-start gap-3 rounded border px-4 py-3.5"
          style={{ background: "var(--ok-soft)", borderColor: "var(--ok)" }}
          role="status"
        >
          <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="var(--ok)" strokeWidth="1.9" className="mt-0.5 shrink-0">
            <circle cx="8" cy="8" r="6.6" />
            <path d="M5.2 8.3l2 2 3.6-4.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-[0.9375rem] font-bold" style={{ color: "var(--ok)" }}>
              {reg.status === "waitlisted" ? "You're on the waitlist" : "Registration confirmed"}
            </p>
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-2">
              {reg.status === "waitlisted"
                ? `You are number ${reg.waitlist_position} in the queue. If a place opens you'll be promoted automatically.`
                : "Save this ticket code or screenshot the QR pass — you'll need it at the venue."}
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ Ticket */}
      <article className="card overflow-hidden">
        <div className="relative h-24 border-b border-line">
          <Art seed={reg.event_art_seed} category={reg.event_category} className="h-full w-full" wide />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, var(--surface) 15%, transparent 90%)" }}
          />
          <div className="absolute inset-0 flex items-center px-5">
            <div>
              <p className="eyebrow">{reg.fest_name}</p>
              <p className="mt-0.5 text-[1.125rem] font-extrabold leading-tight">{reg.event_title}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${REG_STATUS_TONE[reg.status]}`}>{REG_STATUS_LABEL[reg.status]}</span>
              <span className="badge badge-neutral">{reg.event_category}</span>
              <span className="badge badge-neutral">{fmtFee(reg.event_fee)}</span>
            </div>

            <div>
              <p className="eyebrow">Ticket code</p>
              <p className="mono mt-1 text-[1.375rem] font-semibold tracking-wide">{reg.ticket_code}</p>
            </div>

            <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4 text-[0.8125rem]">
              <div>
                <dt className="eyebrow">Participant</dt>
                <dd className="mt-1 font-semibold">{reg.participant_name}</dd>
                <dd className="text-ink-3">{reg.participant_email}</dd>
              </div>
              <div>
                <dt className="eyebrow">Institution</dt>
                <dd className="mt-1 font-semibold">{reg.participant_institution ?? "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Date</dt>
                <dd className="mono nums mt-1 font-semibold">{fmtDate(reg.event_starts_at)}</dd>
                <dd className="text-ink-3">{fmtTime(reg.event_starts_at)}</dd>
              </div>
              <div>
                <dt className="eyebrow">Venue</dt>
                <dd className="mt-1 font-semibold">{reg.event_venue ?? "To be announced"}</dd>
              </div>
            </dl>

            {reg.team_name && (
              <div className="border-t border-line pt-4">
                <p className="eyebrow">Team</p>
                <p className="mt-1 text-[0.9375rem] font-bold">{reg.team_name}</p>
                {reg.team_members.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {reg.team_members.map((m, i) => (
                      <li key={i} className="text-[0.8125rem] text-ink-2">
                        {m.name}
                        {m.institution ? ` · ${m.institution}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {reg.checked_in_at && (
              <p className="mono text-[0.75rem]" style={{ color: "var(--brass)" }}>
                Checked in at {fmtDateTime(reg.checked_in_at)}
              </p>
            )}
          </div>

          {/* QR pass. Always on white — a QR code needs its quiet zone and
              high contrast regardless of the page theme. */}
          <div className="flex flex-col items-center gap-2 sm:w-[11rem]">
            <div className="rounded border border-line bg-white p-3">
              <div
                className="h-[8.5rem] w-[8.5rem] [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
            <p className="text-center text-[0.6875rem] leading-snug text-ink-3">
              Show this at the venue. Organisers scan it to check you in.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:px-6">
          <Link href="/me/registrations" className="btn btn-ghost btn-sm">
            All my registrations
          </Link>
          <Link href={`/events/${reg.event_slug}`} className="btn btn-quiet btn-sm">
            Event details
          </Link>
          {isStaff(viewer.role) && (
            <Link href={`/admin/scan?code=${reg.ticket_code}`} className="btn btn-quiet btn-sm sm:ml-auto">
              Open in scanner
            </Link>
          )}
        </div>
      </article>

      <p className="mono mt-5 text-center text-[0.6875rem] text-ink-3">
        Registered {fmtDateTime(reg.created_at)} · AXON Robotics Club
      </p>
    </div>
  );
}
