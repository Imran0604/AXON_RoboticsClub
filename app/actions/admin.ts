"use server";

import { revalidatePath } from "next/cache";
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, requireRole } from "@/lib/auth";
import type { RegStatus } from "@/lib/types";

/**
 * Organiser mutations.
 *
 * Every action calls requireRole first, which re-reads the role from the
 * database rather than trusting the session cookie, and every action writes
 * an audit row. Authorization is not in the UI — hiding a button is not a
 * permission check.
 */

const STAFF = ["organizer", "admin"] as const;

const VALID_STATUS: RegStatus[] = [
  "pending",
  "confirmed",
  "waitlisted",
  "rejected",
  "cancelled",
  "checked_in",
];

/** Statuses that occupy a seat — mirrors seats_taken() in schema.sql. */
const OCCUPIES = ["pending", "confirmed", "checked_in"];

/**
 * Promotes the first waitlisted entry if the event now has room.
 * Called after any status change that might have freed a seat, inside the
 * caller's transaction so the two changes commit together.
 */
async function promoteIfRoom(tx: TransactionSql, eventId: string): Promise<string | null> {
  const [event] = await tx<{ capacity: number | null }[]>`
    select capacity from events where id = ${eventId} for update
  `;
  if (!event?.capacity) return null;

  const [{ taken }] = await tx<{ taken: number }[]>`
    select count(*)::int as taken from registrations
    where event_id = ${eventId} and status in ('pending', 'confirmed', 'checked_in')
  `;
  if (taken >= event.capacity) return null;

  const [next] = await tx<{ id: string; ticket_code: string }[]>`
    select id, ticket_code from registrations
    where event_id = ${eventId} and status = 'waitlisted'
    order by waitlist_position asc nulls last, created_at asc
    limit 1
  `;
  if (!next) return null;

  await tx`update registrations set status = 'confirmed', waitlist_position = null where id = ${next.id}`;
  await tx`
    update registrations set waitlist_position = waitlist_position - 1
    where event_id = ${eventId} and status = 'waitlisted' and waitlist_position is not null
  `;
  return next.ticket_code;
}

/* ------------------------------------------------------------------------- */
/* Registration status                                                        */
/* ------------------------------------------------------------------------- */

export async function setRegistrationStatusAction(formData: FormData): Promise<void> {
  const staff = await requireRole([...STAFF]);

  const id = String(formData.get("registration_id") ?? "");
  const status = String(formData.get("status") ?? "") as RegStatus;
  if (!id || !VALID_STATUS.includes(status)) return;

  const promoted = await sql.begin(async (tx) => {
    const [reg] = await tx<
      { id: string; event_id: string; status: RegStatus; waitlist_position: number | null }[]
    >`
      select id, event_id, status, waitlist_position
      from registrations where id = ${id} for update
    `;
    if (!reg || reg.status === status) return null;

    // Moving someone to the back of the waitlist needs a position; every
    // other status clears it.
    let position: number | null = null;
    if (status === "waitlisted") {
      const [{ queued }] = await tx<{ queued: number }[]>`
        select count(*)::int as queued from registrations
        where event_id = ${reg.event_id} and status = 'waitlisted' and id != ${id}
      `;
      position = reg.waitlist_position ?? queued + 1;
    }

    await tx`
      update registrations
      set status = ${status},
          waitlist_position = ${position},
          checked_in_at = ${status === "checked_in" ? new Date() : null}
      where id = ${id}
    `;

    // Did this change release a seat?
    if (OCCUPIES.includes(reg.status) && !OCCUPIES.includes(status)) {
      return promoteIfRoom(tx, reg.event_id);
    }
    return null;
  });

  await audit(staff.id, `registration.set_${status}`, "registration", id, {
    promoted_ticket: promoted,
  });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
}

