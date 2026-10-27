import { NextResponse } from "next/server";
import { clearOwnerCookie, hasOwnerAccess } from "@/lib/userReviews";
import { isSameOriginRequest } from "@/lib/publicRequest";
import { CONSENT_VERSION, getPublicProfile, setPublicProfileCookie } from "@/lib/publicProfile";
import { mutateTable, readTable, timestamp } from "@/lib/drive-store";
function clean(value: unknown, max: number): string { return String(value ?? "").trim().slice(0, max); }
async function owned(id: number) {
  const row = (await readTable("user_reviews")).find((item) => Number(item.id) === id);
  if (!row || !(await hasOwnerAccess(id, String(row.owner_token_hash ?? "")))) return null;
  return row;
}
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  const ownedReview = await owned(id);
  if (!ownedReview) return NextResponse.json({ error: "You do not have permission to update this review." }, { status: 403 });
  const body = await request.json(); const name = clean(body.name, 120); const text = clean(body.text, 1500); const rating = Number(body.rating);
  if (body.consentAccepted !== true) return NextResponse.json({ error: "Please accept the review consent before updating your review.", code: "consent_required" }, { status: 400 });
  if (!name || text.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Please provide valid review details." }, { status: 400 });
  try {
    await mutateTable("user_reviews", (document) => {
      const row = document.rows.find((item) => Number(item.id) === id);
      if (!row) throw new Error("Review no longer exists.");
      Object.assign(row, { name, rating, review_text: text, status: "pending", consent_version: CONSENT_VERSION, consent_at: timestamp(), updated_at: timestamp() });
    });
    const review = (await readTable("user_reviews")).find((item) => Number(item.id) === id);
    if (review) {
      const browserProfile = await getPublicProfile();
      const providerSubject = typeof review.identity_subject === "string"
        ? review.identity_subject
        : browserProfile?.providerSubject;
      await setPublicProfileCookie({
        ...browserProfile,
        name,
        email: String(review.email ?? ""),
        provider: review.identity_provider === "google" || review.identity_provider === "apple"
          ? review.identity_provider
          : browserProfile?.provider ?? "form",
        providerSubject,
      });
    }
  } catch (error) { console.error("Public review update failed:", error); return NextResponse.json({ error: "Could not update your review right now." }, { status: 500 }); }
  return NextResponse.json({ ok: true, message: "Your review was updated and returned to moderation." });
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  if (!(await owned(id))) return NextResponse.json({ error: "You do not have permission to delete this review." }, { status: 403 });
  await mutateTable("user_reviews", (document) => { document.rows = document.rows.filter((row) => Number(row.id) !== id); });
  await clearOwnerCookie(id);
  return NextResponse.json({ ok: true, message: "Your review was deleted." });
}
