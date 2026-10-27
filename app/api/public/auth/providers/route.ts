import { NextResponse } from "next/server";
import { getPublicAuthProvidersData } from "@server/api/public/auth/providers";

export async function GET() {
  return getPublicAuthProvidersData().then((data) => NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60" } }));
}
