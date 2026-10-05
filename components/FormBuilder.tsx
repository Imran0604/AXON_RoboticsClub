import { addFieldAction, deleteFieldAction, moveFieldAction } from "@/app/actions/admin";
import type { FormField } from "@/lib/types";

/**
 * The registration form builder.
 *
 * This is what replaces Google Forms: an organiser composes the questions for
 * one event here, and the participant-facing form renders whatever is defined.
 *
 * Reordering uses up/down buttons rather than drag-and-drop on purpose —
 * dragging is unusable on a phone, and admin tooling has to work on a phone.
 * Each control is a plain form posting to a server action, so the builder
 * works with JavaScript disabled too.
 */

const TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Dropdown",
  radio: "Single choice",
  checkbox: "Checkboxes",
  url: "URL",
};

const NEEDS_OPTIONS = ["select", "radio", "checkbox"];

export function FormBuilder({ eventId, fields }: { eventId: string; fields: FormField[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-[1rem] font-extrabold">Registration form</h3>
        <p className="mt-1 text-[0.8125rem] text-ink-2">
          {fields.length} {fields.length === 1 ? "question" : "questions"},{" "}
          {fields.filter((f) => f.required).length} required. Participants see these in this order.
        </p>
      </div>

      {/* ------------------------------------------------- existing fields */}
      {fields.length === 0 ? (
        <p
          className="rounded-sm border px-3 py-2.5 text-[0.8125rem]"
          style={{ background: "var(--warn-soft)", borderColor: "var(--warn)", color: "var(--warn)" }}
        >
          This event has no questions yet, so its registration form would be empty. Add at least a
          name field below.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {fields.map((f, i) => (
            <li key={f.id} className="card flex items-start gap-3 p-3">
              <span className="mono mt-1 w-5 shrink-0 text-[0.6875rem] text-ink-3">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="badge badge-neutral">{TYPE_LABELS[f.type] ?? f.type}</span>
                  {f.required && <span className="badge badge-crit">Required</span>}
                  <code className="mono text-[0.625rem] text-ink-3">{f.field_key}</code>
                </div>

                <p className="mt-1.5 text-[0.875rem] font-semibold">{f.label}</p>

                {f.placeholder && (
                  <p className="text-[0.75rem] italic text-ink-3">Hint: {f.placeholder}</p>
                )}

                {f.options.length > 0 && (
                  <p className="mt-1 text-[0.75rem] text-ink-2">
                    <span className="text-ink-3">Options: </span>
                    {f.options.join(" · ")}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <form action={moveFieldAction}>
                  <input type="hidden" name="field_id" value={f.id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    className="btn btn-quiet btn-sm px-2"
                    disabled={i === 0}
                    aria-label={`Move "${f.label}" up`}
                  >
                    ↑
                  </button>
                </form>
                <form action={moveFieldAction}>
                  <input type="hidden" name="field_id" value={f.id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    className="btn btn-quiet btn-sm px-2"
                    disabled={i === fields.length - 1}
                    aria-label={`Move "${f.label}" down`}
                  >
                    ↓
                  </button>
                </form>
                <form action={deleteFieldAction}>
                  <input type="hidden" name="field_id" value={f.id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <button
                    type="submit"
                    className="btn btn-quiet btn-sm px-2"
                    aria-label={`Delete "${f.label}"`}
                    title="Delete this question"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* ------------------------------------------------------- add a field */}
      <form action={addFieldAction} className="card flex flex-col gap-3.5 p-4">
        <input type="hidden" name="event_id" value={eventId} />
        <h4 className="text-[0.875rem] font-extrabold">Add a question</h4>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="fb-label" className="label">
              Question label
            </label>
            <input
              id="fb-label"
              name="label"
              type="text"
              required
              maxLength={120}
              className="field"
              placeholder="e.g. Microcontroller used"
            />
            <p className="help">The key is derived from this automatically.</p>
          </div>

          <div>
            <label htmlFor="fb-type" className="label">
              Answer type
            </label>
            <select id="fb-type" name="type" className="field" defaultValue="text">
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fb-placeholder" className="label">
            Hint text <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input
            id="fb-placeholder"
            name="placeholder"
            type="text"
            maxLength={160}
            className="field"
            placeholder="Shown faintly inside the empty box"
          />
        </div>

        <div>
          <label htmlFor="fb-options" className="label">
            Options <span className="font-normal text-ink-3">(one per line)</span>
          </label>
          <textarea
            id="fb-options"
            name="options"
            rows={3}
            className="field"
            placeholder={"Arduino Uno / Nano\nESP32\nSTM32\nOther"}
          />
          <p className="help">
            Only used by {NEEDS_OPTIONS.map((t) => TYPE_LABELS[t]).join(", ")}. Ignored otherwise.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" name="required" className="check" />
          <span className="text-[0.875rem]">Participants must answer this</span>
        </label>

        <button type="submit" className="btn btn-primary self-start">
          Add question
        </button>
      </form>
    </div>
  );
}
