"use client";

import { useEffect, useState } from "react";

type Mode = "dark" | "light";

/**
 * Two-state theme control.
 *
 * This is a deliberately dark design, so dark is the default for everyone
 * rather than something inferred from the operating system — only an explicit
 * choice of light stamps data-theme="light" on the root. The matching no-flash
 * script lives in app/layout.tsx; it has to run before first paint, which a
 * React component cannot do.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    try {
      setMode(localStorage.getItem("axon-theme") === "light" ? "light" : "dark");
    } catch {
      // Blocked storage — dark is the correct fallback.
    }
  }, []);

  function apply(next: Mode) {
    setMode(next);
    const root = document.documentElement;
    if (next === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    try {
      localStorage.setItem("axon-theme", next);
    } catch {
      // Not persisting is fine; the choice still applies for this visit.
    }
  }

  const isLight = mode === "light";

  return (
    <button
      type="button"
      onClick={() => apply(isLight ? "dark" : "light")}
      className="flex h-7 w-7 items-center justify-center rounded-sm border border-line bg-surface text-ink-3 transition-colors hover:border-line-2 hover:text-ink"
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
    >
      {isLight ? (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M13.5 9.6A5.8 5.8 0 1 1 6.4 2.5a4.6 4.6 0 0 0 7.1 7.1Z" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" />
          <path
            d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M3 3l1.3 1.3M11.7 11.7L13 13M13 3l-1.3 1.3M4.3 11.7L3 13"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