export async function bulkStatusAction(formData: FormData): Promise<void> {
  const staff = await requireRole([...STAFF]);

  const status = String(formData.get("status") ?? "") as RegStatus;
  const ids = formData.getAll("selected").map(String).filter(Boolean);
  if (!VALID_STATUS.includes(status) || ids.length === 0) return;

  await sql.begin(async (tx) => {
    const affected = await tx<{ id: string; event_id: string; status: RegStatus }[]>`
      select id, event_id, status from registrations where id = any(${ids}) for update
    `;

    await tx`
      update registrations
      set status = ${status},
          waitlist_position = null,
          checked_in_at = ${status === "checked_in" ? new Date() : null}
      where id = any(${ids})
    `;

    // Promote per affected event, once each, for the events that lost a seat.
    const freed = new Set(
      affected.filter((r) => OCCUPIES.includes(r.status) && !OCCUPIES.includes(status)).map((r) => r.event_id)
    );
    for (const eventId of freed) await promoteIfRoom(tx, eventId);
  });

  await audit(staff.id, `registration.bulk_${status}`, "registration", null, { count: ids.length });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
}

/* ------------------------------------------------------------------------- */
/* Check-in (used by the QR scanner)                                          */
/* ------------------------------------------------------------------------- */

export interface CheckInResult {
  ok: boolean;
  message: string;
  detail?: {
    name: string;
    event: string;
    code: string;
    status: RegStatus;
    team: string | null;
    institution: string | null;
    alreadyAt?: string;
  };
}

export async function checkInAction(code: string): Promise<CheckInResult> {
  const staff = await requireRole([...STAFF], "/admin/scan");

  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, message: "No ticket code supplied." };

  // A scanned QR carries a full URL; accept either that or a bare code.
  const match = clean.match(/AXN-[A-Z0-9]{2,4}-[A-Z0-9]{3,6}/);
  const ticket = match ? match[0] : clean;

  const [reg] = await sql<
    {
      id: string;
      status: RegStatus;
      ticket_code: string;
      team_name: string | null;
      checked_in_at: Date | null;
      name: string;
      institution: string | null;
      event_title: string;
    }[]
  >`
    select r.id, r.status, r.ticket_code, r.team_name, r.checked_in_at,
           u.name, u.institution, e.title as event_title
    from registrations r
    join users u on u.id = r.user_id
    join events e on e.id = r.event_id
    where upper(r.ticket_code) = ${ticket}
    limit 1
  `;

  if (!reg) {
    return { ok: false, message: `No registration found for ${ticket}.` };
  }

  const detail = {
    name: reg.name,
    event: reg.event_title,
    code: reg.ticket_code,
    status: reg.status,
    team: reg.team_name,
    institution: reg.institution,
  };

  if (reg.status === "checked_in") {
    return {
      ok: false,
      message: "Already checked in.",
      detail: { ...detail, alreadyAt: reg.checked_in_at?.toISOString() },
    };
  }
  if (reg.status === "cancelled" || reg.status === "rejected") {
    return { ok: false, message: `This registration was ${reg.status}.`, detail };
  }
  if (reg.status === "waitlisted") {
    return { ok: false, message: "On the waitlist — not admitted yet.", detail };
  }

  await sql`
    update registrations set status = 'checked_in', checked_in_at = now() where id = ${reg.id}
  `;

  await audit(staff.id, "registration.checked_in", "registration", reg.id, { ticket: reg.ticket_code });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Checked in.",
    detail: { ...detail, status: "checked_in" },
  };
}

/* ------------------------------------------------------------------------- */
/* Events                                                                     */
/* ------------------------------------------------------------------------- */

export interface EventFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: string;
}

