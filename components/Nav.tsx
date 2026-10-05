import Link from "next/link";
import { getSession, isStaff } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileMenu, type NavLink } from "@/components/MobileMenu";
import { NavLinks } from "@/components/NavLinks";

export async function Nav() {
  const user = await getSession();
  const staff = isStaff(user?.role);

  const links: NavLink[] = [
    { href: "/fests", label: "Fests" },
    { href: "/events", label: "Events" },
    ...(user ? [{ href: "/me/registrations", label: "My registrations" }] : []),
    ...(staff ? [{ href: "/admin", label: "Mission Control" }] : []),
    { href: "/judge", label: "Reviewer guide" },
  ];

  const authControls = user ? (
    <>
      <div className="flex min-w-0 flex-col md:hidden">
        <span className="truncate text-sm font-semibold text-ink">{user.name}</span>
        <span className="eyebrow truncate">{user.role}</span>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="btn btn-ghost btn-sm w-full md:w-auto">
          Sign out
        </button>
      </form>
    </>
  ) : (
    <>
      <Link href="/login" className="btn btn-ghost btn-sm w-full md:w-auto">
        Sign in
      </Link>
      <Link href="/signup" className="btn btn-primary btn-sm w-full md:w-auto">
        Create account
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[84rem] items-center gap-4 px-5">
        <Link href="/" className="shrink-0" aria-label="AXON Robotics Club home">
          <Wordmark />
        </Link>

        <NavLinks links={links} />

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {user && (
              <div className="mr-1 hidden flex-col items-end lg:flex">
                <span className="max-w-[12rem] truncate text-[0.8125rem] font-semibold leading-tight text-ink">
                  {user.name}
                </span>
                <span className="eyebrow leading-tight">{user.role}</span>
              </div>
            )}
            {authControls}
          </div>
          <MobileMenu links={links}>{authControls}</MobileMenu>
        </div>
      </div>
    </header>
  );
}
