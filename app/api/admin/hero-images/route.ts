import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { mutateTable, readTable, timestamp } from "@/lib/drive-store";
import { isValidImageDataUri, parseSortOrder, validateSortOrder } from "@/lib/formValidation";

export const GET = withAdmin(async () => {
  const rows = await readTable("hero_images");
  rows.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  return NextResponse.json({ heroImages: rows });
});

export const PUT = withAdmin(async (request: Request) => {
  const body = await request.json();
  const slot = String(body.slot ?? "").trim().slice(0, 60);
  const label = String(body.label ?? "").trim().slice(0, 160);
  const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
  const sortCheck = validateSortOrder(body.sortOrder);
  if (!slot || !label) return NextResponse.json({ error: "slot and label are required." }, { status: 400 });
  if (!sortCheck.ok) return NextResponse.json({ error: sortCheck.message }, { status: 400 });
  if (!isValidImageDataUri(imageUrl)) return NextResponse.json({ error: "Image must be a PNG, JPG or WebP base64 data URI." }, { status: 400 });
  await mutateTable("hero_images", (document) => {
    const existing = document.rows.find((row) => String(row.slot) === slot);
    const value = { slot, label, image_url: imageUrl, sort_order: parseSortOrder(body.sortOrder), updated_at: timestamp() };
    if (existing) Object.assign(existing, value);
    else document.rows.push(value);
  });
  return NextResponse.json({ ok: true });
});
