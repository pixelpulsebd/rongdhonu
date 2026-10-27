import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { allocateId, mutateTable, readTable, timestamp } from "@/lib/drive-store";
import { validateReviewForm } from "@/lib/formValidation";

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || `review-${Date.now()}`;
}
export const GET = withAdmin(async () => {
  const rows = await readTable("reviews");
  rows.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0));
  return NextResponse.json({ reviews: rows });
});
export const POST = withAdmin(async (request: Request) => {
  const body = await request.json();
  const name = String(body.name ?? "").trim().slice(0, 160);
  const requestedSlug = String(body.slug ?? "").trim().slice(0, 80);
  const slug = requestedSlug || `${slugify(name)}-${Date.now().toString(36).slice(-5)}`;
  const role = body.role ? String(body.role).trim().slice(0, 100) : null;
  const roleBn = body.roleBn ? String(body.roleBn).trim().slice(0, 100) : null;
  const textEn = String(body.textEn ?? "").trim().slice(0, 1000);
  const textBn = body.textBn ? String(body.textBn).trim().slice(0, 1000) : null;
  const rawRating = body.rating;
  let rating: number | null = null;
  if (rawRating !== "" && rawRating != null) {
    const parsedRating = typeof rawRating === "number" ? rawRating : Number(String(rawRating).trim());
    if (!Number.isFinite(parsedRating)) return NextResponse.json({ error: "Rating must be a number from 0 to 5." }, { status: 400 });
    rating = Math.round(parsedRating * 10) / 10;
  }
  const workId = body.workId ? Number(body.workId) : null;
  if (workId !== null && (!Number.isInteger(workId) || workId < 1)) return NextResponse.json({ error: "Related work is invalid." }, { status: 400 });
  if (workId !== null && !(await readTable("work_items")).some((row) => Number(row.id) === workId)) return NextResponse.json({ error: "Related work was not found." }, { status: 400 });
  const validation = validateReviewForm({ slug, name, role: role ?? "", roleBn: roleBn ?? "", textEn, textBn: textBn ?? "", rating });
  if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });
  const result = await mutateTable("reviews", (document) => {
    if (document.rows.some((row) => row.slug === slug)) return { conflict: true as const };
    const id = allocateId(document); const now = timestamp();
    document.rows.push({ id, slug, name, role, role_bn: roleBn, text_en: textEn, text_bn: textBn, rating, work_id: workId, sort_order: Math.max(0, ...document.rows.map((row) => Number(row.sort_order) || 0)) + 1, created_at: now, updated_at: now, active: true });
    return { conflict: false as const, id };
  });
  if (result.conflict) return NextResponse.json({ error: "That review slug is already in use." }, { status: 409 });
  return NextResponse.json({ ok: true, id: result.id, slug });
});
