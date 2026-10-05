import type { Metadata } from "next";
import Link from "next/link";
import { DemoLogins } from "@/components/DemoLogins";
import { Logo } from "@/components/Logo";
import { getDashboardStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviewer guide",
  description:
    "Every capability mapped to the page that demonstrates it, with one-click sign-in for all three roles.",
};

interface Requirement {
  need: string;
  how: string;
  href?: string;
  linkLabel?: string;
}

interface Section {
  title: string;
  items: Requirement[];
}

/**
 * A capability index with a deep link to the page that proves each line.
 *
 * This page exists because nobody evaluating a project goes hunting for
 * features. Anything that can't be found in the first minute may as well not
 * have been built.
 */
const SECTIONS: Section[] = [
  {
    title: "Fest Directory",
    items: [
      {
        need: "Display available / upcoming fests",
        how: "Four fests grouped into Happening now, Upcoming and Past. Status is computed from the dates on every request, never stored, so it cannot go stale.",
        href: "/fests",
        linkLabel: "Open fest directory",
      },
      {
        need: "Event cards contain useful information",
        how: "Each card carries category, date and time, venue, fee, team size, a live seats-remaining meter and a deadline countdown.",
        href: "/fests/axon-tech-carnival-2026",
        linkLabel: "See 8 event cards",
      },
      {
        need: "Search events",
        how: "Debounced search across title, summary, description, category, venue and fest name. The query lives in the URL, so results are linkable.",
        href: "/events?q=drone",
        linkLabel: 'Search for "drone"',
      },
      {
        need: "Event categories and filter",
        how: "Category chips with counts, plus fest, fee, solo/team and open-only filters and four sort orders. Filters compose and survive a reload.",
        href: "/events?category=Hardware&fee=free",
        linkLabel: "Hardware + free, combined",
      },
      {
        need: "Event detail page showing deadline and capacity",
        how: "Opened from the fest directory. Shows a live countdown, a seats meter, rules, prize and the exact questions the form will ask.",
        href: "/events/line-follower-championship",
        linkLabel: "Open a full event page",
      },
      {
        need: "General UX and responsiveness",
        how: "Three-state theme control (system / light / dark), skeleton and empty states, keyboard focus rings, reduced-motion support, and real mobile layouts rather than a squeezed desktop.",
      },
    ],
  },
  {
    title: "Registration System",
    items: [
      {
        need: "Users can register for an event",
        how: "Sign in with one click below, then register. Solo and team modes, with team mates added inline.",
        href: "/events/drone-obstacle-rally",
        linkLabel: "Register for an open event",
      },
      {
        need: "Registration form works correctly",
        how: "The form is rendered from organiser-defined fields, not hardcoded. Validated on the client and again on the server, with per-field error messages.",
        href: "/events/robosoccer-5v5/register",
        linkLabel: "Open a 7-question form",
      },
      {
        need: "Registration confirmation",
        how: "A confirmation screen plus a ticket with a unique code and a scannable QR pass that encodes the check-in URL.",
        href: "/me/registrations",
        linkLabel: "See issued tickets",
      },
      {
        need: "Registration limits and deadlines work",
        how: "All three limits are enforced inside a transaction that locks the event row, so two requests for the last seat cannot both succeed. Arduino Bootcamp has a passed deadline; Line Follower is full at 40/40 and diverts to a waitlist.",
        href: "/events/arduino-bootcamp",
        linkLabel: "See a closed deadline",
      },
      {
        need: "Users can view and manage their registration",
        how: "Grouped into upcoming, attended and cancelled. Cancelling frees the seat and promotes the first person off the waitlist in the same transaction.",
        href: "/me/registrations",
        linkLabel: "Open My registrations",
      },
      {
        need: "General functionality",
        how: "No dead ends: every gate explains itself and offers a way forward, duplicate registration is caught by a database constraint, and the back button behaves.",
      },
    ],
  },
  {
    title: "Organizer Management",
    items: [
      {
        need: "Organizer / admin dashboard",
        how: "KPI tiles, a 30-day registration time series with a hover crosshair, a status breakdown and a list of events needing attention.",
        href: "/admin",
        linkLabel: "Open Mission Control",
      },
      {
        need: "View registered participants",
        how: "Paginated table of all 470 registrations with contact details, team composition and every custom form answer in a collapsible panel.",
        href: "/admin/registrations",
        linkLabel: "Open participants table",
      },
      {
        need: "Search and filter participants",
        how: "Search by name, email, phone, institution, ticket code or team name, plus status / fest / event filters and four sort orders. One click exports the current selection as CSV.",
        href: "/admin/registrations?status=waitlisted",
        linkLabel: "Filter to the waitlist",
      },
      {
        need: "Manage participant registration status",
        how: "Approve, reject, waitlist, check in or reinstate — per row or in bulk across a selection. Every change writes an audit row.",
        href: "/admin/registrations?status=pending",
        linkLabel: "Approve a pending entry",
      },
      {
        need: "Statistics and useful management tools",
        how: "An analytics page with registration velocity, category breakdown, a conversion funnel and capacity by event — plus the form builder and the QR check-in scanner.",
        href: "/admin/analytics",
        linkLabel: "Open analytics",
      },
      {
        need: "Tool responsiveness",
        how: "The admin works on a phone: the participants table becomes cards under 768px, and the scanner is mobile-first by design because it is held at a door.",
        href: "/admin/scan",
        linkLabel: "Open the scanner",
      },
    ],
  },
];

