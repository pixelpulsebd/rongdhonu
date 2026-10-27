import "server-only";
import { getActiveReviews, getReviewBySlug, getReviewsForWork, type ReviewRow } from "@/lib/content";

export interface PublicReviewsResponse { reviews: ReviewRow[] }
export interface PublicReviewResponse { review: ReviewRow | null }
export const getPublicReviewsData = (): Promise<PublicReviewsResponse> =>
  getActiveReviews().then((reviews) => ({ reviews }));
export const getPublicReviewData = (slug: string): Promise<PublicReviewResponse> =>
  getReviewBySlug(slug).then((review) => ({ review }));
export const getPublicWorkReviewsData = (workId: number): Promise<PublicReviewsResponse> =>
  getReviewsForWork(workId).then((reviews) => ({ reviews }));
