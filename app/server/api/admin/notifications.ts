import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminNotificationsResponse { pendingReviews: number; newEnquiries: number }
export const getAdminNotificationsData = (): Promise<AdminNotificationsResponse> =>
  Promise.all([readTable("user_reviews"), readTable("contact_submissions")]).then(([reviews, submissions]) => ({ pendingReviews: reviews.filter((row) => row.status === "pending").length, newEnquiries: submissions.filter((row) => row.status === "new").length }));
