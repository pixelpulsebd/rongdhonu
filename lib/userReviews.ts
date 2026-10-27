import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { readTable } from "@/lib/drive-store";

const COOKIE_PREFIX = "rd_review_owner_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export function ownerCookieName(reviewId: number): string {
  return `${COOKIE_PREFIX}${reviewId}`;
}

export function createOwnerToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOwnerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function setOwnerCookie(reviewId: number, token: string): Promise<void> {
  const store = await cookies();
  store.set(ownerCookieName(reviewId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearOwnerCookie(reviewId: number): Promise<void> {
  const store = await cookies();
  store.delete(ownerCookieName(reviewId));
}

export async function hasOwnerAccess(reviewId: number, storedHash?: string | null): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ownerCookieName(reviewId))?.value;
  const row = storedHash ? null : (await readTable("user_reviews")).find((item) => Number(item.id) === reviewId);
  const hash = storedHash ?? (row?.owner_token_hash == null ? null : String(row.owner_token_hash));
  return Boolean(token && hash && hashOwnerToken(token) === hash);
}
