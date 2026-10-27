import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { mutateTable, timestamp } from "@/lib/drive-store";
import { parseSortOrder, validateSortOrder } from "@/lib/formValidation";
import { parseWorkInput } from "@/lib/workInput";
export const PUT = withAdmin(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = parseWorkInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const orderCheck = validateSortOrder(body.sortOrder);
  if (!orderCheck.ok) return NextResponse.json({ error: orderCheck.message }, { status: 400 });
  const w = parsed.value;
  const result = await mutateTable("work_items", (document) => {
    if (document.rows.some((row) => row.slug === w.slug && String(row.id) !== id)) return "duplicate" as const;
    const row = document.rows.find((item) => String(item.id) === id);
    if (!row) return "missing" as const;
    Object.assign(row, { slug: w.slug, title: w.title, title_bn: w.title_bn, category: w.category, category_bn: w.category_bn, description: w.description, description_bn: w.description_bn, client_name: w.client_name, location: w.location, year: w.year, image_url: w.image_url, active: body.active !== false, sort_order: parseSortOrder(body.sortOrder), updated_at: timestamp() });
    return "ok" as const;
  });
  if (result === "duplicate") return NextResponse.json({ error: "That work slug is already in use." }, { status: 409 });
  if (result === "missing") return NextResponse.json({ error: "Work item not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
export const DELETE = withAdmin(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const rows = await mutateTable("work_items", (document) => {
    const ids = new Set(document.rows.filter((row) => String(row.id) === id).map((row) => String(row.id)));
    document.rows = document.rows.filter((row) => String(row.id) !== id);
    return ids;
  });
  if (!rows.size) return NextResponse.json({ error: "Work item not found." }, { status: 404 });
  await mutateTable("reviews", (document) => { for (const row of document.rows) if (String(row.work_id) === id) row.work_id = null; });
  await mutateTable("user_reviews", (document) => { document.rows = document.rows.filter((row) => String(row.work_id) !== id); });
  return NextResponse.json({ ok: true });
});
