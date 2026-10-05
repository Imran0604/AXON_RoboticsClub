"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

/**
 * Three-state theme control. "System" is the default and stamps nothing on
 * <html>, so the page follows prefers-color-scheme; an explicit choice stamps
 * data-theme, which the CSS treats as the winner in both directions.
 *
 * The matching no-flash script lives in app/layout.tsx — it must run before
 * first paint, which a React component cannot do.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("axon-theme") as Mode | null;
      if (stored === "light" || stored === "dark" || stored === "system") setMode(stored);
    } catch {
      // Private browsing or blocked storage — "system" is a correct fallback.
    }
    setReady(true);
  }, []);

  function apply(next: Mode) {
    setMode(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("axon-theme", next);
    } catch {
      // Not persisting is acceptable; the choice still applies for this visit.
    }
  }

  const options: { value: Mode; label: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Light theme",
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="8" cy="8" r="3.2" />
          <path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M3 3l1.3 1.3M11.7 11.7L13 13M13 3l-1.3 1.3M4.3 11.7L3 13" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      value: "system",
      label: "Match system theme",
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" />
          <path d="M5.5 14h5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      value: "dark",
      label: "Dark theme",
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M13.5 9.6A5.8 5.8 0 1 1 6.4 2.5a4.6 4.6 0 0 0 7.1 7.1Z" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="flex items-center gap-0.5 rounded-sm border border-line bg-surface p-0.5"
      role="radiogroup"
      aria-label="Colour theme"
    >
      {options.map((o) => {
        const active = ready && mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => apply(o.value)}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] transition-colors"
            style={{
              background: active ? "var(--navy)" : "transparent",
              color: active ? "var(--on-navy)" : "var(--ink-3)",
            }}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}
