import { NextResponse } from "next/server";
import { getPublicWorkReviewsData } from "@server/api/public/work/[id]/reviews";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const workId = Number((await context.params).id);
  if (!Number.isInteger(workId) || workId <= 0) return NextResponse.json({ error: "Invalid work id." }, { status: 400 });
  try {
    const data = await getPublicWorkReviewsData(workId);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load related work reviews:", error);
    return NextResponse.json({ error: "Related reviews temporarily unavailable." }, { status: 503 });
  }
}
