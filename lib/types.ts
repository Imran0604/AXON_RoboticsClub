/**
 * Domain types and the derived-state helpers that go with them.
 *
 * Deliberate choice: fest and event lifecycle state is never stored in a column.
 * It is always computed from dates at read time, so it cannot drift out of
 * sync with reality or need a cron job to keep it honest.
 */

export type UserRole = "participant" | "organizer" | "admin";

export type RegStatus =
  | "pending"
  | "confirmed"
  | "waitlisted"
  | "rejected"
  | "cancelled"
  | "checked_in";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "url";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  institution: string | null;
  role: UserRole;
  created_at: Date;
}

export interface Fest {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  venue: string | null;
  art_seed: number;
  status: "draft" | "published";
}

export interface EventRow {
  id: string;
  fest_id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  description: string | null;
  starts_at: Date;
  ends_at: Date | null;
  venue: string | null;
  capacity: number | null;
  registration_deadline: Date | null;
  fee_bdt: number;
  team_min: number;
  team_max: number;
  prize: string | null;
  rules: string | null;
  art_seed: number;
  status: "draft" | "published" | "cancelled";
}

export interface FormField {
  id: string;
  event_id: string;
  label: string;
  field_key: string;
  type: FieldType;
  placeholder: string | null;
  help_text: string | null;
  required: boolean;
  options: string[];
  position: number;
}

/**
 * Declared as a type alias rather than an interface on purpose: TypeScript
 * grants implicit index signatures to type aliases but not to interfaces, and
 * without one this cannot be passed to postgres.js's json() helper.
 */
export type TeamMember = {
  name: string;
  institution?: string;
};

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: RegStatus;
  ticket_code: string;
  team_name: string | null;
  team_members: TeamMember[];
  answers: Record<string, string>;
  waitlist_position: number | null;
  checked_in_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/* ------------------------------------------------------------------------- */
/* Derived lifecycle state                                                    */
/* ------------------------------------------------------------------------- */

export type FestPhase = "upcoming" | "ongoing" | "past";

export function festPhase(fest: Pick<Fest, "start_date" | "end_date">, now = new Date()): FestPhase {
  // Compare on calendar days: a fest ending today is still "ongoing" all day.
  const today = now.toISOString().slice(0, 10);
  if (today < fest.start_date) return "upcoming";
  if (today > fest.end_date) return "past";
  return "ongoing";
}

export const FEST_PHASE_LABEL: Record<FestPhase, string> = {
  upcoming: "Upcoming",
  ongoing: "Happening now",
  past: "Past",
};

export const FEST_PHASE_TONE: Record<FestPhase, string> = {
  upcoming: "badge-navy",
  ongoing: "badge-ok",
  past: "badge-neutral",
};

/**
 * Whether an event is still accepting registrations, and if not, why.
 * `seatsTaken` comes from the database so this stays consistent with the
 * server-side guard that actually enforces it.
 */
export type RegGate =
  | { open: true; seatsLeft: number | null }
  | { open: false; reason: GateReason; seatsLeft: number | null };

export function registrationGate(
  event: Pick<EventRow, "capacity" | "registration_deadline" | "status" | "starts_at">,
  seatsTaken: number,
  now = new Date()
): RegGate {
  const seatsLeft = event.capacity === null ? null : Math.max(0, event.capacity - seatsTaken);

  if (event.status === "cancelled") return { open: false, reason: "cancelled", seatsLeft };
  if (event.registration_deadline && new Date(event.registration_deadline) < now) {
    return { open: false, reason: "deadline", seatsLeft };
  }
  if (new Date(event.starts_at) < now) return { open: false, reason: "started", seatsLeft };
  if (seatsLeft !== null && seatsLeft <= 0) return { open: false, reason: "capacity", seatsLeft };

  return { open: true, seatsLeft };
}

export type GateReason = "deadline" | "capacity" | "cancelled" | "started";

export const GATE_MESSAGE: Record<GateReason, string> = {
  deadline: "Registration closed",
  capacity: "Event full — join waitlist",
  cancelled: "Event cancelled",
  started: "Already started",
};

export const REG_STATUS_LABEL: Record<RegStatus, string> = {
  pending: "Pending review",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  cancelled: "Cancelled",
  checked_in: "Checked in",
};

export const REG_STATUS_TONE: Record<RegStatus, string> = {
  pending: "badge-warn",
  confirmed: "badge-ok",
  waitlisted: "badge-info",
  rejected: "badge-crit",
  cancelled: "badge-neutral",
  checked_in: "badge-brass",
};

/** Statuses that occupy a seat. Mirrors seats_taken() in schema.sql. */
export const SEAT_OCCUPYING: RegStatus[] = ["pending", "confirmed", "checked_in"];

export const CATEGORIES = [
  "Hardware",
  "Drone",
  "AI / ML",
  "Software",
  "Workshop",
  "Design",
  "Esports",
  "Quiz",
] as const;

/* ------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* ------------------------------------------------------------------------- */

const DHAKA = "Asia/Dhaka";

export function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DHAKA,
  });
}

export function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DHAKA,
  });
}

export function fmtTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DHAKA,
  });
}

export function fmtDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  if (sameMonth) {
    return `${s.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" })}–${e.toLocaleDateString(
      "en-GB",
      { ...opts, year: "numeric" }
    )}`;
  }
  return `${s.toLocaleDateString("en-GB", opts)} – ${e.toLocaleDateString("en-GB", {
    ...opts,
    year: "numeric",
  })}`;
}

export function fmtFee(bdt: number): string {
  return bdt === 0 ? "Free" : `৳${bdt.toLocaleString("en-US")}`;
}

/** "in 3 days", "in 5 hours", "closed 2 days ago" */
export function relativeDeadline(deadline: Date | string | null, now = new Date()): string | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now.getTime();
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  let span: string;
  if (mins < 60) span = `${mins} minute${mins === 1 ? "" : "s"}`;
  else if (hrs < 24) span = `${hrs} hour${hrs === 1 ? "" : "s"}`;
  else span = `${days} day${days === 1 ? "" : "s"}`;

  return ms > 0 ? `Closes in ${span}` : `Closed ${span} ago`;
}

export function teamLabel(min: number, max: number): string {
  if (max === 1) return "Individual";
  if (min === max) return `Teams of ${max}`;
  if (min === 1) return `Solo or teams up to ${max}`;
  return `Teams of ${min}–${max}`;
}
