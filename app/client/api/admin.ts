import { getApiJson } from "@/app/client/api/http";
import type { AdminBusinessResponse } from "@server/api/admin/business";
import type { AdminVisitorAnalyticsResponse } from "@server/api/admin/analytics/visitors";
import type { AdminHeroImagesResponse } from "@server/api/admin/hero-images";
import type { AdminNotificationsResponse } from "@server/api/admin/notifications";
import type { AdminReviewsResponse } from "@server/api/admin/reviews";
import type { AdminServicesResponse } from "@server/api/admin/services";
import type { AdminSubmissionsResponse } from "@server/api/admin/submissions";
import type { AdminTeamResponse } from "@server/api/admin/team";
import type { AdminWorkResponse } from "@server/api/admin/work";
import type { AdminUserReviewsResponse } from "@server/api/admin/user-reviews";
import type { DashboardSummary, VisitorQuery } from "@/lib/dashboard";

const noStore = { cache: "no-store" as RequestCache };
export const fetchAdminBusiness = () => getApiJson<AdminBusinessResponse>("/api/admin/business", noStore);
export const fetchAdminHeroImages = () => getApiJson<AdminHeroImagesResponse>("/api/admin/hero-images", noStore);
export const fetchAdminNotifications = () => getApiJson<AdminNotificationsResponse>("/api/admin/notifications", noStore);
export const fetchAdminReviews = () => getApiJson<AdminReviewsResponse>("/api/admin/reviews", noStore);
export const fetchAdminServices = () => getApiJson<AdminServicesResponse>("/api/admin/services", noStore);
export const fetchAdminSubmissions = () => getApiJson<AdminSubmissionsResponse>("/api/admin/submissions", noStore);
export const fetchAdminTeam = () => getApiJson<AdminTeamResponse>("/api/admin/team", noStore);
export const fetchAdminWork = () => getApiJson<AdminWorkResponse>("/api/admin/work", noStore);
export const fetchAdminUserReviews = () => getApiJson<AdminUserReviewsResponse>("/api/admin/user-reviews", noStore);
export const fetchAdminDashboard = (days = 30) => getApiJson<DashboardSummary>(`/api/admin/dashboard?days=${encodeURIComponent(String(days))}`, noStore);
export const fetchAdminVisitorAnalytics = (options: Partial<VisitorQuery> = {}) => {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  return getApiJson<AdminVisitorAnalyticsResponse>(`/api/admin/analytics/visitors?${params.toString()}`, noStore);
};
export const fetchAdminSuggestions = (collection: string, field: string, q = "") => {
  const params = new URLSearchParams({ collection, field, q });
  return getApiJson<{ values: string[] }>(`/api/admin/suggestions?${params.toString()}`, noStore);
};
