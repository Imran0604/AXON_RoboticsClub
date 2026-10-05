"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/components/MobileMenu";

/** Desktop navigation. Client-side only so the active link can be highlighted. */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
      {links.map((l) => {
        const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className="relative rounded-sm px-2.5 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors"
            style={{ color: active ? "var(--ink)" : "var(--ink-3)" }}
          >
            {l.label}
            {active && (
              <span
                className="absolute inset-x-2.5 -bottom-[11px] h-[2px] rounded-full"
                style={{ background: "var(--brass)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
