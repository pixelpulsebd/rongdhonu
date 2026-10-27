import { NextResponse } from "next/server";
import { getPublicProcessData } from "@/app/server/api/public/process";

export async function GET() {
  try {
    const data = await getPublicProcessData();
    return NextResponse.json(
      data,
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Failed to load public process:", error);
    return NextResponse.json({ error: "Process data temporarily unavailable." }, { status: 503 });
  }
}
