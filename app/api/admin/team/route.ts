import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { allocateId, mutateTable, readTable, timestamp } from "@/lib/drive-store";
import { parseTeamInput, parseTeamSortOrder } from "@/lib/teamInput";
export const GET = withAdmin(async () => {
  const rows = await readTable("team_members");
  rows.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0));
  return NextResponse.json({ team: rows });
});
export const POST = withAdmin(async (request: Request) => {
  const parsed = parseTeamInput(await request.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const m = parsed.value;
  const result = await mutateTable("team_members", (document) => {
    if (document.rows.some((row) => row.slug === m.slug)) return { conflict: true as const };
    const sortOrder = parseTeamSortOrder(Math.max(0, ...document.rows.map((row) => Number(row.sort_order) || 0)) + 1);
    const id = allocateId(document);
    document.rows.push({ id, slug: m.slug, name: m.name, name_bn: m.name_bn, role: m.role, role_bn: m.role_bn, bio: m.bio, bio_bn: m.bio_bn, photo_url: m.photo_url, sort_order: sortOrder, active: true, updated_at: timestamp() });
    return { conflict: false as const, id };
  });
  if (result.conflict) return NextResponse.json({ error: "That team slug is already in use." }, { status: 409 });
  return NextResponse.json({ ok: true, id: result.id });
});