const eventSchema = z.object({
  fest_id: z.string().uuid("Choose a fest"),
  title: z.string().trim().min(3, "Give the event a title").max(160),
  category: z.string().trim().min(1, "Choose a category"),
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(8000).optional(),
  starts_at: z.string().min(1, "Set a start date and time"),
  ends_at: z.string().optional(),
  venue: z.string().trim().max(200).optional(),
  capacity: z.coerce.number().int().positive("Capacity must be a positive number").optional(),
  registration_deadline: z.string().optional(),
  fee_bdt: z.coerce.number().int().min(0, "Fee cannot be negative"),
  team_min: z.coerce.number().int().min(1),
  team_max: z.coerce.number().int().min(1),
  prize: z.string().trim().max(200).optional(),
  rules: z.string().trim().max(8000).optional(),
  status: z.enum(["draft", "published", "cancelled"]),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/**
 * A datetime-local input submits "YYYY-MM-DDTHH:mm" with no timezone. The
 * club operates in Asia/Dhaka, so interpret it there rather than in whatever
 * zone the server happens to run in — on Vercel that is UTC, which would
 * silently shift every event by six hours.
 */
function dhaka(v: FormDataEntryValue | null): string | null {
  const raw = typeof v === "string" ? v.trim() : "";
  if (!raw) return null;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) return raw;
  const withSeconds = /T\d{2}:\d{2}$/.test(raw) ? `${raw}:00` : raw;
  return `${withSeconds}+06:00`;
}

function parseEventForm(formData: FormData) {
  return eventSchema.safeParse({
    fest_id: formData.get("fest_id"),
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary") || undefined,
    description: formData.get("description") || undefined,
    starts_at: dhaka(formData.get("starts_at")) ?? "",
    ends_at: dhaka(formData.get("ends_at")) ?? undefined,
    venue: formData.get("venue") || undefined,
    capacity: formData.get("capacity") || undefined,
    registration_deadline: dhaka(formData.get("registration_deadline")) ?? undefined,
    fee_bdt: formData.get("fee_bdt") || 0,
    team_min: formData.get("team_min") || 1,
    team_max: formData.get("team_max") || 1,
    prize: formData.get("prize") || undefined,
    rules: formData.get("rules") || undefined,
    status: formData.get("status") || "draft",
  });
}

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const staff = await requireRole([...STAFF]);
  const parsed = parseEventForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const d = parsed.data;
  if (d.team_max < d.team_min) {
    return { fieldErrors: { team_max: "Maximum team size cannot be below the minimum" } };
  }

  // Keep slugs unique without failing the whole submission over a collision.
  const base = slugify(d.title);
  let slug = base;
  for (let n = 2; ; n++) {
    const clash = await sql<{ id: string }[]>`select id from events where slug = ${slug} limit 1`;
    if (!clash.length) break;
    slug = `${base}-${n}`;
  }

  const [row] = await sql<{ id: string; slug: string }[]>`
    insert into events (fest_id, title, slug, category, summary, description, starts_at, ends_at,
                        venue, capacity, registration_deadline, fee_bdt, team_min, team_max,
                        prize, rules, art_seed, status)
    values (${d.fest_id}, ${d.title}, ${slug}, ${d.category}, ${d.summary ?? null},
            ${d.description ?? null}, ${d.starts_at}, ${d.ends_at || null}, ${d.venue ?? null},
            ${d.capacity ?? null}, ${d.registration_deadline || null}, ${d.fee_bdt},
            ${d.team_min}, ${d.team_max}, ${d.prize ?? null}, ${d.rules ?? null},
            ${Math.floor(Math.random() * 9000) + 100}, ${d.status})
    returning id, slug
  `;

  // Seed the three questions every event asks, so a new event is immediately
  // registerable rather than having an empty form.
  await sql`
    insert into event_form_fields (event_id, label, field_key, type, required, options, position, placeholder)
    values
      (${row.id}, 'Full name',   'full_name',   'text',   true, '[]'::jsonb, 0, 'As it should appear on your certificate'),
      (${row.id}, 'Institution', 'institution', 'text',   true, '[]'::jsonb, 1, 'School, college or university'),
      (${row.id}, 'Class / Year','year',        'select', true,
       ${sql.json(["Class 9", "Class 10", "Class 11", "Class 12", "Undergraduate 1st year", "Undergraduate 2nd year", "Undergraduate 3rd year", "Undergraduate 4th year"])},
       2, null)
  `;

  await audit(staff.id, "event.created", "event", row.id, { slug: row.slug, title: d.title });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: row.slug };
}

