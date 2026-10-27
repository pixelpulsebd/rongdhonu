import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { allocateId, mutateTable, readTable, timestamp } from "@/lib/drive-store";
import { validateSortOrder, parseSortOrder } from "@/lib/formValidation";
import { parseWorkInput } from "@/lib/workInput";
export const GET = withAdmin(async () => {
  const work = await readTable("work_items");
  work.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0));
  return NextResponse.json({ work });
});
export const POST = withAdmin(async (request: Request) => {
  const body = await request.json();
  const parsed = parseWorkInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const w = parsed.value;
  const result = await mutateTable("work_items", (document) => {
    if (document.rows.some((row) => row.slug === w.slug)) return { conflict: true as const };
    const id = allocateId(document);
    const sortOrder = parseSortOrder(Math.max(0, ...document.rows.map((row) => Number(row.sort_order) || 0)) + 1);
    document.rows.push({ id, slug: w.slug, title: w.title, title_bn: w.title_bn, category: w.category, category_bn: w.category_bn, description: w.description, description_bn: w.description_bn, client_name: w.client_name, location: w.location, year: w.year, image_url: w.image_url, sort_order: sortOrder, active: true, created_at: timestamp(), updated_at: timestamp() });
    return { conflict: false as const, id };
  });
  if (result.conflict) return NextResponse.json({ error: "That work slug is already in use." }, { status: 409 });
  return NextResponse.json({ ok: true, id: result.id });
});