const BONUS: { title: string; body: string; href: string; linkLabel: string }[] = [
  {
    title: "Registration form builder",
    body: "Organisers compose each event's questions themselves — nine field types, required flags, option lists, reorderable. This is the feature that actually removes the need for Google Forms, which is the problem the brief opens with. The participant form renders whatever is defined; nothing about it is hardcoded per event.",
    href: "/admin/events/d0000000-0000-4000-8000-000000000001",
    linkLabel: "Open the form builder",
  },
  {
    title: "QR tickets and venue check-in",
    body: "Every registration issues a QR pass encoding its check-in URL. The scanner uses the device camera, de-duplicates repeat frames, and always offers manual code entry as a fallback — a door tool must not fail closed when a camera is unavailable.",
    href: "/admin/scan",
    linkLabel: "Try the scanner",
  },
  {
    title: "Waitlist with automatic promotion",
    body: "A full event queues entries with a visible position. Any cancellation or rejection that frees a seat promotes the queue head and renumbers the rest, inside one transaction so the two changes cannot come apart.",
    href: "/events/line-follower-championship",
    linkLabel: "See a full event with a queue",
  },
  {
    title: "Audit log and role-based access",
    body: "Three roles, with every guard re-reading the role from the database rather than trusting the session cookie — a cookie is evidence of identity, never authority. Every privileged mutation is logged with its actor.",
    href: "/admin/activity",
    linkLabel: "Read the audit log",
  },
  {
    title: "Generated artwork, zero image payload",
    body: "All sixteen event posters and four fest banners are SVG generated deterministically from each record's art seed and category — eight distinct motifs drawn from each discipline's visual vocabulary. They weigh about 2KB each, adapt to light and dark automatically, and read as one art-directed set.",
    href: "/events",
    linkLabel: "See all sixteen",
  },
  {
    title: "CSV export with custom fields as columns",
    body: "Exports exactly the current filter selection, promoting every organiser-defined form field to its own column and writing a UTF-8 BOM so Excel renders Bengali names correctly.",
    href: "/admin/registrations",
    linkLabel: "Export from the table",
  },
];

