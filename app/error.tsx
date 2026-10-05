"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the hosting platform's logs; the digest ties a user report
    // to a specific server-side failure.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-20">
      <div className="card flex flex-col gap-4 p-7">
        <p className="eyebrow">Something broke</p>
        <h1 className="text-[1.625rem] font-extrabold">That didn&apos;t work</h1>
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          An unexpected error stopped this page from loading. Trying again often fixes it; if not,
          the home page is a safe place to restart from.
        </p>
        {error.digest && (
          <p className="mono text-[0.6875rem] text-ink-3">Reference: {error.digest}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
