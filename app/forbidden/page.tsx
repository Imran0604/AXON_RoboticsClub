import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Not permitted",
  robots: { index: false, follow: false },
};

export default async function ForbiddenPage() {
  const user = await getSession();

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-20">
      <div className="card flex flex-col gap-4 p-7">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--warn)" strokeWidth="1.7" aria-hidden="true">
          <rect x="4" y="10.5" width="16" height="10" rx="2" />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" strokeLinecap="round" />
        </svg>

        <h1 className="text-[1.375rem] font-extrabold">You don&apos;t have access to this area</h1>

        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          {user ? (
            <>
              You&apos;re signed in as <strong className="text-ink">{user.name}</strong>, which is a{" "}
              <strong className="text-ink">{user.role}</strong> account. Mission Control is limited to
              organiser and admin accounts.
            </>
          ) : (
            "Sign in with an organiser or admin account to reach Mission Control."
          )}
        </p>

        <div
          className="rounded-sm border px-3.5 py-3 text-[0.8125rem] leading-relaxed"
          style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}
        >
          <strong className="font-semibold text-ink">Evaluating the project?</strong> Use the
          one-click <em>Enter as Organizer</em> or <em>Enter as Admin</em> button on the sign-in page
          — no credentials to type.
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/login" className="btn btn-primary">
            Switch account
          </Link>
          <Link href="/" className="btn btn-ghost">
            Back to the public site
          </Link>
        </div>
      </div>
    </div>
  );
}
