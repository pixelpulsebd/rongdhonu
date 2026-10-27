import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { mutateTable, readTable, timestamp } from "@/lib/drive-store";
import { validateReviewForm, validateSortOrder, parseSortOrder } from "@/lib/formValidation";
export const PUT = withAdmin(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params; const body = await request.json();
  const slug = String(body.slug ?? "").trim().slice(0, 80); const name = String(body.name ?? "").trim().slice(0, 160);
  const role = body.role ? String(body.role).trim().slice(0, 100) : null; const roleBn = body.roleBn ? String(body.roleBn).trim().slice(0, 100) : null;
  const textEn = String(body.textEn ?? "").trim().slice(0, 1000); const textBn = body.textBn ? String(body.textBn).trim().slice(0, 1000) : null;
  const rawRating = body.rating; let rating: number | null = null;
  if (rawRating !== "" && rawRating != null) { const parsedRating = typeof rawRating === "number" ? rawRating : Number(String(rawRating).trim()); if (!Number.isFinite(parsedRating)) return NextResponse.json({ error: "Rating must be a number from 0 to 5." }, { status: 400 }); rating = Math.round(parsedRating * 10) / 10; }
  const workId = body.workId ? Number(body.workId) : null; const sortCheck = validateSortOrder(body.sortOrder);
  if (!sortCheck.ok) return NextResponse.json({ error: sortCheck.message }, { status: 400 });
  if (workId !== null && (!Number.isInteger(workId) || workId < 1)) return NextResponse.json({ error: "Related work is invalid." }, { status: 400 });
  if (workId !== null && !(await readTable("work_items")).some((row) => Number(row.id) === workId)) return NextResponse.json({ error: "Related work was not found." }, { status: 400 });
  const validation = validateReviewForm({ slug, name, role: role ?? "", roleBn: roleBn ?? "", textEn, textBn: textBn ?? "", rating });
  if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });
  const result = await mutateTable("reviews", (document) => {
    if (document.rows.some((row) => String(row.slug ?? "") === slug && String(row.id) !== id)) return "duplicate" as const;
    const row = document.rows.find((item) => String(item.id) === id); if (!row) return "missing" as const;
    Object.assign(row, { slug, name, role, role_bn: roleBn, text_en: textEn, text_bn: textBn, rating, work_id: workId, active: body.active !== false, sort_order: parseSortOrder(body.sortOrder), updated_at: timestamp() });
    return "ok" as const;
  });
  if (result === "duplicate") return NextResponse.json({ error: "That review slug is already in use." }, { status: 409 });
  if (result === "missing") return NextResponse.json({ error: "Review not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
export const DELETE = withAdmin(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  await mutateTable("reviews", (document) => { document.rows = document.rows.filter((row) => String(row.id) !== id); });
  return NextResponse.json({ ok: true });
});