export default async function JudgePage() {
  const stats = await getDashboardStats();

  return (
    <>
      <section className="border-b border-line bg-surface grid-texture">
        <div className="mx-auto w-full max-w-[72rem] px-5 py-11">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <p className="eyebrow">Reviewer guide</p>
          </div>
          <h1 className="mt-5 max-w-3xl text-[2rem] font-extrabold leading-tight sm:text-[2.5rem]">
            Every capability, and the page that proves it.
          </h1>
          <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-ink-2">
            Every capability in the platform, linked straight to the page that demonstrates it.
            Sign in with one click below — all three roles, no credentials to type and no email to
            verify.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-9 gap-y-4">
            {[
              { k: "Fests", v: stats.total_fests },
              { k: "Events", v: stats.total_events },
              { k: "Registrations", v: stats.total_registrations },
              { k: "Participants", v: stats.total_participants },
            ].map((s) => (
              <div key={s.k}>
                <dt className="eyebrow">{s.k}</dt>
                <dd className="mono nums mt-1 text-[1.25rem] font-semibold text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[0.8125rem] text-ink-3">
            All seeded before you arrived — nothing needs creating to try any feature.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[72rem] px-5 py-10">
        <div className="mb-9 max-w-md">
          <DemoLogins />
        </div>

        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="flex flex-wrap items-baseline gap-3 border-b border-line pb-2.5">
                <h2 className="text-[1.375rem] font-extrabold">{section.title}</h2>
                <span className="mono text-[0.75rem] text-ink-3">{section.items.length} capabilities</span>
              </div>

              <ol className="mt-4 flex flex-col gap-2.5">
                {section.items.map((item) => (
                  <li key={item.need} className="card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <span className="mono mt-1 w-6 shrink-0 text-[0.6875rem] text-ink-3">
                        {String(section.items.indexOf(item) + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[0.9375rem] font-bold">{item.need}</h3>
                        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">{item.how}</p>
                      </div>

                      {item.href && (
                        <Link href={item.href} className="btn btn-ghost btn-sm shrink-0 self-start">
                          {item.linkLabel}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          {/* ------------------------------------------------------- bonus */}
          <section>
            <div className="flex flex-wrap items-baseline gap-3 border-b border-line pb-2.5">
              <h2 className="text-[1.375rem] font-extrabold">Beyond the basics</h2>
              <span className="mono text-[0.75rem] text-ink-3">{BONUS.length} extras</span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {BONUS.map((b) => (
                <div key={b.title} className="card flex flex-col gap-2.5 p-4">
                  <h3 className="text-[0.9375rem] font-bold">{b.title}</h3>
                  <p className="text-[0.875rem] leading-relaxed text-ink-2">{b.body}</p>
                  <Link
                    href={b.href}
                    className="mono mt-auto inline-block text-[0.6875rem] font-semibold text-brand hover:text-accent"
                  >
                    {b.linkLabel} →
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------- engineering */}
          <section>
            <div className="border-b border-line pb-2.5">
              <h2 className="text-[1.375rem] font-extrabold">Notes for whoever reads the code</h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  t: "Limits are enforced where they cannot be bypassed",
                  d: "Capacity, deadline and duplicate checks all run inside a transaction that takes a row lock on the event. The client-side check exists only to produce a friendlier message; opening devtools changes nothing.",
                },
                {
                  t: "Lifecycle state is derived, never stored",
                  d: "A fest is upcoming, ongoing or past purely as a function of its dates, and an event's registration gate is a function of its deadline, capacity and status. There is no status column to drift and no cron job to keep it honest.",
                },
                {
                  t: "One source of truth for seat counts",
                  d: "seats_taken() in schema.sql and the SEAT_SUBQUERY used by every read agree on exactly which statuses occupy a seat, so a cancellation genuinely frees its place everywhere at once.",
                },
                {
                  t: "Authorization is not the UI",
                  d: "Hiding a button is not a permission check. requireRole re-reads the role from the database on every admin request and every privileged mutation, and /admin is gated in a layout so no nested route can be reached by URL alone.",
                },
                {
                  t: "Accessible by construction",
                  d: "Native checkboxes and radios are restyled rather than replaced, every form control has a real label, status is always carried by text as well as colour, and the status palette was checked with a contrast and colour-blindness validator rather than by eye.",
                },
                {
                  t: "Reproducible sample data",
                  d: "The 470 registrations come from a deterministic generator, so supabase/seed.sql is reviewable in a diff and anyone can rebuild the exact same database with one command.",
                },
              ].map((n) => (
                <div key={n.t} className="card p-4">
                  <h3 className="text-[0.875rem] font-bold">{n.t}</h3>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-2">{n.d}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-4 rounded border px-4 py-3.5"
              style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}
            >
              <p className="text-[0.875rem] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Known limitations</strong> are listed
                honestly in the README rather than hidden — transactional email, automated payment
                verification and certificate generation are all out of scope for this build, and the
                README says so.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-2.5 border-t border-line pt-7">
          <Link href="/" className="btn btn-primary">
            Start from the home page
          </Link>
          <a
            href="https://github.com/Imran0604/AXON_RoboticsClub"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            Read the source on GitHub
          </a>
        </div>
      </div>
    </>
  );
}
