import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/AuthForms";
import { DemoLogins } from "@/components/DemoLogins";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create an AXON Robotics Club account to register for events.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const user = await getSession();
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (user) redirect(next);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-12 lg:grid-cols-[1fr_20rem] lg:py-16">
      <div>
        <Logo size={38} />
        <h1 className="mt-5 text-[1.875rem] font-extrabold leading-tight">Create your account</h1>
        <p className="mt-2.5 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
          Takes about twenty seconds. There is no confirmation email to wait for — you are signed in
          as soon as you submit.
        </p>

        <div className="mt-7 max-w-lg">
          <SignupForm next={next} />
        </div>
      </div>

      <div className="lg:pt-24">
        <DemoLogins />
      </div>
    </div>
  );
}
