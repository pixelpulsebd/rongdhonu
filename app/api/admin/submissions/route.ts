import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { readTable } from "@/lib/drive-store";
export const GET = withAdmin(async () => {
  const rows = await readTable("contact_submissions");
  rows.sort((a, b) => new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime());
  return NextResponse.json({ submissions: rows.slice(0, 500) });
});
