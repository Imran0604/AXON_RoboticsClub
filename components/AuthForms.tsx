"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type AuthState } from "@/app/actions/auth";

const EMPTY: AuthState = {};

function Submit({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
      {pending ? "Working…" : label}
    </button>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-sm border px-3 py-2.5 text-[0.8125rem] font-medium"
      style={{ background: "var(--crit-soft)", borderColor: "var(--crit)", color: "var(--crit)" }}
    >
      {message}
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />

      <div>
        <label htmlFor="email" className="label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
          placeholder="you@example.com"
          aria-invalid={state.fieldErrors?.email ? "true" : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-err" : undefined}
        />
        {state.fieldErrors?.email && (
          <p id="email-err" className="err">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          placeholder="••••••••"
          aria-invalid={state.fieldErrors?.password ? "true" : undefined}
        />
        {state.fieldErrors?.password && <p className="err">{state.fieldErrors.password}</p>}
      </div>

      <Submit label="Sign in" pending={pending} />

      <p className="text-center text-[0.8125rem] text-ink-2">
        No account yet?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:text-accent">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signupAction, EMPTY);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.error} />

      <div>
        <label htmlFor="name" className="label">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="field"
          placeholder="As it should appear on your certificate"
          aria-invalid={state.fieldErrors?.name ? "true" : undefined}
        />
        {state.fieldErrors?.name && <p className="err">{state.fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="su-email" className="label">
          Email address
        </label>
        <input
          id="su-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
          placeholder="you@example.com"
          aria-invalid={state.fieldErrors?.email ? "true" : undefined}
        />
        {state.fieldErrors?.email && <p className="err">{state.fieldErrors.email}</p>}
        <p className="help">No verification email — you are signed in immediately.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="label">
            Phone <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className="field" placeholder="+8801…" />
        </div>
        <div>
          <label htmlFor="institution" className="label">
            Institution <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input
            id="institution"
            name="institution"
            type="text"
            autoComplete="organization"
            className="field"
            placeholder="School or university"
          />
        </div>
      </div>

      <div>
        <label htmlFor="su-password" className="label">
          Password
        </label>
        <input
          id="su-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field"
          placeholder="At least 8 characters"
          aria-invalid={state.fieldErrors?.password ? "true" : undefined}
        />
        {state.fieldErrors?.password && <p className="err">{state.fieldErrors.password}</p>}
      </div>

      <Submit label="Create account" pending={pending} />

      <p className="text-center text-[0.8125rem] text-ink-2">
        Already registered?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:text-accent">
          Sign in
        </Link>
      </p>
    </form>
  );
}
