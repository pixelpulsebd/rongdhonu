import "server-only";
import { getVisitorAnalytics, type VisitorQuery } from "@/lib/dashboard";

export type AdminVisitorAnalyticsResponse = Awaited<ReturnType<typeof getVisitorAnalytics>>;

/** Typed server data loader for GET /api/admin/analytics/visitors. Authorization stays in the route handler. */
export const getAdminVisitorAnalyticsData = (options: VisitorQuery) =>
  Promise.resolve().then(() => getVisitorAnalytics(options));
