import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { readTable } from "@/lib/drive-store";

const COOKIE_NAME = "rd_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

interface AdminUserRow {
  id: number;
  email: string;
  password_hash: string;
}

interface SessionPayload {
  adminId: number;
  email: string;
  exp: number; // epoch seconds
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    // A missing secret in production would let anyone forge an admin session by
    // guessing a known fallback, so refuse to sign/verify anything there. The fallback
    // below only exists to keep `npm run dev` working before you've copied
    // .env.example — never rely on it beyond local testing.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is not set. Add a long random value to your environment variables (see .env.example).");
    }
    return "dev-only-secret-change-me";
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyAdminLogin(email: string, password: string): Promise<AdminUserRow | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = (await readTable<AdminUserRow & Record<string, unknown>>("admin_users")).find((row) => row.email.trim().toLowerCase() === normalizedEmail) ?? null;
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
}

export async function createAdminSession(user: AdminUserRow): Promise<void> {
  await setSessionCookie({ adminId: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS });
}

async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated.");
  return session;
}

export { COOKIE_NAME };
