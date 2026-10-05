import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

/**
 * Every /admin route is gated here, with requireRole re-reading the role from
 * the database. Nested pages inherit the guard, so no admin page can be
 * reached by URL alone even if a link to it is hidden.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireRole(["organizer", "admin"]);

  return (
    <div className="mx-auto w-full max-w-[90rem] px-5 py-6">
      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Mission Control</p>
            <h1 className="mt-1 text-[1.5rem] font-extrabold">AXON Robotics Club</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="badge badge-accent">{staff.role}</span>
            <span className="hidden text-[0.8125rem] text-ink-2 sm:inline">{staff.name}</span>
            <Link href="/" className="btn btn-ghost btn-sm">
              View public site
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <AdminNav />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
