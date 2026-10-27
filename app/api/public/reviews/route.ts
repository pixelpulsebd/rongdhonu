import { NextResponse } from "next/server";
import { getPublicReviewsData } from "@/app/server/api/public/reviews";

export async function GET() {
  try {
    const data = await getPublicReviewsData();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("Failed to load public reviews:", error);
    return NextResponse.json({ error: "Reviews temporarily unavailable." }, { status: 503 });
  }
}
