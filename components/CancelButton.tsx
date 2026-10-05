"use client";

import { useState } from "react";
import { cancelRegistrationAction } from "@/app/actions/registration";

/**
 * Cancellation needs a deliberate second step — it frees a seat and may
 * promote someone off the waitlist, so it should not be one stray click.
 */
export function CancelButton({ registrationId, eventTitle }: { registrationId: string; eventTitle: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn btn-quiet btn-sm">
        Cancel
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-sm border p-3"
      style={{ background: "var(--crit-soft)", borderColor: "var(--crit)" }}
      role="alertdialog"
      aria-label={`Confirm cancelling ${eventTitle}`}
    >
      <p className="text-[0.8125rem] font-medium" style={{ color: "var(--crit)" }}>
        Cancel your place in {eventTitle}? Your seat is released immediately and may be given to
        someone on the waitlist.
      </p>
      <div className="flex gap-2">
        <form action={cancelRegistrationAction}>
          <input type="hidden" name="registration_id" value={registrationId} />
          <button type="submit" className="btn btn-danger btn-sm">
            Yes, cancel it
          </button>
        </form>
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">
          Keep my place
        </button>
      </div>
    </div>
  );
}