export async function updateEventAction(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const staff = await requireRole([...STAFF]);
  const id = String(formData.get("event_id") ?? "");
  if (!id) return { error: "Missing event." };

  const parsed = parseEventForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const d = parsed.data;
  if (d.team_max < d.team_min) {
    return { fieldErrors: { team_max: "Maximum team size cannot be below the minimum" } };
  }

  // Refuse to set a capacity below the seats already taken — that would make
  // the event silently oversold rather than reporting the conflict.
  const [{ taken }] = await sql<{ taken: number }[]>`
    select count(*)::int as taken from registrations
    where event_id = ${id} and status in ('pending', 'confirmed', 'checked_in')
  `;
  if (d.capacity !== undefined && d.capacity < taken) {
    return {
      fieldErrors: {
        capacity: `${taken} people are already registered — capacity cannot go below that.`,
      },
    };
  }

  await sql`
    update events set
      fest_id = ${d.fest_id}, title = ${d.title}, category = ${d.category},
      summary = ${d.summary ?? null}, description = ${d.description ?? null},
      starts_at = ${d.starts_at}, ends_at = ${d.ends_at || null}, venue = ${d.venue ?? null},
      capacity = ${d.capacity ?? null}, registration_deadline = ${d.registration_deadline || null},
      fee_bdt = ${d.fee_bdt}, team_min = ${d.team_min}, team_max = ${d.team_max},
      prize = ${d.prize ?? null}, rules = ${d.rules ?? null}, status = ${d.status}
    where id = ${id}
  `;

  await audit(staff.id, "event.updated", "event", id, { title: d.title });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/events");
  return { ok: "saved" };
}

/* ------------------------------------------------------------------------- */
/* Form builder                                                               */
/* ------------------------------------------------------------------------- */

export async function addFieldAction(formData: FormData): Promise<void> {
  const staff = await requireRole([...STAFF]);
  const eventId = String(formData.get("event_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "text");
  const required = formData.get("required") === "on";
  const placeholder = String(formData.get("placeholder") ?? "").trim() || null;
  const options = String(formData.get("options") ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

  if (!eventId || !label) return;

  // Derive a stable key from the label, unique within the event.
  const base = slugify(label).replace(/-/g, "_").slice(0, 40) || "field";
  let key = base;
  for (let n = 2; ; n++) {
    const clash = await sql<{ id: string }[]>`
      select id from event_form_fields where event_id = ${eventId} and field_key = ${key} limit 1
    `;
    if (!clash.length) break;
    key = `${base}_${n}`;
  }

  const [{ next }] = await sql<{ next: number }[]>`
    select coalesce(max(position) + 1, 0)::int as next from event_form_fields where event_id = ${eventId}
  `;

  await sql`
    insert into event_form_fields (event_id, label, field_key, type, required, options, position, placeholder)
    values (${eventId}, ${label}, ${key}, ${type}, ${required}, ${sql.json(options)}, ${next}, ${placeholder})
  `;

  await audit(staff.id, "form_field.added", "event", eventId, { label, type });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteFieldAction(formData: FormData): Promise<void> {
  const staff = await requireRole([...STAFF]);
  const fieldId = String(formData.get("field_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!fieldId) return;

  await sql`delete from event_form_fields where id = ${fieldId}`;
  await audit(staff.id, "form_field.deleted", "event", eventId, { field: fieldId });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function moveFieldAction(formData: FormData): Promise<void> {
  await requireRole([...STAFF]);
  const fieldId = String(formData.get("field_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const dir = String(formData.get("direction") ?? "");
  if (!fieldId || !eventId || !["up", "down"].includes(dir)) return;

  // Swap positions with the adjacent field rather than renumbering the list.
  await sql.begin(async (tx) => {
    const rows = await tx<{ id: string; position: number }[]>`
      select id, position from event_form_fields where event_id = ${eventId}
      order by position asc, created_at asc
    `;
    const i = rows.findIndex((r) => r.id === fieldId);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return;

    await tx`update event_form_fields set position = ${rows[j].position} where id = ${rows[i].id}`;
    await tx`update event_form_fields set position = ${rows[i].position} where id = ${rows[j].id}`;
  });

  revalidatePath(`/admin/events/${eventId}`);
}
