import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { allocateId, mutateTable, readTable, timestamp } from "@/lib/drive-store";
import { parseServiceInput, parseServiceSortOrder } from "@/lib/serviceInput";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || `service-${Date.now()}`;
}
export const GET = withAdmin(async () => {
  const rows = await readTable("services");
  rows.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || String(a.slug ?? "").localeCompare(String(b.slug ?? "")));
  return NextResponse.json({ services: rows });
});
export const POST = withAdmin(async (request: Request) => {
  const body = await request.json();
  const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";
  const parsed = parseServiceInput({ ...body, slug: rawSlug || slugify(String(body.name ?? "service")) });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const s = parsed.value;
  const result = await mutateTable("services", (document) => {
    const exists = document.rows.some((row) => String(row.slug ?? "") === s.slug || String(row.id) === s.slug);
    if (exists) return { conflict: true as const };
    const sortOrder = parseServiceSortOrder(Math.max(0, ...document.rows.map((row) => Number(row.sort_order) || 0)) + 1);
    const id = s.slug.slice(0, 100);
    document.rows.push({ id, slug: s.slug, name: s.name, name_bn: s.name_bn, category: s.category, category_bn: s.category_bn, description: s.description, description_bn: s.description_bn, best_for: s.best_for, best_for_bn: s.best_for_bn, accent: s.accent, image_url: s.image_url, sort_order: sortOrder, active: true, updated_at: timestamp() });
    return { conflict: false as const, id };
  });
  if (result.conflict) return NextResponse.json({ error: "That service slug is already in use." }, { status: 409 });
  return NextResponse.json({ ok: true, id: result.id, slug: s.slug });
});
