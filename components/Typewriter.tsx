"use client";

import { useEffect, useState } from "react";

/**
 * Types a rotating set of phrases after a fixed lead-in.
 *
 * Two things that usually go wrong with this effect, handled here: the line
 * is rendered at full height from the start so nothing below it jumps as the
 * text grows, and prefers-reduced-motion gets the first phrase in full with no
 * animation at all. The live region is polite so a screen reader announces the
 * settled phrase rather than every character.
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

  // The longest phrase reserves the line box so the layout never shifts.
  const longest = phrases.reduce((a, b) => (a.length >= b.length ? a : b), "");

  return (
    <p className="text-[1.0625rem] leading-relaxed text-ink-2 sm:text-[1.125rem]">
      {lead}{" "}
      <span className="relative inline-block align-top">
        {/* Invisible sizer — holds the width/height of the longest phrase. */}
        <span className="invisible block" aria-hidden="true">
          {longest}
        </span>
        <span className="absolute left-0 top-0 block text-left font-medium text-ink" aria-live="polite">
          {text}
          {!reduced && (
            <span
              className="ml-0.5 inline-block w-[2px] translate-y-[2px] align-baseline"
              style={{ height: "1.05em", background: "var(--brand)", animation: "caret 1s steps(1) infinite" }}
              aria-hidden="true"
            />
          )}
        </span>
      </span>
    </p>
  );
}
