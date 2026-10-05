"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { audit, getSession } from "@/lib/auth";
import type { FieldType, FormField, TeamMember } from "@/lib/types";

export interface RegisterState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Registration is the one place in this app where correctness genuinely
 * matters, so all three limits are enforced inside a transaction that locks
 * the event row:
 *
 *   deadline  — checked against the database clock, not the browser's
 *   capacity  — counted inside the lock, so two simultaneous requests for the
 *               last seat cannot both succeed
 *   duplicate — a unique (event_id, user_id) constraint is the real guard;
 *               the friendly message is just a nicer way to report it
 *
 * When an event is full the registration becomes a waitlist entry rather than
 * an error, and the queue position is assigned inside the same lock.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — these get misread aloud

function ticketCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `AXN-${out.slice(0, 3)}-${out.slice(3)}`;
}

/** Validates one submitted answer against its organiser-defined field. */
function validateAnswer(field: FormField, raw: string): { value: string; error?: string } {
  const value = raw.trim();

  if (field.required && !value) return { value, error: `${field.label} is required` };
  if (!value) return { value };

  const checks: Partial<Record<FieldType, () => string | undefined>> = {
    email: () => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : "Enter a valid email address"),
    url: () => (/^https?:\/\/.+/.test(value) ? undefined : "Enter a full URL starting with http"),
    phone: () =>
      /^[+]?[\d\s()-]{6,20}$/.test(value) ? undefined : "Enter a valid phone number",
    number: () => (/^-?\d+(\.\d+)?$/.test(value) ? undefined : "Enter a number"),
    select: () => (field.options.includes(value) ? undefined : "Choose one of the listed options"),
    radio: () => (field.options.includes(value) ? undefined : "Choose one of the listed options"),
  };

  const error = checks[field.type]?.();
  if (error) return { value, error: `${field.label}: ${error}` };
  if (value.length > 2000) return { value, error: `${field.label} is too long` };
  return { value };
}

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const user = await getSession();
  const eventId = String(formData.get("event_id") ?? "");
  const slug = String(formData.get("event_slug") ?? "");

  if (!user) redirect(`/login?next=/events/${slug}/register`);
  if (!eventId) return { error: "Something went wrong — please reload the page and try again." };

  const fields = await sql<FormField[]>`
    select * from event_form_fields where event_id = ${eventId} order by position asc
  `;

  // ---- validate the organiser-defined answers -----------------------------
  const answers: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};

  for (const f of fields) {
    const submitted =
      f.type === "checkbox"
        ? formData.getAll(`f_${f.field_key}`).map(String).filter(Boolean).join(", ")
        : String(formData.get(`f_${f.field_key}`) ?? "");

    const { value, error } = validateAnswer(f, submitted);
    if (error) fieldErrors[f.field_key] = error;
    else if (value) answers[f.field_key] = value;
  }

  // ---- validate team composition ------------------------------------------
  const teamName = String(formData.get("team_name") ?? "").trim() || null;
  const memberNames = formData.getAll("member_name").map((v) => String(v).trim());
  const memberInsts = formData.getAll("member_institution").map((v) => String(v).trim());
  const members: TeamMember[] = memberNames
    .map((name, i) => ({ name, institution: memberInsts[i] || undefined }))
    .filter((m) => m.name);

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // ---- the transactional part ---------------------------------------------
  try {
    const outcome = await sql.begin(async (tx) => {
      // Locking the event row serialises every registration for this event,
      // which is what makes the capacity count below trustworthy.
      const [event] = await tx<
        {
          id: string;
          capacity: number | null;
          registration_deadline: Date | null;
          status: string;
          starts_at: Date;
          team_min: number;
          team_max: number;
          title: string;
        }[]
      >`
        select id, capacity, registration_deadline, status, starts_at, team_min, team_max, title
        from events where id = ${eventId} for update
      `;

      if (!event) return { kind: "error" as const, message: "That event no longer exists." };
      if (event.status === "cancelled") {
        return { kind: "error" as const, message: "This event has been cancelled." };
      }

      const [{ now }] = await tx<{ now: Date }[]>`select now() as now`;

      if (event.registration_deadline && new Date(event.registration_deadline) < now) {
        return {
          kind: "error" as const,
          message: "Registration for this event closed before your submission arrived.",
        };
      }
      if (new Date(event.starts_at) < now) {
        return { kind: "error" as const, message: "This event has already started." };
      }

      // Team size, validated against the event's own rules.
      const teamSize = 1 + members.length;
      if (teamSize < event.team_min) {
        return {
          kind: "error" as const,
          message: `This event needs at least ${event.team_min} people — add ${event.team_min - teamSize} more.`,
        };
      }
      if (teamSize > event.team_max) {
        return {
          kind: "error" as const,
          message: `This event allows at most ${event.team_max} people per entry.`,
        };
      }

      const [{ taken }] = await tx<{ taken: number }[]>`
        select count(*)::int as taken from registrations
        where event_id = ${eventId} and status in ('pending', 'confirmed', 'checked_in')
      `;

      const full = event.capacity !== null && taken >= event.capacity;

      let waitlistPosition: number | null = null;
      if (full) {
        const [{ queued }] = await tx<{ queued: number }[]>`
          select count(*)::int as queued from registrations
          where event_id = ${eventId} and status = 'waitlisted'
        `;
        waitlistPosition = queued + 1;
      }

      const [row] = await tx<{ ticket_code: string; status: string }[]>`
        insert into registrations
          (event_id, user_id, status, ticket_code, team_name, team_members, answers, waitlist_position)
        values (
          ${eventId}, ${user.id}, ${full ? "waitlisted" : "confirmed"}, ${ticketCode()},
          ${teamName}, ${tx.json(members)}, ${tx.json(answers)}, ${waitlistPosition}
        )
        returning ticket_code, status
      `;

      return { kind: "ok" as const, code: row.ticket_code, status: row.status, title: event.title };
    });

    if (outcome.kind === "error") return { error: outcome.message };

    await audit(user.id, `registration.${outcome.status}`, "registration", null, {
      event: slug,
      ticket: outcome.code,
    });

    revalidatePath(`/events/${slug}`);
    revalidatePath("/me/registrations");
    redirect(`/tickets/${outcome.code}?new=1`);
  } catch (err) {
    // A redirect inside a server action is implemented as a thrown error,
    // so it must be allowed to propagate.
    if (err && typeof err === "object" && "digest" in err) throw err;

    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("registrations_event_id_user_id_key")) {
      return { error: "You have already registered for this event. Check My registrations." };
    }
    console.error("registerAction failed:", message);
    return { error: "Something went wrong saving your registration. Please try again." };
  }
}

