import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAdminDashboardData } from "@server/api/admin/dashboard";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const days = Number(new URL(request.url).searchParams.get("days") || 30);
    const summary = await getAdminDashboardData(days);
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Dashboard summary unavailable:", error);
    return NextResponse.json({ error: "Dashboard data temporarily unavailable." }, { status: 503 });
  }
}
