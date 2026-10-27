import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAdminVisitorAnalyticsData } from "@server/api/admin/analytics/visitors";
import type { VisitorQuery } from "@/lib/dashboard";

const SORTS: VisitorQuery["sort"][] = ["visitorId", "firstSeenAt", "lastSeenAt", "visitCount", "sessionCount", "deviceType", "browser", "operatingSystem", "country", "city"];

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const rawSort = url.searchParams.get("sort") as VisitorQuery["sort"] | null;
  const rawDir = url.searchParams.get("dir");
  const rawReturning = url.searchParams.get("returning");
  const sort = rawSort && SORTS.includes(rawSort) ? rawSort : "lastSeenAt";
  const dir: VisitorQuery["dir"] = rawDir === "asc" ? "asc" : "desc";
  const returning: VisitorQuery["returning"] = rawReturning === "returning" || rawReturning === "new" ? rawReturning : "all";
  const limit = Math.max(10, Math.min(100, Number(url.searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  try {
    const result = await getAdminVisitorAnalyticsData({
      search: url.searchParams.get("search") || "",
      device: url.searchParams.get("device") || "",
      country: url.searchParams.get("country") || "",
      returning,
      sort,
      dir,
      limit,
      offset,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Visitor analytics unavailable:", error);
    return NextResponse.json({ error: "Visitor analytics temporarily unavailable." }, { status: 503 });
  }
}
