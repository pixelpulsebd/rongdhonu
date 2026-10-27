import { NextResponse } from "next/server";
import { getPublicTeamData } from "@/app/server/api/public/team";

export async function GET() {
  try {
    const data = await getPublicTeamData();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Failed to load public team:", error);
    return NextResponse.json({ error: "Team temporarily unavailable." }, { status: 503 });
  }
}
