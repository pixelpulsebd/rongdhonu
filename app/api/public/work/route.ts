import { NextResponse } from "next/server";
import { getPublicWorkData } from "@/app/server/api/public/work";

export async function GET() {
  try {
    const data = await getPublicWorkData();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Failed to load public work:", error);
    return NextResponse.json({ error: "Work temporarily unavailable." }, { status: 503 });
  }
}
