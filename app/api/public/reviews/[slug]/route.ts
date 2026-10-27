import { NextResponse } from "next/server";
import { getPublicReviewData } from "@/app/server/api/public/reviews";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const data = await getPublicReviewData(slug);
    if (!data.review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    return NextResponse.json(
      data,
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Failed to load public review:", error);
    return NextResponse.json({ error: "Review temporarily unavailable." }, { status: 503 });
  }
}
