import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { mutateTable, timestamp } from "@/lib/drive-store";
import { parseServiceInput, parseServiceSortOrder } from "@/lib/serviceInput";

export const PUT = withAdmin(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = parseServiceInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const s = parsed.value;
  const result = await mutateTable("services", (document) => {
    if (document.rows.some((row) => String(row.slug ?? "") === s.slug && String(row.id) !== id)) return "duplicate" as const;
    const row = document.rows.find((item) => String(item.id) === id);
    if (!row) return "missing" as const;
    Object.assign(row, { slug: s.slug, name: s.name, name_bn: s.name_bn, category: s.category, category_bn: s.category_bn, description: s.description, description_bn: s.description_bn, best_for: s.best_for, best_for_bn: s.best_for_bn, accent: s.accent, image_url: s.image_url, active: body.active !== false, sort_order: parseServiceSortOrder(body.sortOrder), updated_at: timestamp() });
    return "ok" as const;
  });
  if (result === "duplicate") return NextResponse.json({ error: "That service slug is already in use." }, { status: 409 });
  if (result === "missing") return NextResponse.json({ error: "Service not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
export const DELETE = withAdmin(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  await mutateTable("services", (document) => { document.rows = document.rows.filter((row) => String(row.id) !== id); });
  return NextResponse.json({ ok: true });
});
