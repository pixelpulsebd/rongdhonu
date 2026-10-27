import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { getAdminBusinessData } from "@server/api/admin/business";
import { mutateTable, timestamp } from "@/lib/drive-store";
import { isValidImageDataUri, isValidEmail, isOptionalHttpUrl, isValidSlug } from "@/lib/formValidation";

export const GET = withAdmin(async () => NextResponse.json(await getAdminBusinessData()));

export const PUT = withAdmin(async (request: Request) => {
  const body = await request.json();
  const fields = {
    name: String(body.name ?? "").trim().slice(0, 200),
    short_name: String(body.shortName ?? "").trim().slice(0, 100),
    tagline: String(body.tagline ?? "").trim().slice(0, 200),
    phone: String(body.phone ?? "").trim().slice(0, 60),
    email: String(body.email ?? "").trim().slice(0, 200),
    website: String(body.website ?? "").trim().slice(0, 200),
    address: String(body.address ?? "").trim().slice(0, 400),
    address_bn: body.addressBn ? String(body.addressBn).trim().slice(0, 400) : null,
    map_query: String(body.mapQuery ?? "").trim().slice(0, 400),
    logo_url: body.logoUrl ? String(body.logoUrl) : null,
    logo_reversed_url: body.logoReversedUrl ? String(body.logoReversedUrl) : null,
    icon_url: body.iconUrl ? String(body.iconUrl) : null,
    team_slug: String(body.teamSlug ?? "our-team").trim().slice(0, 80),
    work_slug: String(body.workSlug ?? "our-work").trim().slice(0, 80),
  };
  if (!fields.name || !fields.phone || !fields.email || !fields.address) return NextResponse.json({ error: "Name, phone, email and address are required." }, { status: 400 });
  if (!isValidEmail(fields.email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!isOptionalHttpUrl(fields.website)) return NextResponse.json({ error: "Website must start with http:// or https://." }, { status: 400 });
  if (!isValidSlug(fields.team_slug) || !isValidSlug(fields.work_slug)) return NextResponse.json({ error: "Section slugs must use lowercase letters, numbers and single hyphens." }, { status: 400 });
  if (!isValidImageDataUri(fields.logo_url) || !isValidImageDataUri(fields.logo_reversed_url) || !isValidImageDataUri(fields.icon_url)) {
    return NextResponse.json({ error: "Brand images must be PNG, JPG or WebP base64 data URIs." }, { status: 400 });
  }
  await mutateTable("business_profile", (document) => {
    const existing = document.rows.find((row) => Number(row.id) === 1);
    const value = { id: 1, ...fields, updated_at: timestamp() };
    if (existing) Object.assign(existing, value);
    else document.rows.push(value);
  });
  return NextResponse.json({ ok: true });
});
