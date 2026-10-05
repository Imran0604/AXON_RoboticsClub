"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Mobile navigation drawer.
 *
 * The drawer is portalled into document.body rather than rendered inline, and
 * it has to be: the header carries `backdrop-blur`, and a backdrop-filter
 * makes an element the containing block for its position-fixed descendants —
 * exactly as `transform` does. Left inside the header, the drawer's
 * `top-[57px] bottom-0` resolved against the 57px-tall header instead of the
 * viewport and collapsed to roughly 40px of padding, so the links rendered but
 * were clipped almost entirely out of sight.
 *
 * Closes on route change and on Escape, and locks body scroll while open so
 * the page behind cannot be scrolled away.
 */
export function MobileMenu({ links, children }: { links: NavLink[]; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portals need a DOM target, which only exists after hydration.
  useEffect(() => setMounted(true), []);

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

  const drawer = (
    <div
      id="mobile-menu"
      className="fixed inset-x-0 bottom-0 top-[57px] z-[80] flex flex-col overflow-y-auto border-t border-line px-5 py-5 md:hidden"
      style={{ background: "var(--bg)" }}
    >
      <nav className="flex flex-col gap-1" aria-label="Mobile">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-sm px-3 py-3 text-[0.9375rem] font-medium transition-colors"
              style={{
                background: active ? "var(--brand-soft)" : "transparent",
                color: active ? "var(--brand)" : "var(--ink)",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5">{children}</div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-sm md:hidden"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {open ? <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /> : <path d="M2 4.5h12M2 8h12M2 11.5h12" />}
        </svg>
      </button>

      {open && mounted && createPortal(drawer, document.body)}
    </>
  );
}
