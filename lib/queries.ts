import "server-only";
import { sql } from "@/lib/db";
import type { EventRow, Fest, FormField, RegStatus, Registration, UserRole } from "@/lib/types";

/**
 * All database reads live here so that query shapes stay reviewable in one
 * place and pages never assemble SQL inline.
 *
 * Seat counts are always computed from the registrations table rather than
 * cached on the event, matching seats_taken() in schema.sql. One source of
 * truth means a cancelled registration genuinely frees its seat everywhere.
 */

const SEAT_SUBQUERY = sql`
  (select count(*) from registrations r
    where r.event_id = e.id
      and r.status in ('pending', 'confirmed', 'checked_in'))::int
`;

export interface EventCard extends EventRow {
  fest_name: string;
  fest_slug: string;
  seats_taken: number;
}

export interface FestCard extends Fest {
  event_count: number;
  registration_count: number;
}

/* ------------------------------------------------------------------------- */
/* Organization                                                               */
/* ------------------------------------------------------------------------- */

export async function getOrganization() {
  const rows = await sql<
    { id: string; name: string; slug: string; tagline: string; about: string; website: string; email: string }[]
  >`select id, name, slug, tagline, about, website, email from organizations order by created_at limit 1`;
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------------- */
/* Fests                                                                      */
/* ------------------------------------------------------------------------- */

export async function getFests(): Promise<FestCard[]> {
  return sql<FestCard[]>`
    select f.*,
      (select count(*) from events e where e.fest_id = f.id and e.status = 'published')::int as event_count,
      (select count(*) from registrations r
         join events e2 on e2.id = r.event_id
        where e2.fest_id = f.id
          and r.status in ('pending', 'confirmed', 'checked_in'))::int as registration_count
    from fests f
    where f.status = 'published'
    order by f.start_date desc
  `;
}

export async function getFestBySlug(slug: string): Promise<FestCard | null> {
  const rows = await sql<FestCard[]>`
    select f.*,
      (select count(*) from events e where e.fest_id = f.id and e.status = 'published')::int as event_count,
      (select count(*) from registrations r
         join events e2 on e2.id = r.event_id
        where e2.fest_id = f.id
          and r.status in ('pending', 'confirmed', 'checked_in'))::int as registration_count
    from fests f
    where f.slug = ${slug} and f.status = 'published'
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getEventsForFest(festId: string): Promise<EventCard[]> {
  return sql<EventCard[]>`
    select e.*, f.name as fest_name, f.slug as fest_slug, ${SEAT_SUBQUERY} as seats_taken
    from events e
    join fests f on f.id = e.fest_id
    where e.fest_id = ${festId} and e.status != 'draft'
    order by e.starts_at asc
  `;
}

/* ------------------------------------------------------------------------- */
/* Event search — powers the directory, with every filter URL-addressable     */
/* ------------------------------------------------------------------------- */

export interface EventFilters {
  q?: string;
  category?: string;
  fest?: string;
  fee?: "free" | "paid";
  team?: "solo" | "team";
  open?: boolean;
  sort?: "soonest" | "latest" | "seats" | "title";
}

export async function searchEvents(filters: EventFilters = {}): Promise<EventCard[]> {
  const conds = [sql`e.status != 'draft'`, sql`f.status = 'published'`];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conds.push(sql`(
      e.title ilike ${term} or
      e.summary ilike ${term} or
      e.description ilike ${term} or
      e.category ilike ${term} or
      e.venue ilike ${term} or
      f.name ilike ${term}
    )`);
  }
  if (filters.category) conds.push(sql`e.category = ${filters.category}`);
  if (filters.fest) conds.push(sql`f.slug = ${filters.fest}`);
  if (filters.fee === "free") conds.push(sql`e.fee_bdt = 0`);
  if (filters.fee === "paid") conds.push(sql`e.fee_bdt > 0`);
  if (filters.team === "solo") conds.push(sql`e.team_max = 1`);
  if (filters.team === "team") conds.push(sql`e.team_max > 1`);
  if (filters.open) {
    conds.push(sql`e.status = 'published'`);
    conds.push(sql`(e.registration_deadline is null or e.registration_deadline > now())`);
    conds.push(sql`e.starts_at > now()`);
  }

  const where = conds.reduce((acc, c) => sql`${acc} and ${c}`);

  const order =
    filters.sort === "latest"
      ? sql`e.starts_at desc`
      : filters.sort === "title"
        ? sql`e.title asc`
        : filters.sort === "seats"
          ? sql`(case when e.capacity is null then 999999 else e.capacity - ${SEAT_SUBQUERY} end) asc`
          : sql`e.starts_at asc`;

  return sql<EventCard[]>`
    select e.*, f.name as fest_name, f.slug as fest_slug, ${SEAT_SUBQUERY} as seats_taken
    from events e
    join fests f on f.id = e.fest_id
    where ${where}
    order by ${order}
  `;
}

export async function getCategoryCounts(): Promise<{ category: string; count: number }[]> {
  return sql<{ category: string; count: number }[]>`
    select e.category, count(*)::int as count
    from events e
    join fests f on f.id = e.fest_id
    where e.status != 'draft' and f.status = 'published'
    group by e.category
    order by count desc, e.category asc
  `;
}

/* ------------------------------------------------------------------------- */
/* Single event                                                               */
/* ------------------------------------------------------------------------- */

export interface EventDetail extends EventCard {
  fest_start: string;
  fest_end: string;
  fest_venue: string | null;
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const rows = await sql<EventDetail[]>`
    select e.*, f.name as fest_name, f.slug as fest_slug,
           f.start_date as fest_start, f.end_date as fest_end, f.venue as fest_venue,
           ${SEAT_SUBQUERY} as seats_taken
    from events e
    join fests f on f.id = e.fest_id
    where e.slug = ${slug} and e.status != 'draft'
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getEventById(id: string): Promise<EventDetail | null> {
  const rows = await sql<EventDetail[]>`
    select e.*, f.name as fest_name, f.slug as fest_slug,
           f.start_date as fest_start, f.end_date as fest_end, f.venue as fest_venue,
           ${SEAT_SUBQUERY} as seats_taken
    from events e
    join fests f on f.id = e.fest_id
    where e.id = ${id}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getFormFields(eventId: string): Promise<FormField[]> {
  return sql<FormField[]>`
    select * from event_form_fields
    where event_id = ${eventId}
    order by position asc, created_at asc
  `;
}

export async function getWaitlistCount(eventId: string): Promise<number> {
  const rows = await sql<{ n: number }[]>`
    select count(*)::int as n from registrations
    where event_id = ${eventId} and status = 'waitlisted'
  `;
  return rows[0]?.n ?? 0;
}

/* ------------------------------------------------------------------------- */
/* Registrations — participant side                                           */
/* ------------------------------------------------------------------------- */

export interface MyRegistration extends Registration {
  event_title: string;
  event_slug: string;
  event_starts_at: Date;
  event_venue: string | null;
  event_category: string;
  event_fee: number;
  event_art_seed: number;
  fest_name: string;
  fest_slug: string;
}

export async function getMyRegistrations(userId: string): Promise<MyRegistration[]> {
  return sql<MyRegistration[]>`
    select r.*,
           e.title as event_title, e.slug as event_slug, e.starts_at as event_starts_at,
           e.venue as event_venue, e.category as event_category, e.fee_bdt as event_fee,
           e.art_seed as event_art_seed,
           f.name as fest_name, f.slug as fest_slug
    from registrations r
    join events e on e.id = r.event_id
    join fests f on f.id = e.fest_id
    where r.user_id = ${userId}
    order by e.starts_at asc
  `;
}

export async function getMyRegistrationForEvent(
  userId: string,
  eventId: string
): Promise<Registration | null> {
  const rows = await sql<Registration[]>`
    select * from registrations where user_id = ${userId} and event_id = ${eventId} limit 1
  `;
  return rows[0] ?? null;
}

export interface TicketDetail extends MyRegistration {
  participant_name: string;
  participant_email: string;
  participant_institution: string | null;
  event_ends_at: Date | null;
  event_description: string | null;
}

export async function getRegistrationByCode(code: string): Promise<TicketDetail | null> {
  const rows = await sql<TicketDetail[]>`
    select r.*,
           e.title as event_title, e.slug as event_slug, e.starts_at as event_starts_at,
           e.ends_at as event_ends_at, e.venue as event_venue, e.category as event_category,
           e.fee_bdt as event_fee, e.art_seed as event_art_seed, e.description as event_description,
           f.name as fest_name, f.slug as fest_slug,
           u.name as participant_name, u.email as participant_email,
           u.institution as participant_institution
    from registrations r
    join events e on e.id = r.event_id
    join fests f on f.id = e.fest_id
    join users u on u.id = r.user_id
    where upper(r.ticket_code) = upper(${code})
    limit 1
  `;
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------------- */
/* Admin — participant management                                             */
/* ------------------------------------------------------------------------- */

export interface AdminRegistration extends Registration {
  participant_name: string;
  participant_email: string;
  participant_phone: string | null;
  participant_institution: string | null;
  event_title: string;
  event_slug: string;
  event_starts_at: Date;
  fest_name: string;
  fest_slug: string;
}

export interface AdminRegFilters {
  q?: string;
  status?: RegStatus;
  event?: string;
  fest?: string;
  page?: number;
  perPage?: number;
  sort?: "newest" | "oldest" | "name" | "event";
}

export async function listRegistrations(
  filters: AdminRegFilters = {}
): Promise<{ rows: AdminRegistration[]; total: number; page: number; pages: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(10, filters.perPage ?? 25));

  const conds = [sql`true`];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conds.push(sql`(
      u.name ilike ${term} or
      u.email ilike ${term} or
      u.phone ilike ${term} or
      u.institution ilike ${term} or
      r.ticket_code ilike ${term} or
      r.team_name ilike ${term}
    )`);
  }
  if (filters.status) conds.push(sql`r.status = ${filters.status}`);
  if (filters.event) conds.push(sql`e.slug = ${filters.event}`);
  if (filters.fest) conds.push(sql`f.slug = ${filters.fest}`);

  const where = conds.reduce((acc, c) => sql`${acc} and ${c}`);

  const order =
    filters.sort === "oldest"
      ? sql`r.created_at asc`
      : filters.sort === "name"
        ? sql`u.name asc`
        : filters.sort === "event"
          ? sql`e.title asc, u.name asc`
          : sql`r.created_at desc`;

  const countRows = await sql<{ n: number }[]>`
    select count(*)::int as n
    from registrations r
    join events e on e.id = r.event_id
    join fests f on f.id = e.fest_id
    join users u on u.id = r.user_id
    where ${where}
  `;
  const total = countRows[0]?.n ?? 0;

  const rows = await sql<AdminRegistration[]>`
    select r.*,
           u.name as participant_name, u.email as participant_email,
           u.phone as participant_phone, u.institution as participant_institution,
           e.title as event_title, e.slug as event_slug, e.starts_at as event_starts_at,
           f.name as fest_name, f.slug as fest_slug
    from registrations r
    join events e on e.id = r.event_id
    join fests f on f.id = e.fest_id
    join users u on u.id = r.user_id
    where ${where}
    order by ${order}
    limit ${perPage} offset ${(page - 1) * perPage}
  `;

  return { rows, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Unpaginated, for CSV export of the current filter selection. */
export async function exportRegistrations(filters: AdminRegFilters = {}): Promise<AdminRegistration[]> {
  const { rows } = await listRegistrations({ ...filters, page: 1, perPage: 100 });
  if (rows.length < 100) return rows;
  const all: AdminRegistration[] = [];
  let page = 1;
  for (;;) {
    const res = await listRegistrations({ ...filters, page, perPage: 100 });
    all.push(...res.rows);
    if (page >= res.pages) break;
    page++;
  }
  return all;
}

/* ------------------------------------------------------------------------- */
/* Admin — dashboard statistics                                               */
/* ------------------------------------------------------------------------- */

export interface DashboardStats {
  total_registrations: number;
  confirmed: number;
  pending: number;
  waitlisted: number;
  checked_in: number;
  cancelled: number;
  rejected: number;
  total_events: number;
  total_fests: number;
  total_participants: number;
  revenue_bdt: number;
  last_7_days: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await sql<DashboardStats[]>`
    select
      (select count(*) from registrations)::int                                        as total_registrations,
      (select count(*) from registrations where status = 'confirmed')::int             as confirmed,
      (select count(*) from registrations where status = 'pending')::int               as pending,
      (select count(*) from registrations where status = 'waitlisted')::int            as waitlisted,
      (select count(*) from registrations where status = 'checked_in')::int            as checked_in,
      (select count(*) from registrations where status = 'cancelled')::int             as cancelled,
      (select count(*) from registrations where status = 'rejected')::int              as rejected,
      (select count(*) from events where status = 'published')::int                    as total_events,
      (select count(*) from fests where status = 'published')::int                     as total_fests,
      (select count(distinct user_id) from registrations)::int                         as total_participants,
      (select coalesce(sum(e.fee_bdt), 0)::int
         from registrations r join events e on e.id = r.event_id
        where r.status in ('confirmed', 'checked_in'))                                 as revenue_bdt,
      (select count(*) from registrations
        where created_at > now() - interval '7 days')::int                             as last_7_days
  `;
  return rows[0];
}

/** Registrations per day for the sparkline and the analytics time series. */
export async function getRegistrationsByDay(days = 30): Promise<{ day: string; count: number }[]> {
  return sql<{ day: string; count: number }[]>`
    with span as (
      select generate_series(
        (current_date - make_interval(days => ${days - 1})),
        current_date,
        interval '1 day'
      )::date as day
    )
    select to_char(span.day, 'YYYY-MM-DD') as day,
           (select count(*) from registrations r where r.created_at::date = span.day)::int as count
    from span
    order by span.day asc
  `;
}

export async function getCategoryBreakdown(): Promise<{ category: string; count: number }[]> {
  return sql<{ category: string; count: number }[]>`
    select e.category, count(r.id)::int as count
    from events e
    left join registrations r on r.event_id = e.id
      and r.status in ('pending', 'confirmed', 'checked_in')
    where e.status = 'published'
    group by e.category
    order by count desc
  `;
}

export interface EventFill {
  id: string;
  title: string;
  slug: string;
  category: string;
  capacity: number | null;
  seats_taken: number;
  waitlisted: number;
  fest_name: string;
  starts_at: Date;
  registration_deadline: Date | null;
}

export async function getEventFill(): Promise<EventFill[]> {
  return sql<EventFill[]>`
    select e.id, e.title, e.slug, e.category, e.capacity, e.starts_at, e.registration_deadline,
           f.name as fest_name,
           ${SEAT_SUBQUERY} as seats_taken,
           (select count(*) from registrations r2
             where r2.event_id = e.id and r2.status = 'waitlisted')::int as waitlisted
    from events e
    join fests f on f.id = e.fest_id
    where e.status = 'published'
    order by (case when e.capacity is null then 0
                   else ${SEAT_SUBQUERY}::numeric / e.capacity end) desc
  `;
}

export async function getRecentActivity(limit = 12) {
  return sql<
    {
      id: string;
      action: string;
      entity: string;
      created_at: Date;
      actor_name: string | null;
      meta: Record<string, unknown>;
    }[]
  >`
    select a.id::text, a.action, a.entity, a.created_at, a.meta, u.name as actor_name
    from audit_log a
    left join users u on u.id = a.actor_id
    order by a.created_at desc
    limit ${limit}
  `;
}

/* ------------------------------------------------------------------------- */
/* Admin — event and fest management                                          */
/* ------------------------------------------------------------------------- */

export async function listAllEventsForAdmin(): Promise<EventCard[]> {
  return sql<EventCard[]>`
    select e.*, f.name as fest_name, f.slug as fest_slug, ${SEAT_SUBQUERY} as seats_taken
    from events e
    join fests f on f.id = e.fest_id
    order by e.starts_at desc
  `;
}

export async function listAllFestsForAdmin(): Promise<FestCard[]> {
  return sql<FestCard[]>`
    select f.*,
      (select count(*) from events e where e.fest_id = f.id)::int as event_count,
      (select count(*) from registrations r
         join events e2 on e2.id = r.event_id
        where e2.fest_id = f.id)::int as registration_count
    from fests f
    order by f.start_date desc
  `;
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const rows = await sql<{ role: UserRole }[]>`select role from users where id = ${userId} limit 1`;
  return rows[0]?.role ?? null;
}
