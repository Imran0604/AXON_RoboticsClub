"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export interface AuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Only these accounts are exposed as one-click demo logins. */
const DEMO_ACCOUNTS: Record<string, string> = {
  admin: "admin@axon.club",
  organizer: "organizer@axon.club",
  participant: "student@axon.club",
};

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("That doesn't look like an email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().min(1, "Email is required").email("That doesn't look like an email address"),
  phone: z.string().trim().max(32).optional(),
  institution: z.string().trim().max(160).optional(),
  password: z.string().min(8, "Use at least 8 characters"),
});

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function safeNext(next: FormDataEntryValue | null): string {
  const raw = typeof next === "string" ? next : "";
  // Only allow same-origin relative paths, so `next` can't be used as an
  // open redirect to another site.
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const { email, password } = parsed.data;
  const rows = await sql<
    { id: string; name: string; email: string; role: UserRole; password_hash: string }[]
  >`select id, name, email, role, password_hash from users where lower(email) = lower(${email}) limit 1`;

  const user = rows[0];
  // Same message whether the email is unknown or the password is wrong, so
  // the form cannot be used to discover which accounts exist.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Email or password is incorrect." };
  }

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  redirect(safeNext(formData.get("next")));
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    institution: formData.get("institution") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const { name, email, phone, institution, password } = parsed.data;

  const existing = await sql<{ id: string }[]>`
    select id from users where lower(email) = lower(${email}) limit 1
  `;
  if (existing.length) {
    return { fieldErrors: { email: "An account with this email already exists." } };
  }

  const hash = await hashPassword(password);
  const rows = await sql<{ id: string; name: string; email: string; role: UserRole }[]>`
    insert into users (name, email, phone, institution, password_hash, role)
    values (${name}, ${email}, ${phone ?? null}, ${institution ?? null}, ${hash}, 'participant')
    returning id, name, email, role
  `;

  const user = rows[0];
  await audit(user.id, "user.signed_up", "user", user.id, { email: user.email });
  await createSession(user);
  redirect(safeNext(formData.get("next")));
}

/**
 * One-click demo login. Exists so a judge never has to type credentials or
 * verify an email address to evaluate the role-specific tooling.
 */
export async function demoLoginAction(formData: FormData): Promise<void> {
  const role = String(formData.get("role") ?? "");
  const email = DEMO_ACCOUNTS[role];
  if (!email) redirect("/login?error=unknown-demo-role");

  const rows = await sql<{ id: string; name: string; email: string; role: UserRole }[]>`
    select id, name, email, role from users where lower(email) = lower(${email}) limit 1
  `;
  const user = rows[0];
  if (!user) redirect("/login?error=demo-unavailable");

  await createSession(user);
  redirect(role === "participant" ? "/me/registrations" : "/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