/**
 * Cancels a registration and promotes the first person off the waitlist.
 *
 * Both halves happen in one transaction: a cancellation that frees a seat but
 * fails to promote anyone would leave the event permanently under-filled with
 * people still queued.
 */
export async function cancelRegistrationAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect("/login?next=/me/registrations");

  const id = String(formData.get("registration_id") ?? "");
  if (!id) return;

  const promoted = await sql.begin(async (tx) => {
    const [reg] = await tx<{ id: string; event_id: string; status: string; user_id: string }[]>`
      select id, event_id, status, user_id from registrations where id = ${id} for update
    `;
    if (!reg || reg.user_id !== user.id) return null;
    if (reg.status === "cancelled") return null;

    await tx`update registrations set status = 'cancelled', waitlist_position = null where id = ${id}`;

    // Only a seat-occupying cancellation frees a place.
    if (!["pending", "confirmed", "checked_in"].includes(reg.status)) return null;

    const [event] = await tx<{ capacity: number | null }[]>`
      select capacity from events where id = ${reg.event_id} for update
    `;
    if (!event?.capacity) return null;

    const [{ taken }] = await tx<{ taken: number }[]>`
      select count(*)::int as taken from registrations
      where event_id = ${reg.event_id} and status in ('pending', 'confirmed', 'checked_in')
    `;
    if (taken >= event.capacity) return null;

    const [next] = await tx<{ id: string; user_id: string; ticket_code: string }[]>`
      select id, user_id, ticket_code from registrations
      where event_id = ${reg.event_id} and status = 'waitlisted'
      order by waitlist_position asc nulls last, created_at asc
      limit 1
    `;
    if (!next) return null;

    await tx`
      update registrations
      set status = 'confirmed', waitlist_position = null
      where id = ${next.id}
    `;
    // Close the gap so the remaining queue stays 1, 2, 3…
    await tx`
      update registrations
      set waitlist_position = waitlist_position - 1
      where event_id = ${reg.event_id} and status = 'waitlisted' and waitlist_position is not null
    `;

    return next;
  });

  await audit(user.id, "registration.cancelled", "registration", id, {
    promoted_ticket: promoted?.ticket_code ?? null,
  });

  revalidatePath("/me/registrations");
  revalidatePath("/admin/registrations");
}
