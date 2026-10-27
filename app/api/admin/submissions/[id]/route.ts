import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { mutateTable, timestamp } from "@/lib/drive-store";
const STATUSES = new Set(["new", "read", "archived"]);
export const PATCH = withAdmin(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params; const body = await request.json(); const status = String(body.status ?? "");
  if (!STATUSES.has(status)) return NextResponse.json({ error: "status must be one of: new, read, archived." }, { status: 400 });
  const updated = await mutateTable("contact_submissions", (document) => {
    const row = document.rows.find((item) => String(item.id) === id);
    if (!row) return false;
    row.status = status; row.updated_at = timestamp(); return true;
  });
  if (!updated) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
