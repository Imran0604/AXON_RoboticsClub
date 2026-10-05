"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Mobile navigation drawer. Closes on route change and on Escape, and locks
 * body scroll while open so the page behind can't be scrolled away.
 */
export function MobileMenu({ links, children }: { links: NavLink[]; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-sm md:hidden"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {open ? <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /> : <path d="M2 4.5h12M2 8h12M2 11.5h12" />}
        </svg>
      </button>

      {open && (
        <div className="fixed inset-x-0 top-[57px] bottom-0 z-40 overflow-y-auto border-t border-line bg-bg px-5 py-5 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-sm px-3 py-2.5 text-[0.9375rem] font-medium transition-colors"
                  style={{
                    background: active ? "var(--navy-soft)" : "transparent",
                    color: active ? "var(--navy)" : "var(--ink)",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5">{children}</div>
        </div>
      )}
    </>
  );
}
