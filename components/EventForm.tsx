"use client";

import { useActionState } from "react";
import { createEventAction, updateEventAction, type EventFormState } from "@/app/actions/admin";
import { CATEGORIES } from "@/lib/types";

const EMPTY: EventFormState = {};

export interface EventFormValues {
  id?: string;
  fest_id: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  capacity: string;
  registration_deadline: string;
  fee_bdt: string;
  team_min: string;
  team_max: string;
  prize: string;
  rules: string;
  status: string;
}

/**
 * Event editor, used for both creating and updating.
 *
 * All datetime fields are entered and displayed in Asia/Dhaka — the server
 * action anchors the naive datetime-local value to that zone, so what an
 * organiser types is what participants see.
 */
export function EventForm({
  mode,
  fests,
  values,
}: {
  mode: "create" | "edit";
  fests: { id: string; name: string }[];
  values: EventFormValues;
}) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createEventAction : updateEventAction,
    EMPTY
  );

  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="flex flex-col gap-6">
      {values.id && <input type="hidden" name="event_id" value={values.id} />}

      {state.error && (
        <div
          role="alert"
          className="rounded-sm border px-3.5 py-3 text-[0.875rem] font-medium"
          style={{ background: "var(--crit-soft)", borderColor: "var(--crit)", color: "var(--crit)" }}
        >
          {state.error}
        </div>
      )}

      {state.ok && mode === "edit" && (
        <div
          role="status"
          className="rounded-sm border px-3.5 py-3 text-[0.875rem] font-medium"
          style={{ background: "var(--ok-soft)", borderColor: "var(--ok)", color: "var(--ok)" }}
        >
          Changes saved.
        </div>
      )}

      {state.ok && mode === "create" && (
        <div
          role="status"
          className="rounded-sm border px-3.5 py-3 text-[0.875rem]"
          style={{ background: "var(--ok-soft)", borderColor: "var(--ok)", color: "var(--ok)" }}
        >
          <strong className="font-semibold">Event created.</strong> It starts with three default
          questions —{" "}
          <a href={`/events/${state.ok}`} className="underline">
            view it on the public site
          </a>
          , or open it from the events list to build out its form.
        </div>
      )}

      {/* -------------------------------------------------------- basics */}
      <section className="flex flex-col gap-4">
        <h3 className="text-[1rem] font-extrabold">Basics</h3>

        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div>
            <label htmlFor="ef-title" className="label">
              Title
            </label>
            <input
              id="ef-title"
              name="title"
              type="text"
              required
              defaultValue={values.title}
              className="field"
              aria-invalid={err("title") ? "true" : undefined}
            />
            {err("title") && <p className="err">{err("title")}</p>}
          </div>

          <div>
            <label htmlFor="ef-status" className="label">
              Visibility
            </label>
            <select id="ef-status" name="status" defaultValue={values.status} className="field">
              <option value="draft">Draft — hidden</option>
              <option value="published">Published — public</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ef-fest" className="label">
              Fest
            </label>
            <select
              id="ef-fest"
              name="fest_id"
              defaultValue={values.fest_id}
              required
              className="field"
              aria-invalid={err("fest_id") ? "true" : undefined}
            >
              <option value="">Choose a fest…</option>
              {fests.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {err("fest_id") && <p className="err">{err("fest_id")}</p>}
          </div>

          <div>
            <label htmlFor="ef-category" className="label">
              Category
            </label>
            <select id="ef-category" name="category" defaultValue={values.category} required className="field">
              <option value="">Choose a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {err("category") && <p className="err">{err("category")}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="ef-summary" className="label">
            One-line summary
          </label>
          <input
            id="ef-summary"
            name="summary"
            type="text"
            maxLength={300}
            defaultValue={values.summary}
            className="field"
            placeholder="Shown on event cards in the directory"
          />
        </div>

        <div>
          <label htmlFor="ef-description" className="label">
            Full description
          </label>
          <textarea
            id="ef-description"
            name="description"
            rows={6}
            defaultValue={values.description}
            className="field"
            placeholder="Separate paragraphs with a blank line."
          />
        </div>
      </section>

      {/* ------------------------------------------------- when and where */}
      <section className="flex flex-col gap-4 border-t border-line pt-6">
        <div>
          <h3 className="text-[1rem] font-extrabold">When and where</h3>
          <p className="mt-1 text-[0.75rem] text-ink-3">All times are Bangladesh Standard Time.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ef-starts" className="label">
              Starts
            </label>
            <input
              id="ef-starts"
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={values.starts_at}
              className="field"
              aria-invalid={err("starts_at") ? "true" : undefined}
            />
            {err("starts_at") && <p className="err">{err("starts_at")}</p>}
          </div>

          <div>
            <label htmlFor="ef-ends" className="label">
              Ends <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input
              id="ef-ends"
              name="ends_at"
              type="datetime-local"
              defaultValue={values.ends_at}
              className="field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ef-venue" className="label">
            Venue
          </label>
          <input id="ef-venue" name="venue" type="text" defaultValue={values.venue} className="field" />
        </div>
      </section>

      {/* ------------------------------------------------------ enrolment */}
      <section className="flex flex-col gap-4 border-t border-line pt-6">
        <h3 className="text-[1rem] font-extrabold">Enrolment rules</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ef-capacity" className="label">
              Capacity <span className="font-normal text-ink-3">(blank = unlimited)</span>
            </label>
            <input
              id="ef-capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={values.capacity}
              className="field"
              aria-invalid={err("capacity") ? "true" : undefined}
            />
            {err("capacity") ? (
              <p className="err">{err("capacity")}</p>
            ) : (
              <p className="help">Once full, new entries become waitlist places.</p>
            )}
          </div>

          <div>
            <label htmlFor="ef-deadline" className="label">
              Registration deadline
            </label>
            <input
              id="ef-deadline"
              name="registration_deadline"
              type="datetime-local"
              defaultValue={values.registration_deadline}
              className="field"
            />
            <p className="help">Enforced on the server, not just in the browser.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ef-fee" className="label">
              Fee (BDT)
            </label>
            <input
              id="ef-fee"
              name="fee_bdt"
              type="number"
              min={0}
              defaultValue={values.fee_bdt}
              className="field"
            />
            {err("fee_bdt") && <p className="err">{err("fee_bdt")}</p>}
          </div>
          <div>
            <label htmlFor="ef-tmin" className="label">
              Min team size
            </label>
            <input
              id="ef-tmin"
              name="team_min"
              type="number"
              min={1}
              defaultValue={values.team_min}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="ef-tmax" className="label">
              Max team size
            </label>
            <input
              id="ef-tmax"
              name="team_max"
              type="number"
              min={1}
              defaultValue={values.team_max}
              className="field"
              aria-invalid={err("team_max") ? "true" : undefined}
            />
            {err("team_max") && <p className="err">{err("team_max")}</p>}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- rules and prize */}
      <section className="flex flex-col gap-4 border-t border-line pt-6">
        <h3 className="text-[1rem] font-extrabold">Rules and prize</h3>

        <div>
          <label htmlFor="ef-prize" className="label">
            Prize <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input id="ef-prize" name="prize" type="text" defaultValue={values.prize} className="field" />
        </div>

        <div>
          <label htmlFor="ef-rules" className="label">
            Rules <span className="font-normal text-ink-3">(one per line)</span>
          </label>
          <textarea
            id="ef-rules"
            name="rules"
            rows={6}
            defaultValue={values.rules}
            className="field"
            placeholder={"Maximum footprint 25cm x 25cm.\nFully autonomous operation."}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2.5 border-t border-line pt-6">
        <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create event" : "Save changes"}
        </button>
        <a href="/admin/events" className="btn btn-ghost btn-lg">
          Back to events
        </a>
      </div>
    </form>
  );
}
