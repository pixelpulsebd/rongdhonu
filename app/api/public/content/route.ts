import { NextResponse } from "next/server";
import { getPublicContentData } from "@/app/server/api/public/content";

export async function GET() {
  try {
    const data = await getPublicContentData();

    return NextResponse.json(
      data,
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Failed to load public content:", error);
    return NextResponse.json({ error: "Content temporarily unavailable." }, { status: 503 });
  }
}
