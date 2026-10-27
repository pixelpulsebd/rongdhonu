import { NextResponse } from "next/server";
import { clearPublicProfileCookie } from "@/lib/publicProfile";
import { getPublicProfileData } from "@server/api/public/profile";
import { isSameOriginRequest } from "@/lib/publicRequest";

export async function GET() {
  const data = await getPublicProfileData();
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This request is not allowed." }, { status: 403 });
  await clearPublicProfileCookie();
  return NextResponse.json({ ok: true });
}
