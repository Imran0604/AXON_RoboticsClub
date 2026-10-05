import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import type { UserRole } from "@/lib/types";

/**
 * Session handling.
 *
 * Rolled by hand rather than using a hosted auth provider, for two reasons:
 * the demo accounts need to work instantly for judges with no email
 * verification step in the way, and authorization needs to be checkable in
 * one place that a code reviewer can actually read.
 *
 * The session is a signed JWT in an httpOnly cookie. It carries the role so
 * that route guards don't need a database round trip, but every privileged
 * mutation re-reads the role from the database before acting — a cookie is
 * evidence of who you are, never authority over what you may do.
 */

const COOKIE = "axon_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Generate one with:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return new TextEncoder().encode(s);
}

/* ------------------------------------------------------------------------- */
/* Passwords                                                                  */
/* ------------------------------------------------------------------------- */

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ------------------------------------------------------------------------- */
/* Session lifecycle — these may only be called from a Server Action or a     */
/* Route Handler, because that is where Next allows cookies to be written.    */
/* ------------------------------------------------------------------------- */

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The signed-in user, or null. Never throws on a bad or expired cookie. */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: (payload.role as UserRole) ?? "participant",
    };
  } catch {
    // Expired, tampered with, or signed under an old secret.
    return null;
  }
}

/* ------------------------------------------------------------------------- */
/* Guards                                                                     */
/* ------------------------------------------------------------------------- */

/** Require any signed-in user, or bounce to login with a return path. */
export async function requireUser(returnTo = "/"): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * Require one of the given roles, verified against the database rather than
 * the cookie. This is the function that actually protects the organizer
 * tooling; the cookie role is only used for optimistic UI and redirects.
 */
export async function requireRole(roles: UserRole[], returnTo = "/admin"): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  const rows = await sql<{ role: UserRole }[]>`
    select role from users where id = ${user.id} limit 1
  `;
  const actual = rows[0]?.role;
  if (!actual || !roles.includes(actual)) redirect("/forbidden");
  return { ...user, role: actual };
}

export function isStaff(role: UserRole | undefined): boolean {
  return role === "organizer" || role === "admin";
}

/* ------------------------------------------------------------------------- */
/* Audit trail                                                                */
/* ------------------------------------------------------------------------- */

/** JSON-safe value, so audit metadata cannot accidentally carry a Date or a class instance. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  meta: Record<string, Json> = {}
): Promise<void> {
  await sql`
    insert into audit_log (actor_id, action, entity, entity_id, meta)
    values (${actorId}, ${action}, ${entity}, ${entityId}, ${sql.json(meta)})
  `;
}
