import "server-only";
import { getDashboardSummary, type DashboardSummary } from "@/lib/dashboard";

/** Typed server data loader for GET /api/admin/dashboard. Authorization stays in the route handler. */
export const getAdminDashboardData = (days: number): Promise<DashboardSummary> =>
  Promise.resolve().then(() => getDashboardSummary(days));
