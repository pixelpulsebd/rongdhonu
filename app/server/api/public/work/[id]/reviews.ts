import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getReviewsForWork, type ReviewRow } from "@/lib/content";
import { readTable, type DriveRow } from "@/lib/drive-store";
import { ownerCookieName } from "@/lib/userReviews";
export type RelatedWorkReview = ReviewRow & { canManage?: boolean; ownerEmail?: string };
export interface PublicWorkReviewsResponse { reviews: RelatedWorkReview[] }
export function getPublicWorkReviewsData(workId: number): Promise<PublicWorkReviewsResponse> {
  const publicReviewsPromise: Promise<ReviewRow[]> = getReviewsForWork(workId);
  const ownerRowsPromise: Promise<DriveRow[]> = readTable<DriveRow>("user_reviews");
  return Promise.all([publicReviewsPromise, cookies(), ownerRowsPromise]).then((results) => {
    const publicReviews = results[0] as ReviewRow[];
    const store = results[1] as { get: (name: string) => { value: string } | undefined };
    const allOwnerRows = results[2] as DriveRow[];
    const ownerRows = allOwnerRows.filter((row: DriveRow) => Number(row.work_id) === workId).sort((a: DriveRow, b: DriveRow) => new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime() || Number(b.id) - Number(a.id));
    const ownerIds = new Set<number>(); const ownerEmails = new Map<number, string>(); const privateOwned: RelatedWorkReview[] = [];
    for (const row of ownerRows) {
      const id = Number(row.id); const token = store.get(ownerCookieName(id))?.value; const hash = String(row.owner_token_hash ?? "");
      if (!token || !hash || createHash("sha256").update(token).digest("hex") !== hash) continue;
      ownerIds.add(id); ownerEmails.set(id, String(row.email ?? ""));
      if (publicReviews.some((review: ReviewRow) => review.id === id && review.source === "user")) continue;
      privateOwned.push({ id, slug: `user-review-${id}`, name: String(row.name ?? ""), role: null, roleBn: null, textEn: String(row.review_text ?? ""), textBn: null, rating: row.rating == null ? null : Number(row.rating), workId, workSlug: null, workTitle: null, workTitleBn: null, sortOrder: 100000 + id, active: true, createdAt: String(row.created_at ?? row.updated_at ?? ""), source: "user", isPublic: row.status === "visible", canManage: true, ownerEmail: String(row.email ?? "") });
    }
    return { reviews: [...publicReviews.map((review: ReviewRow) => ({ ...review, canManage: review.source === "user" && ownerIds.has(review.id), isPublic: true, ownerEmail: review.source === "user" && ownerIds.has(review.id) ? ownerEmails.get(review.id) : undefined })), ...privateOwned] };
  });
}
