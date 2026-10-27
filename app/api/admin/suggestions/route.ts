import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { readTable, type DriveTableName } from "@/lib/drive-store";
type AllowedField = { table: DriveTableName; column: string };
const FIELDS: Record<string, Record<string, AllowedField>> = {
  services: { category: { table: "services", column: "category" }, categoryBn: { table: "services", column: "category_bn" }, bestFor: { table: "services", column: "best_for" }, bestForBn: { table: "services", column: "best_for_bn" } },
  work: { category: { table: "work_items", column: "category" }, categoryBn: { table: "work_items", column: "category_bn" }, clientName: { table: "work_items", column: "client_name" }, location: { table: "work_items", column: "location" } },
  team: { role: { table: "team_members", column: "role" }, roleBn: { table: "team_members", column: "role_bn" } },
  reviews: { role: { table: "reviews", column: "role" }, roleBn: { table: "reviews", column: "role_bn" } },
  business: { tagline: { table: "business_profile", column: "tagline" }, address: { table: "business_profile", column: "address" }, addressBn: { table: "business_profile", column: "address_bn" }, mapQuery: { table: "business_profile", column: "map_query" } },
  hero: { slot: { table: "hero_images", column: "slot" }, label: { table: "hero_images", column: "label" } },
};
export const GET = withAdmin(async (request: Request) => {
  const url = new URL(request.url); const collection = url.searchParams.get("collection")?.trim() ?? ""; const field = url.searchParams.get("field")?.trim() ?? ""; const q = (url.searchParams.get("q")?.trim() ?? "").toLocaleLowerCase();
  const definition = FIELDS[collection]?.[field];
  if (!definition) return NextResponse.json({ error: "Unsupported suggestion field." }, { status: 400 });
  const rows = await readTable(definition.table);
  const values = [...new Set(rows.map((row) => String(row[definition.column] ?? "").trim()).filter((value) => value && (!q || value.toLocaleLowerCase().includes(q))))].sort((a, b) => a.localeCompare(b)).slice(0, 30);
  return NextResponse.json({ values });
});
