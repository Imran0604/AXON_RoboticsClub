"use client";

import { useActionState, useState } from "react";
import { registerAction, type RegisterState } from "@/app/actions/registration";
import type { FormField } from "@/lib/types";

const EMPTY: RegisterState = {};

/**
 * Renders a registration form from organiser-defined field definitions.
 *
 * Nothing about the markup here knows what a line-follower robot or a quiz
 * team is — it only knows field types. That indirection is the whole point:
 * organisers change the questions in the form builder and this renders them,
 * which is what removes the need for an external form service.
 */
export function DynamicForm({
  eventId,
  eventSlug,
  fields,
  teamMin,
  teamMax,
  isWaitlist,
  defaults,
}: {
  eventId: string;
  eventSlug: string;
  fields: FormField[];
  teamMin: number;
  teamMax: number;
  isWaitlist: boolean;
  defaults: { name: string; email: string; institution: string | null };
}) {
  const [state, action, pending] = useActionState(registerAction, EMPTY);

  // Team mates in addition to the person registering, hence teamMax - 1.
  const maxMates = Math.max(0, teamMax - 1);
  const minMates = Math.max(0, teamMin - 1);
  const [mates, setMates] = useState<number>(minMates);

  function prefill(field: FormField): string | undefined {
    if (field.field_key === "full_name") return defaults.name;
    if (field.field_key === "institution") return defaults.institution ?? undefined;
    if (field.type === "email") return defaults.email;
    return undefined;
  }

  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="event_slug" value={eventSlug} />

      {state.error && (
        <div
          role="alert"
          className="rounded-sm border px-3.5 py-3 text-[0.875rem] font-medium"
          style={{ background: "var(--crit-soft)", borderColor: "var(--crit)", color: "var(--crit)" }}
        >
          {state.error}
        </div>
      )}

      {/* ---------------------------------------------- organiser's questions */}
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-[1.0625rem] font-extrabold">Your details</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-2">
            {fields.length} questions set by the organisers for this event.
          </p>
        </div>

        {fields.map((f) => (
          <Field key={f.id} field={f} error={state.fieldErrors?.[f.field_key]} prefill={prefill(f)} />
        ))}
      </section>

      {/* ------------------------------------------------------------- team */}
      {maxMates > 0 && (
        <section className="flex flex-col gap-4 border-t border-line pt-6">
          <div>
            <h2 className="text-[1.0625rem] font-extrabold">Your team</h2>
            <p className="mt-1 text-[0.8125rem] text-ink-2">
              {teamMin > 1
                ? `This event requires ${teamMin} to ${teamMax} people including you.`
                : `You can enter alone or bring up to ${maxMates} team ${maxMates === 1 ? "mate" : "mates"}.`}
            </p>
          </div>

          <div>
            <label htmlFor="team_name" className="label">
              Team name {teamMin > 1 ? "" : <span className="font-normal text-ink-3">(optional)</span>}
            </label>
            <input
              id="team_name"
              name="team_name"
              type="text"
              className="field max-w-md"
              placeholder="Circuit Breakers"
            />
          </div>

          <div className="flex flex-col gap-3">
            {Array.from({ length: mates }, (_, i) => (
              <div key={i} className="card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor={`member_name_${i}`} className="label">
                    Team mate {i + 1} — name
                  </label>
                  <input
                    id={`member_name_${i}`}
                    name="member_name"
                    type="text"
                    className="field"
                    placeholder="Full name"
                    required={i < minMates}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor={`member_inst_${i}`} className="label">
                    Institution
                  </label>
                  <input
                    id={`member_inst_${i}`}
                    name="member_institution"
                    type="text"
                    className="field"
                    placeholder="School or university"
                  />
                </div>
                {i >= minMates && (
                  <button
                    type="button"
                    onClick={() => setMates((n) => n - 1)}
                    className="btn btn-quiet btn-sm shrink-0"
                    aria-label={`Remove team mate ${i + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {mates < maxMates && (
              <button
                type="button"
                onClick={() => setMates((n) => n + 1)}
                className="btn btn-ghost btn-sm self-start"
              >
                + Add team mate ({mates}/{maxMates})
              </button>
            )}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- submit */}
      <div className="flex flex-col gap-3 border-t border-line pt-6">
        {isWaitlist && (
          <div
            className="rounded-sm border px-3.5 py-3 text-[0.8125rem]"
            style={{ background: "var(--warn-soft)", borderColor: "var(--warn)", color: "var(--warn)" }}
          >
            <strong className="font-semibold">This event is full.</strong> Submitting adds you to the
            waitlist. If anyone cancels, the first person in the queue is promoted automatically and
            keeps their place in line until then.
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg self-start" disabled={pending}>
          {pending ? "Submitting…" : isWaitlist ? "Join the waitlist" : "Complete registration"}
        </button>

        <p className="text-[0.75rem] leading-relaxed text-ink-3">
          Submitting creates your registration and issues a ticket code with a QR pass. You can view
          or cancel it any time from My registrations.
        </p>
      </div>
    </form>
  );
}

function Field({
  field,
  error,
  prefill,
}: {
  field: FormField;
  error?: string;
  prefill?: string;
}) {
  const id = `f_${field.field_key}`;
  const name = `f_${field.field_key}`;
  const described = [field.help_text ? `${id}-help` : null, error ? `${id}-err` : null]
    .filter(Boolean)
    .join(" ");

  const label = (
    <label htmlFor={id} className="label">
      {field.label}
      {field.required ? (
        <span style={{ color: "var(--crit)" }} aria-hidden="true">
          {" "}
          *
        </span>
      ) : (
        <span className="font-normal text-ink-3"> (optional)</span>
      )}
    </label>
  );

  const common = {
    id,
    name,
    required: field.required,
    "aria-invalid": error ? ("true" as const) : undefined,
    "aria-describedby": described || undefined,
    defaultValue: prefill,
    placeholder: field.placeholder ?? undefined,
  };

  let control: React.ReactNode;

  switch (field.type) {
    case "textarea":
      control = <textarea {...common} rows={4} className="field max-w-xl" />;
      break;

    case "select":
      control = (
        <select {...common} className="field max-w-md" defaultValue={prefill ?? ""}>
          <option value="">Choose…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;

    case "radio":
      control = (
        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby={`${id}-label`}>
          {field.options.map((o, i) => (
            <label key={o} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="radio"
                name={name}
                value={o}
                required={field.required && i === 0}
                className="check"
              />
              <span className="text-[0.875rem]">{o}</span>
            </label>
          ))}
        </div>
      );
      break;

    case "checkbox":
      control =
        field.options.length > 0 ? (
          <div className="flex flex-col gap-2">
            {field.options.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" name={name} value={o} className="check" />
                <span className="text-[0.875rem]">{o}</span>
              </label>
            ))}
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" name={name} value="Yes" required={field.required} className="check" />
            <span className="text-[0.875rem]">{field.placeholder ?? "Yes"}</span>
          </label>
        );
      break;

    case "number":
      control = <input {...common} type="number" className="field max-w-xs" />;
      break;

    case "email":
      control = <input {...common} type="email" autoComplete="email" className="field max-w-md" />;
      break;

    case "phone":
      control = <input {...common} type="tel" autoComplete="tel" className="field max-w-md" />;
      break;

    case "url":
      control = <input {...common} type="url" className="field max-w-md" />;
      break;

    default:
      control = <input {...common} type="text" className="field max-w-md" />;
  }

  const needsGroupLabel = field.type === "radio" || field.type === "checkbox";

  return (
    <div>
      {needsGroupLabel ? (
        <p id={`${id}-label`} className="label">
          {field.label}
          {field.required ? (
            <span style={{ color: "var(--crit)" }} aria-hidden="true">
              {" "}
              *
            </span>
          ) : (
            <span className="font-normal text-ink-3"> (optional)</span>
          )}
        </p>
      ) : (
        label
      )}
      {control}
      {field.help_text && (
        <p id={`${id}-help`} className="help">
          {field.help_text}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
