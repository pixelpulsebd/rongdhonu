import "server-only";
import { readTable } from "@/lib/drive-store";

export interface AnalyticsPoint {
  date: string;
  visitors: number;
}

export interface VisitorAnalyticsRow {
  visitorId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  sessionCount: number;
  ipMasked: string | null;
  userAgent: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
  language: string | null;
  languages: string | null;
  timezone: string | null;
  platform: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  cookiesEnabled: boolean | null;
  country: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
  landingPath: string | null;
  lastPath: string | null;
}

export interface DashboardContentItem {
  id: string;
  type: "services" | "work" | "team" | "reviews";
  title: string;
  secondary: string | null;
  slug: string;
  active: boolean;
  updatedAt: string;
}

export interface DashboardSummary {
  counts: {
    services: number;
    activeServices: number;
    team: number;
    activeTeam: number;
    reviews: number;
    activeReviews: number;
    enquiries: number;
    newEnquiries: number;
    pendingUserReviews: number;
    work: number;
    activeWork: number;
    visitors: number;
    visits: number;
    returningVisitors: number;
  };
  range: number;
  charts: {
    visitors: AnalyticsPoint[];
    reviews: AnalyticsPoint[];
    enquiries: AnalyticsPoint[];
  };
  latestReviews: { id: number; name: string; role: string | null; text: string; rating: number | null; active: boolean }[];
  team: { id: number; name: string; role: string; photoUrl: string | null; active: boolean }[];
  content: DashboardContentItem[];
  collectionSlugs: { workSlug: string; teamSlug: string };
}

const LATEST_REVIEWS = 3;
const TEAM_PREVIEW = 6;

function clampDays(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.max(7, Math.min(90, Math.trunc(value)));
}
function dayKey(value: unknown): string {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
function fillDays(rows: { date: string; visitors: number }[], days: number): AnalyticsPoint[] {
  const values = new Map(rows.map((row) => [row.date.slice(0, 10), Number(row.visitors)]));
  const result: AnalyticsPoint[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    result.push({ date: day.toISOString().slice(0, 10), visitors: values.get(day.toISOString().slice(0, 10)) ?? 0 });
  }
  return result;
}
function dailyCounts(rows: Record<string, unknown>[], field: string, range: number): { date: string; visitors: number }[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (range - 1));
  const startKey = start.toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = dayKey(row[field]);
    if (date && date >= startKey) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return [...counts].map(([date, visitors]) => ({ date, visitors })).sort((a, b) => a.date.localeCompare(b.date));
}
const num = (value: unknown) => Number(value ?? 0);
const bool = (value: unknown) => value === true || value === "true" || value === "t" || value === 1;
const str = (value: unknown): string | null => value == null || String(value) === "" ? null : String(value);
const time = (value: unknown): number => {
  const n = new Date(String(value ?? "")).getTime();
  return Number.isFinite(n) ? n : 0;
};

export async function getDashboardSummary(requestedDays = 30): Promise<DashboardSummary> {
  const range = clampDays(requestedDays);
  const [services, teamMembers, reviews, submissions, userReviews, workItems, visitors, events, businessRows] = await Promise.all([
    readTable("services"), readTable("team_members"), readTable("reviews"), readTable("contact_submissions"),
    readTable("user_reviews"), readTable("work_items"), readTable("site_visitors"), readTable("site_visit_events"), readTable("business_profile"),
  ]);
  const preview = <T extends Record<string, unknown>>(rows: T[], type: DashboardContentItem["type"], titleField: string, secondaryField: string): DashboardContentItem[] => rows
    .slice().sort((a, b) => time(b.updated_at) - time(a.updated_at) || num(b.id) - num(a.id)).slice(0, 24).map((row) => ({
      id: String(row.id), type, title: String(row[titleField] ?? ""), secondary: str(row[secondaryField]), slug: String(row.slug ?? `${type}-${row.id}`), active: bool(row.active), updatedAt: String(row.updated_at ?? ""),
    }));
  const content = [
    ...preview(services, "services", "name", "category"),
    ...preview(workItems, "work", "title", "category"),
    ...preview(teamMembers, "team", "name", "role"),
    ...preview(reviews, "reviews", "name", "role"),
  ].sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
  const latestReviews = reviews.slice().sort((a, b) => time(b.created_at) - time(a.created_at) || num(b.id) - num(a.id)).slice(0, LATEST_REVIEWS);
  const team = teamMembers.slice().sort((a, b) => num(a.sort_order) - num(b.sort_order) || num(a.id) - num(b.id)).slice(0, TEAM_PREVIEW);
  const business = businessRows.find((row) => num(row.id) === 1) ?? businessRows[0];
  return {
    counts: {
      services: services.length, activeServices: services.filter((r) => bool(r.active)).length,
      team: teamMembers.length, activeTeam: teamMembers.filter((r) => bool(r.active)).length,
      reviews: reviews.length, activeReviews: reviews.filter((r) => bool(r.active)).length,
      enquiries: submissions.length, newEnquiries: submissions.filter((r) => r.status === "new").length,
      pendingUserReviews: userReviews.filter((r) => r.status === "pending").length,
      work: workItems.length, activeWork: workItems.filter((r) => bool(r.active)).length,
      visitors: visitors.length, visits: events.length, returningVisitors: visitors.filter((r) => num(r.visit_count) > 1).length,
    },
    range,
    charts: { visitors: fillDays(dailyCounts(events, "visited_at", range), range), reviews: fillDays(dailyCounts(reviews, "created_at", range), range), enquiries: fillDays(dailyCounts(submissions, "created_at", range), range) },
    latestReviews: latestReviews.map((r) => ({ id: num(r.id), name: String(r.name ?? ""), role: str(r.role), text: String(r.text_en ?? ""), rating: r.rating == null ? null : num(r.rating), active: bool(r.active) })),
    team: team.map((r) => ({ id: num(r.id), name: String(r.name ?? ""), role: String(r.role ?? ""), photoUrl: str(r.photo_url), active: bool(r.active) })),
    content,
    collectionSlugs: { workSlug: String(business?.work_slug ?? "our-work"), teamSlug: String(business?.team_slug ?? "our-team") },
  };
}

