import "server-only";
import { readTable, type DriveTableName } from "@/lib/drive-store";
interface AllowedField { table: DriveTableName; column: string }
const FIELDS: Record<string, Record<string, AllowedField>> = {
  services: { category: { table: "services", column: "category" }, categoryBn: { table: "services", column: "category_bn" }, bestFor: { table: "services", column: "best_for" }, bestForBn: { table: "services", column: "best_for_bn" } },
  work: { category: { table: "work_items", column: "category" }, categoryBn: { table: "work_items", column: "category_bn" }, clientName: { table: "work_items", column: "client_name" }, location: { table: "work_items", column: "location" } },
  team: { role: { table: "team_members", column: "role" }, roleBn: { table: "team_members", column: "role_bn" } },
  reviews: { role: { table: "reviews", column: "role" }, roleBn: { table: "reviews", column: "role_bn" } },
  business: { tagline: { table: "business_profile", column: "tagline" }, address: { table: "business_profile", column: "address" }, addressBn: { table: "business_profile", column: "address_bn" }, mapQuery: { table: "business_profile", column: "map_query" } },
  hero: { slot: { table: "hero_images", column: "slot" }, label: { table: "hero_images", column: "label" } },
};
export type SuggestionDataResult = { ok: true; values: string[] } | { ok: false };
export function getAdminSuggestionData(collection: string, field: string, q: string): Promise<SuggestionDataResult> {
  const definition = FIELDS[collection]?.[field];
  if (!definition) return Promise.resolve({ ok: false });
  const needle = q.trim().toLocaleLowerCase();
  return readTable(definition.table).then((rows) => ({ ok: true as const, values: [...new Set(rows.map((row) => String(row[definition.column] ?? "").trim()).filter((value) => Boolean(value) && (!needle || value.toLocaleLowerCase().includes(needle))))].sort((a, b) => a.localeCompare(b)).slice(0, 30) }));
}
