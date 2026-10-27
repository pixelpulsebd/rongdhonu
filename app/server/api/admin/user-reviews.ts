import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminUserReviewsResponse { reviews: Record<string, unknown>[] }
export const getAdminUserReviewsData = (): Promise<AdminUserReviewsResponse> => Promise.all([readTable("user_reviews"), readTable("work_items")]).then(([reviews, work]) => {
  const byId = new Map(work.map((item) => [String(item.id), item]));
  const order = (value: unknown) => value === "pending" ? 0 : value === "visible" ? 1 : 2;
  return { reviews: reviews.sort((a, b) => order(a.status) - order(b.status) || new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime() || Number(b.id) - Number(a.id)).slice(0, 500).map((row) => ({ id: row.id, work_id: row.work_id, name: row.name, email: row.email, rating: row.rating, review_text: row.review_text, status: row.status, created_at: row.created_at, updated_at: row.updated_at, work_title: byId.get(String(row.work_id))?.title ?? null, work_slug: byId.get(String(row.work_id))?.slug ?? null })) };
});
