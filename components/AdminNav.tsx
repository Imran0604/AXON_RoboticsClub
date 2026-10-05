"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/registrations", label: "Participants" },
  { href: "/admin/events", label: "Events & forms" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/scan", label: "Check-in scanner" },
  { href: "/admin/activity", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="table-scroll -mx-1" aria-label="Admin sections">
      <div className="flex min-w-max gap-1 px-1">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className="whitespace-nowrap rounded-sm px-3 py-2 text-[0.8125rem] font-semibold transition-colors"
              style={{
                background: active ? "var(--navy)" : "var(--surface)",
                color: active ? "var(--on-navy)" : "var(--ink-2)",
                border: `1px solid ${active ? "var(--navy)" : "var(--line)"}`,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
