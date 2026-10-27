import { NextResponse } from "next/server";
import { getPublicBusinessData } from "@/app/server/api/public/business";

export async function GET() {
  try {
    const data = await getPublicBusinessData();
    return NextResponse.json(
      data,
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Failed to load public business:", error);
    return NextResponse.json({ error: "Business profile temporarily unavailable." }, { status: 503 });
  }
}
