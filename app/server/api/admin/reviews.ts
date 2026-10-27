import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminReviewsResponse { reviews: Record<string, unknown>[] }
export const getAdminReviewsData = (): Promise<AdminReviewsResponse> => readTable("reviews").then((reviews) => ({ reviews: reviews.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0)) }));
