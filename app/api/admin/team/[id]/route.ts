import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { mutateTable, timestamp } from "@/lib/drive-store";
import { parseTeamInput, parseTeamSortOrder } from "@/lib/teamInput";
export const PUT = withAdmin(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = parseTeamInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const m = parsed.value;
  const result = await mutateTable("team_members", (document) => {
    if (document.rows.some((row) => row.slug === m.slug && String(row.id) !== id)) return "duplicate" as const;
    const row = document.rows.find((item) => String(item.id) === id);
    if (!row) return "missing" as const;
    Object.assign(row, { slug: m.slug, name: m.name, name_bn: m.name_bn, role: m.role, role_bn: m.role_bn, bio: m.bio, bio_bn: m.bio_bn, photo_url: m.photo_url, active: body.active !== false, sort_order: parseTeamSortOrder(body.sortOrder), updated_at: timestamp() });
    return "ok" as const;
  });
  if (result === "duplicate") return NextResponse.json({ error: "That team slug is already in use." }, { status: 409 });
  if (result === "missing") return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
export const DELETE = withAdmin(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  await mutateTable("team_members", (document) => { document.rows = document.rows.filter((row) => String(row.id) !== id); });
  return NextResponse.json({ ok: true });
});
