import { demoLoginAction } from "@/app/actions/auth";

/**
 * One-click role logins.
 *
 * The single most valuable thing on the sign-in page for an evaluator: no
 * credential to type, no email to verify, no way to fail. The written
 * credentials are still in the README because the rulebook asks for them.
 */

const ROLES: { role: string; label: string; email: string; blurb: string; tone: string }[] = [
  {
    role: "participant",
    label: "Enter as Participant",
    email: "student@axon.club",
    blurb: "Browse, register, manage tickets",
    tone: "btn-ghost",
  },
  {
    role: "organizer",
    label: "Enter as Organizer",
    email: "organizer@axon.club",
    blurb: "Mission Control, participants, form builder",
    tone: "btn-primary",
  },
  {
    role: "admin",
    label: "Enter as Admin",
    email: "admin@axon.club",
    blurb: "Everything, plus the audit log",
    tone: "btn-ghost",
  },
];

export function DemoLogins() {
  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-center gap-2 border-b border-line px-4 py-3"
        style={{ background: "var(--brass-soft)" }}
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="var(--brass)" strokeWidth="1.6" aria-hidden="true">
          <path d="M8 1.5l2 4.4 4.5.5-3.4 3 1 4.6L8 11.7 3.9 14l1-4.6-3.4-3 4.5-.5L8 1.5Z" strokeLinejoin="round" />
        </svg>
        <div>
          <p className="text-[0.8125rem] font-bold text-ink">Judges &amp; reviewers — start here</p>
          <p className="text-[0.75rem] leading-snug text-ink-2">
            One click signs you in. Nothing to type.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {ROLES.map((r) => (
          <form key={r.role} action={demoLoginAction}>
            <input type="hidden" name="role" value={r.role} />
            <button type="submit" className={`btn ${r.tone} w-full justify-between`}>
              <span>{r.label}</span>
              <span className="mono text-[0.625rem] font-normal opacity-70">{r.email}</span>
            </button>
            <p className="mt-1 px-1 text-[0.6875rem] text-ink-3">{r.blurb}</p>
          </form>
        ))}

        <p className="mt-1 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-3">
          Password for all three accounts is{" "}
          <code className="mono" style={{ fontSize: "0.6875rem" }}>
            axon1234
          </code>{" "}
          if you would rather sign in manually. All sample data is fictional.
        </p>
      </div>
    </div>
  );
}
