import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { exportRegistrations, type AdminRegFilters } from "@/lib/queries";
import { REG_STATUS_LABEL, type RegStatus } from "@/lib/types";

/**
 * CSV export of the organiser's current filter selection.
 *
 * It reads the same query parameters the participants table uses, so whatever
 * an organiser is looking at is exactly what downloads — no second filter UI
 * to keep in sync.
 */

/** RFC 4180: quote everything, double any embedded quotes. */
function cell(v: unknown): string {
  if (v === null || v === undefined) return '""';
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

const COLUMNS = [
  "Ticket code",
  "Status",
  "Participant",
  "Email",
  "Phone",
  "Institution",
  "Event",
  "Fest",
  "Event date",
  "Team name",
  "Team members",
  "Waitlist position",
  "Checked in at",
  "Registered at",
] as const;

export async function GET(request: NextRequest) {
  await requireRole(["organizer", "admin"]);

  const sp = request.nextUrl.searchParams;
  const filters: AdminRegFilters = {
    q: sp.get("q") ?? undefined,
    status: (sp.get("status") as RegStatus | null) ?? undefined,
    event: sp.get("event") ?? undefined,
    fest: sp.get("fest") ?? undefined,
    sort: "newest",
  };

  const rows = await exportRegistrations(filters);

  // Collect every answer key present across the selection so custom form
  // fields become their own columns rather than one JSON blob.
  const answerKeys = [...new Set(rows.flatMap((r) => Object.keys(r.answers)))].sort();

  const lines: string[] = [];
  lines.push([...COLUMNS, ...answerKeys.map((k) => k.replace(/_/g, " "))].map(cell).join(","));

  for (const r of rows) {
    lines.push(
      [
        r.ticket_code,
        REG_STATUS_LABEL[r.status],
        r.participant_name,
        r.participant_email,
        r.participant_phone,
        r.participant_institution,
        r.event_title,
        r.fest_name,
        new Date(r.event_starts_at).toISOString(),
        r.team_name,
        r.team_members.map((m) => m.name).join("; "),
        r.waitlist_position,
        r.checked_in_at ? new Date(r.checked_in_at).toISOString() : "",
        new Date(r.created_at).toISOString(),
        ...answerKeys.map((k) => r.answers[k] ?? ""),
      ]
        .map(cell)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const scope = filters.event ?? filters.fest ?? "all";

  // The BOM makes Excel open UTF-8 correctly, which matters for Bengali names.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="axon-registrations-${scope}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
