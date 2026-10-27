import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { mutateTable, readTable, timestamp } from "@/lib/drive-store";
export const GET = withAdmin(async () => {
  const [reviews, work] = await Promise.all([readTable("user_reviews"), readTable("work_items")]);
  const workById = new Map(work.map((row) => [String(row.id), row]));
  reviews.sort((a, b) => {
    const order = (value: unknown) => value === "pending" ? 0 : value === "visible" ? 1 : 2;
    return order(a.status) - order(b.status) || new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime() || Number(b.id) - Number(a.id);
  });
  return NextResponse.json({ reviews: reviews.slice(0, 500).map((row) => ({ id: row.id, work_id: row.work_id, name: row.name, email: row.email, rating: row.rating, review_text: row.review_text, status: row.status, created_at: row.created_at, updated_at: row.updated_at, work_title: workById.get(String(row.work_id))?.title ?? null, work_slug: workById.get(String(row.work_id))?.slug ?? null })) });
});
export const PATCH = withAdmin(async (request: Request) => {
  const body = await request.json(); const id = Number(body.id); const status = String(body.status ?? "");
  if (!Number.isInteger(id) || id <= 0 || !["visible", "hidden"].includes(status)) return NextResponse.json({ error: "Only show/hide status changes are allowed for website reviews." }, { status: 400 });
  const result = await mutateTable("user_reviews", (document) => {
    const row = document.rows.find((item) => Number(item.id) === id); if (!row) return null;
    row.status = status; row.updated_at = timestamp(); return { id: row.id, status: row.status };
  });
  if (!result) return NextResponse.json({ error: "User review not found." }, { status: 404 });
  return NextResponse.json({ ok: true, review: result });
});
