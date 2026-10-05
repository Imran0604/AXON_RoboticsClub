import type { Metadata } from "next";
import { Scanner } from "@/components/Scanner";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Check-in scanner", robots: { index: false } };

export default async function ScanPage({ searchParams }: PageProps<"/admin/scan">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.code) ? sp.code[0] : sp.code;

  const [today] = await sql<{ checked_in: number; expected: number }[]>`
    select
      (select count(*) from registrations where status = 'checked_in')::int as checked_in,
      (select count(*) from registrations where status in ('confirmed', 'checked_in'))::int as expected
  `;

  const pct = today.expected > 0 ? Math.round((today.checked_in / today.expected) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.25rem] font-extrabold">Venue check-in</h2>
          <p className="mt-1 max-w-xl text-[0.8125rem] text-ink-2">
            Scan a participant&apos;s QR pass to mark attendance, or type their ticket code. Built
            mobile-first — this is a page you hold at a door.
          </p>
        </div>

        <div className="card min-w-[13rem] p-3.5">
          <p className="eyebrow">Checked in</p>
          <p className="mono nums mt-1 text-[1.375rem] font-semibold leading-none">
            {today.checked_in}
            <span className="text-[0.875rem] font-normal text-ink-3"> / {today.expected}</span>
          </p>
          <div className="meter mt-2.5" data-level={pct >= 90 ? "full" : pct >= 60 ? "warn" : "ok"}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="mono mt-1.5 text-[0.625rem] text-ink-3">
            {pct}% of confirmed registrations
          </p>
        </div>
      </div>

      <Scanner initialCode={raw} />
    </div>
  );
}