export interface VisitorQuery {
  search: string;
  device: string;
  country: string;
  returning: "all" | "returning" | "new";
  sort: keyof Pick<VisitorAnalyticsRow, "visitorId" | "firstSeenAt" | "lastSeenAt" | "visitCount" | "sessionCount" | "deviceType" | "browser" | "operatingSystem" | "country" | "city">;
  dir: "asc" | "desc";
  limit: number;
  offset: number;
}

const VISITOR_FIELD: Record<VisitorQuery["sort"], string> = {
  visitorId: "visitor_id", firstSeenAt: "first_seen_at", lastSeenAt: "last_seen_at", visitCount: "visit_count", sessionCount: "session_count",
  deviceType: "device_type", browser: "browser", operatingSystem: "operating_system", country: "country", city: "city",
};
const VISITOR_MAP: Record<string, keyof VisitorAnalyticsRow> = {
  visitor_id: "visitorId", first_seen_at: "firstSeenAt", last_seen_at: "lastSeenAt", visit_count: "visitCount", session_count: "sessionCount", ip_masked: "ipMasked", user_agent: "userAgent", browser: "browser", operating_system: "operatingSystem", device_type: "deviceType", language: "language", languages: "languages", timezone: "timezone", platform: "platform", screen_width: "screenWidth", screen_height: "screenHeight", viewport_width: "viewportWidth", viewport_height: "viewportHeight", cookies_enabled: "cookiesEnabled", country: "country", region: "region", city: "city", referrer: "referrer", landing_path: "landingPath", last_path: "lastPath",
};

export async function getVisitorAnalytics(queryOptions: VisitorQuery) {
  const sourceRows = await readTable("site_visitors");
  const needle = queryOptions.search.trim().toLocaleLowerCase();
  let filtered = sourceRows.filter((row) => {
    if (needle) {
      const fields = [row.visitor_id, row.ip_masked, row.user_agent, row.last_path, row.referrer, row.city, row.country, row.browser, row.operating_system];
      if (!fields.some((value) => String(value ?? "").toLocaleLowerCase().includes(needle))) return false;
    }
    if (queryOptions.device && String(row.device_type ?? "") !== queryOptions.device) return false;
    if (queryOptions.country && String(row.country ?? "") !== queryOptions.country) return false;
    if (queryOptions.returning === "returning" && num(row.visit_count) <= 1) return false;
    if (queryOptions.returning === "new" && num(row.visit_count) !== 1) return false;
    return true;
  });
  const total = filtered.length;
  const sortColumn = VISITOR_FIELD[queryOptions.sort] ?? VISITOR_FIELD.lastSeenAt;
  const dir = queryOptions.dir === "asc" ? 1 : -1;
  filtered = filtered.slice().sort((a, b) => {
    const left = a[sortColumn]; const right = b[sortColumn];
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === "number" && typeof right === "number") return (left - right) * dir;
    return String(left).localeCompare(String(right)) * dir;
  });
  const rows = filtered.slice(Math.max(0, queryOptions.offset), Math.max(0, queryOptions.offset) + Math.max(1, queryOptions.limit)).map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const target = VISITOR_MAP[key] ?? key;
      mapped[target] = value;
    }
    for (const numeric of ["visitCount", "sessionCount", "screenWidth", "screenHeight", "viewportWidth", "viewportHeight"] as const) {
      if (mapped[numeric] != null) mapped[numeric] = num(mapped[numeric]);
    }
    return mapped as unknown as VisitorAnalyticsRow;
  });
  const facetsRows = sourceRows;
  const devices = [...new Set(facetsRows.map((r) => String(r.device_type ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const countries = [...new Set(facetsRows.map((r) => String(r.country ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return { total, rows, facets: { devices, countries } };
}
