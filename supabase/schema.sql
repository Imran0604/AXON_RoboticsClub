-- ============================================================================
-- AXON Robotics Club — Smart Club Operations Platform
-- Schema for PostgreSQL / Supabase
--
-- Run this file FIRST in the Supabase SQL Editor, then run seed.sql.
-- Safe to re-run: it drops and recreates everything.
-- ============================================================================

drop table if exists audit_log cascade;
drop table if exists registrations cascade;
drop table if exists event_form_fields cascade;
drop table if exists events cascade;
drop table if exists fests cascade;
drop table if exists organizations cascade;
drop table if exists users cascade;

drop type if exists user_role cascade;
drop type if exists fest_status cascade;
drop type if exists event_status cascade;
drop type if exists reg_status cascade;
drop type if exists field_type cascade;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
create type user_role    as enum ('participant', 'organizer', 'admin');
create type fest_status  as enum ('draft', 'published');
create type event_status as enum ('draft', 'published', 'cancelled');
create type reg_status   as enum ('pending', 'confirmed', 'waitlisted', 'rejected', 'cancelled', 'checked_in');
create type field_type   as enum ('text', 'textarea', 'email', 'phone', 'number', 'select', 'radio', 'checkbox', 'url');

-- ---------------------------------------------------------------------------
-- users — authentication identity + profile
-- Passwords are bcrypt hashes. Roles gate every privileged action server-side.
-- ---------------------------------------------------------------------------
create table users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  phone         text,
  institution   text,
  password_hash text not null,
  role          user_role not null default 'participant',
  created_at    timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));
create index users_role_idx on users (role);

-- ---------------------------------------------------------------------------
-- organizations — the club itself. One row in this build, but the schema
-- supports many so the platform is genuinely multi-tenant.
-- ---------------------------------------------------------------------------
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  tagline    text,
  about      text,
  website    text,
  email      text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- fests — an organization hosts many fests
-- Status is derived from dates at read time, never stored, so it cannot drift.
-- ---------------------------------------------------------------------------
create table fests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  name        text not null,
  slug        text not null unique,
  tagline     text,
  description text,
  start_date  date not null,
  end_date    date not null,
  venue       text,
  art_seed    int not null default 1,
  status      fest_status not null default 'published',
  created_at  timestamptz not null default now(),
  constraint fests_dates_valid check (end_date >= start_date)
);
create index fests_org_idx on fests (org_id);
create index fests_dates_idx on fests (start_date, end_date);

-- ---------------------------------------------------------------------------
-- events — a fest contains many events; registration happens here
-- ---------------------------------------------------------------------------
create table events (
  id                    uuid primary key default gen_random_uuid(),
  fest_id               uuid not null references fests (id) on delete cascade,
  title                 text not null,
  slug                  text not null unique,
  category              text not null,
  summary               text,
  description           text,
  starts_at             timestamptz not null,
  ends_at               timestamptz,
  venue                 text,
  capacity              int,
  registration_deadline timestamptz,
  fee_bdt               int not null default 0,
  team_min              int not null default 1,
  team_max              int not null default 1,
  prize                 text,
  rules                 text,
  art_seed              int not null default 1,
  status                event_status not null default 'published',
  created_at            timestamptz not null default now(),
  constraint events_team_valid     check (team_max >= team_min and team_min >= 1),
  constraint events_capacity_valid check (capacity is null or capacity > 0),
  constraint events_fee_valid      check (fee_bdt >= 0)
);
create index events_fest_idx     on events (fest_id);
create index events_category_idx on events (category);
create index events_starts_idx   on events (starts_at);

-- ---------------------------------------------------------------------------
-- event_form_fields — the form builder.
-- This is what replaces Google Forms: organizers compose the registration
-- form per event, and the UI renders whatever is defined here.
-- ---------------------------------------------------------------------------
create table event_form_fields (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events (id) on delete cascade,
  label       text not null,
  field_key   text not null,
  type        field_type not null default 'text',
  placeholder text,
  help_text   text,
  required    boolean not null default false,
  options     jsonb not null default '[]'::jsonb,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  unique (event_id, field_key)
);
create index eff_event_idx on event_form_fields (event_id, position);

-- ---------------------------------------------------------------------------
-- registrations — one row per (event, user). The unique constraint is the
-- real duplicate-registration guard; the UI check is only for the message.
-- ---------------------------------------------------------------------------
create table registrations (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references events (id) on delete cascade,
  user_id           uuid not null references users (id) on delete cascade,
  status            reg_status not null default 'confirmed',
  ticket_code       text not null unique,
  team_name         text,
  team_members      jsonb not null default '[]'::jsonb,
  answers           jsonb not null default '{}'::jsonb,
  waitlist_position int,
  checked_in_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (event_id, user_id)
);
create index reg_event_idx   on registrations (event_id);
create index reg_user_idx    on registrations (user_id);
create index reg_status_idx  on registrations (status);
create index reg_created_idx on registrations (created_at);

-- ---------------------------------------------------------------------------
-- audit_log — every privileged mutation, with actor and timestamp
-- ---------------------------------------------------------------------------
create table audit_log (
  id         bigserial primary key,
  actor_id   uuid references users (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_created_idx on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- seats_taken(event) — the single source of truth for capacity.
-- Counts only registrations that actually occupy a seat, so cancelled and
-- rejected entries free their place up again.
-- ---------------------------------------------------------------------------
create or replace function seats_taken(p_event_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from registrations
  where event_id = p_event_id
    and status in ('pending', 'confirmed', 'checked_in');
$$;

-- Keep updated_at honest without the application having to remember.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger registrations_touch
  before update on registrations
  for each row execute function touch_updated_at();
