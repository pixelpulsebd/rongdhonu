import { NextResponse } from "next/server";
import { allocateId, mutateTable, readTable, timestamp } from "@/lib/drive-store";
import { createOwnerToken, hashOwnerToken, setOwnerCookie } from "@/lib/userReviews";
import { isSameOriginRequest } from "@/lib/publicRequest";
import { CONSENT_VERSION, getPublicProfile, setPublicProfileCookie } from "@/lib/publicProfile";
function validEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function clean(value: unknown, max: number): string { return String(value ?? "").trim().slice(0, max); }
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This form submission is not allowed." }, { status: 403 });
    const body = await request.json(); const workId = Number(body.workId); const name = clean(body.name, 120); const email = clean(body.email, 200).toLowerCase(); const text = clean(body.text, 1500); const rating = Number(body.rating); const honeypot = clean(body.website, 120);
    if (honeypot) return NextResponse.json({ ok: true, message: "Thank you. Your review has been submitted and is awaiting moderation." }, { status: 201 });
    if (body.consentAccepted !== true) return NextResponse.json({ error: "Please accept the review consent before submitting.", code: "consent_required" }, { status: 400 });
    if (!Number.isInteger(workId) || workId < 1 || !name || !validEmail(email) || !text || text.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Please provide your name, valid email, a 1–5 star rating, and a review of at least 10 characters." }, { status: 400 });
    const work = (await readTable("work_items")).find((row) => Number(row.id) === workId && (row.active === true || row.active === "true" || row.active === "t" || row.active === 1));
    if (!work) return NextResponse.json({ error: "Selected work was not found." }, { status: 404 });
    const browserProfile = await getPublicProfile();
    const identityProvider = browserProfile?.provider === "google" || browserProfile?.provider === "apple" ? browserProfile.provider : null;
    const identitySubject = identityProvider ? browserProfile?.providerSubject ?? null : null;
    const ownerToken = createOwnerToken(); const now = timestamp();
    const inserted = await mutateTable("user_reviews", (document) => {
      const existing = document.rows.find((row) => Number(row.work_id) === workId && (String(row.email ?? "").toLowerCase() === email || Boolean(identityProvider && row.identity_provider === identityProvider && row.identity_subject === identitySubject)));
      if (existing) return { conflict: true as const, id: Number(existing.id), status: String(existing.status ?? "pending") };
      const id = allocateId(document);
      document.rows.push({ id, work_id: workId, name, email, rating, review_text: text, owner_token_hash: hashOwnerToken(ownerToken), status: "pending", identity_provider: identityProvider, identity_subject: identitySubject, consent_version: CONSENT_VERSION, consent_at: now, created_at: now, updated_at: now });
      return { conflict: false as const, id };
    });
    if (inserted.conflict) return NextResponse.json({ error: "You already have a review for this work. You can edit your existing review instead of submitting another one.", code: "REVIEW_ALREADY_EXISTS", reviewId: inserted.id, status: inserted.status }, { status: 409 });
    await setOwnerCookie(inserted.id, ownerToken);
    await setPublicProfileCookie({ ...browserProfile, name, email, provider: browserProfile?.provider ?? "form", providerSubject: browserProfile?.providerSubject });
    return NextResponse.json({ ok: true, id: inserted.id, message: "Thank you. Your review has been submitted and is awaiting moderation." }, { status: 201 });
  } catch (error) {
    console.error("Public review submission failed:", error);
    return NextResponse.json({ error: "Could not submit your review right now. Please try again." }, { status: 500 });
  }
}
