"use client";

import { useEffect, useState } from "react";

/**
 * Types a rotating set of phrases beneath a fixed lead-in.
 *
 * The lead and the typed phrase sit on their own lines, and the phrase line is
 * nowrap. An earlier version kept them inline, which meant a long phrase could
 * push past the container and wrap mid-sentence — the line would reflow as it
 * typed, which looks broken. Splitting them means the typed line is always
 * exactly one line and its height never changes, so nothing below it shifts.
 *
 * prefers-reduced-motion gets the first phrase in full with no animation, and
 * the live region is polite so a screen reader announces the settled phrase
 * rather than every keystroke.
 */
export function Typewriter({
  lead,
  phrases,
  typeMs = 38,
  deleteMs = 18,
  holdMs = 2100,
}: {
  lead: string;
  phrases: string[];
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
}) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) {
      setText(phrases[0]);
      return;
    }
    const current = phrases[index % phrases.length];

    if (!deleting && text === current) {
      const t = setTimeout(() => setDeleting(true), holdMs);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const t = setTimeout(
      () =>
        setText((prev) =>
          deleting ? current.slice(0, prev.length - 1) : current.slice(0, prev.length + 1)
        ),
      deleting ? deleteMs : typeMs
    );
    return () => clearTimeout(t);
  }, [text, deleting, index, phrases, reduced, typeMs, deleteMs, holdMs]);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[0.9375rem] leading-snug text-ink-2 sm:text-[1rem]">{lead}</p>

      {/* One line, always. Clamped font sizes keep the longest phrase inside
          even the narrowest phone without wrapping or overflowing. */}
      <p
        className="min-h-[1.6em] whitespace-nowrap text-[clamp(0.9375rem,3.6vw,1.3125rem)] font-semibold leading-snug text-ink"
        aria-live="polite"
      >
        {text}
        {!reduced && (
          <span
            className="ml-[3px] inline-block w-[2px] translate-y-[3px] align-baseline"
            style={{ height: "1.05em", background: "var(--brand)", animation: "caret 1s steps(1) infinite" }}
            aria-hidden="true"
          />
        )}
      </p>
    </div>
  );
}
