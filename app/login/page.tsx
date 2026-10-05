import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { DemoLogins } from "@/components/DemoLogins";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to register for AXON Robotics Club events and manage your registrations.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const user = await getSession();
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (user) redirect(next);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-12 lg:grid-cols-2 lg:py-16">
      <div className="flex flex-col justify-center">
        <Logo size={38} />
        <h1 className="mt-5 text-[1.875rem] font-extrabold leading-tight">Sign in to AXON</h1>
        <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-relaxed text-ink-2">
          You need an account to register for events, because your registrations, tickets and team
          details belong to you — not to a spreadsheet.
        </p>

        <div className="mt-7 max-w-sm">
          <LoginForm next={next} />
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <DemoLogins />
      </div>
    </div>
  );
}
