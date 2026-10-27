import { NextResponse } from "next/server";
import { getPublicHeroImagesData } from "@/app/server/api/public/hero-images";

export async function GET() {
  try {
    const data = await getPublicHeroImagesData();
    return NextResponse.json(
      data,
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Failed to load public hero images:", error);
    return NextResponse.json({ error: "Hero images temporarily unavailable." }, { status: 503 });
  }
}
