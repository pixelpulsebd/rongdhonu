import "server-only";

import { readTable } from "@/lib/drive-store";
import type { DriveRow } from "@/lib/drive-store";

export interface BusinessProfile {
  name: string; shortName: string; tagline: string; phone: string; email: string; website: string;
  address: string; addressBn: string | null; mapQuery: string; logoUrl: string | null;
  logoReversedUrl: string | null; iconUrl: string | null; teamSlug: string; workSlug: string;
  hasTeam: boolean; hasWork: boolean;
}
export interface ServiceRow {
  id: string; slug: string; name: string; nameBn: string | null; category: string; categoryBn: string | null;
  description: string; descriptionBn: string | null; bestFor: string; bestForBn: string | null;
  accent: string; imageUrl: string | null; sortOrder: number; active: boolean;
}
export interface ReviewRow {
  id: number; slug: string; name: string; role: string | null; roleBn: string | null; textEn: string;
  textBn: string | null; rating: number | null; workId: number | null; workSlug: string | null;
  workTitle: string | null; workTitleBn: string | null; sortOrder: number; active: boolean;
  createdAt: string; source?: "admin" | "user"; isPublic?: boolean;
}
export interface TeamMemberRow {
  id: number; slug: string; name: string; nameBn: string | null; role: string; roleBn: string | null;
  bio: string | null; bioBn: string | null; photoUrl: string | null; sortOrder: number; active: boolean;
}
export interface WorkRow {
  id: number; slug: string; title: string; titleBn: string | null; category: string; categoryBn: string | null;
  description: string; descriptionBn: string | null; clientName: string | null; location: string | null;
  year: number | null; imageUrl: string | null; sortOrder: number; active: boolean;
}
export interface HeroImageRow { slot: string; label: string; imageUrl: string | null; sortOrder: number; }
export interface ContactSubmissionRow {
  id: number; name: string; email: string; phone: string | null; serviceInterest: string | null;
  message: string; status: "new" | "read" | "archived"; createdAt: string;
}

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const value = String(v).trim();
  return value ? value : null;
};
const safe = (v: unknown): string => str(v) ?? "";
const num = (v: unknown): number => Number(v ?? 0);
const bool = (v: unknown): boolean => v === true || v === "true" || v === "t" || v === 1;
const dateString = (v: unknown): string => v == null ? "" : String(v);

function mapService(r: DriveRow): ServiceRow {
  return { id: String(r.id), slug: safe(r.slug) || String(r.id), name: safe(r.name), nameBn: str(r.name_bn), category: safe(r.category), categoryBn: str(r.category_bn), description: safe(r.description), descriptionBn: str(r.description_bn), bestFor: safe(r.best_for), bestForBn: str(r.best_for_bn), accent: safe(r.accent) || "red", imageUrl: str(r.image_url), sortOrder: num(r.sort_order), active: bool(r.active) };
}
function mapTeam(r: DriveRow): TeamMemberRow {
  return { id: num(r.id), slug: safe(r.slug) || `team-${num(r.id)}`, name: safe(r.name), nameBn: str(r.name_bn), role: safe(r.role), roleBn: str(r.role_bn), bio: str(r.bio), bioBn: str(r.bio_bn), photoUrl: str(r.photo_url), sortOrder: num(r.sort_order), active: bool(r.active) };
}
function mapWork(r: DriveRow): WorkRow {
  return { id: num(r.id), slug: safe(r.slug), title: safe(r.title), titleBn: str(r.title_bn), category: safe(r.category), categoryBn: str(r.category_bn), description: safe(r.description), descriptionBn: str(r.description_bn), clientName: str(r.client_name), location: str(r.location), year: r.year == null ? null : num(r.year), imageUrl: str(r.image_url), sortOrder: num(r.sort_order), active: bool(r.active) };
}
function mapReview(r: DriveRow, work?: DriveRow | null, source: "admin" | "user" = "admin"): ReviewRow {
  const id = num(r.id);
  const isUser = source === "user";
  return {
    id,
    slug: isUser ? `user-review-${id}` : (safe(r.slug) || `review-${id}`),
    name: safe(r.name), role: str(r.role), roleBn: str(r.role_bn),
    textEn: safe(isUser ? r.review_text : r.text_en), textBn: str(r.text_bn),
    rating: r.rating == null ? null : num(r.rating), workId: r.work_id == null ? null : num(r.work_id),
    workSlug: str(work?.slug), workTitle: str(work?.title), workTitleBn: str(work?.title_bn),
    sortOrder: isUser ? 100000 + id : num(r.sort_order), active: isUser ? true : bool(r.active),
    createdAt: dateString(r.created_at ?? r.updated_at), source, isPublic: true,
  };
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const [rows, team, work] = await Promise.all([readTable("business_profile"), readTable("team_members"), readTable("work_items")]);
  const row = rows.find((item) => num(item.id) === 1) ?? rows[0];
  if (!row) return null;
  const name = safe(row.name);
  const address = safe(row.address);
  const savedMapQuery = safe(row.map_query);
  const mapQuery = !savedMapQuery ? `${name}, ${address}`.trim() : savedMapQuery.toLowerCase().includes(name.toLowerCase()) ? savedMapQuery : `${name}, ${savedMapQuery}`;
  return {
    name, shortName: safe(row.short_name), tagline: safe(row.tagline), phone: safe(row.phone), email: safe(row.email), website: safe(row.website), address,
    addressBn: str(row.address_bn), mapQuery, logoUrl: str(row.logo_url), logoReversedUrl: str(row.logo_reversed_url), iconUrl: str(row.icon_url),
    teamSlug: safe(row.team_slug) || "our-team", workSlug: safe(row.work_slug) || "our-work",
    hasTeam: team.some((item) => bool(item.active)), hasWork: work.some((item) => bool(item.active)),
  };
}

export async function getActiveServices(): Promise<ServiceRow[]> {
  return (await readTable("services")).filter((r) => bool(r.active)).sort((a, b) => num(a.sort_order) - num(b.sort_order)).map(mapService);
}

export async function getActiveReviews(): Promise<ReviewRow[]> {
  const [reviews, userReviews, works] = await Promise.all([readTable("reviews"), readTable("user_reviews"), readTable("work_items")]);
  const workById = new Map(works.map((w) => [String(w.id), w]));
  const adminRows = reviews.filter((r) => bool(r.active)).map((r) => mapReview(r, r.work_id == null ? null : workById.get(String(r.work_id)), "admin"));
  const publicUserRows = userReviews.filter((r) => r.status === "visible" && workById.has(String(r.work_id)) && bool(workById.get(String(r.work_id))?.active)).map((r) => mapReview(r, workById.get(String(r.work_id)), "user"));
  return [...adminRows, ...publicUserRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

export async function getActiveTeam(): Promise<TeamMemberRow[]> {
  return (await readTable("team_members")).filter((r) => bool(r.active)).sort((a, b) => num(a.sort_order) - num(b.sort_order) || num(a.id) - num(b.id)).map(mapTeam);
}

export async function getActiveWork(): Promise<WorkRow[]> {
  return (await readTable("work_items")).filter((r) => bool(r.active)).sort((a, b) => num(a.sort_order) - num(b.sort_order) || num(a.id) - num(b.id)).map(mapWork);
}

export async function getWorkBySlug(slug: string): Promise<WorkRow | null> {
  const row = (await readTable("work_items")).find((r) => r.slug === slug && bool(r.active));
  return row ? mapWork(row) : null;
}

export async function getTeamBySlug(slug: string): Promise<TeamMemberRow | null> {
  const row = (await readTable("team_members")).find((r) => r.slug === slug && bool(r.active));
  return row ? mapTeam(row) : null;
}

export async function getReviewsForWork(workId: number): Promise<ReviewRow[]> {
  const [reviews, userReviews, works] = await Promise.all([readTable("reviews"), readTable("user_reviews"), readTable("work_items")]);
  const work = works.find((w) => num(w.id) === workId);
  if (!work) return [];
  const adminRows = reviews.filter((r) => bool(r.active) && num(r.work_id) === workId).map((r) => mapReview(r, work, "admin"));
  const publicUserRows = userReviews.filter((r) => r.status === "visible" && num(r.work_id) === workId).map((r) => mapReview(r, work, "user"));
  return [...adminRows, ...publicUserRows].sort((a, b) => (a.source === b.source ? b.createdAt.localeCompare(a.createdAt) || b.id - a.id : a.source === "admin" ? -1 : 1));
}

export async function getServiceBySlug(slug: string): Promise<ServiceRow | null> {
  const row = (await readTable("services")).find((r) => (r.slug === slug || String(r.id) === slug) && bool(r.active));
  return row ? mapService(row) : null;
}

export async function getReviewBySlug(slug: string): Promise<ReviewRow | null> {
  const [reviews, works] = await Promise.all([readTable("reviews"), readTable("work_items")]);
  const row = reviews.find((r) => (r.slug === slug || (r.slug == null && `review-${r.id}` === slug)) && bool(r.active));
  if (!row) return null;
  const work = row.work_id == null ? null : works.find((w) => num(w.id) === num(row.work_id));
  return mapReview(row, work, "admin");
}

export async function getHeroImages(): Promise<HeroImageRow[]> {
  return (await readTable("hero_images")).sort((a, b) => num(a.sort_order) - num(b.sort_order)).map((r) => ({ slot: safe(r.slot), label: safe(r.label), imageUrl: str(r.image_url), sortOrder: num(r.sort_order) }));
}

import type { BusinessPublicSummary } from "@/app/types/public-cms";

export async function getBusinessPublicSummary(): Promise<BusinessPublicSummary | null> {
  const [businessRows, team, work] = await Promise.all([readTable("business_profile"), readTable("team_members"), readTable("work_items")]);
  const row = businessRows.find((item) => num(item.id) === 1) ?? businessRows[0];
  if (!row) return null;
  return { name: safe(row.name), shortName: safe(row.short_name), tagline: safe(row.tagline), teamSlug: safe(row.team_slug) || "our-team", workSlug: safe(row.work_slug) || "our-work", hasTeam: team.some((item) => bool(item.active)), hasWork: work.some((item) => bool(item.active)) };
}

export async function getPrimaryHeroImage(): Promise<HeroImageRow | null> {
  const rows = (await readTable("hero_images")).filter((item) => Boolean(str(item.image_url))).sort((a, b) => (a.slot === "banner" ? -1 : b.slot === "banner" ? 1 : num(a.sort_order) - num(b.sort_order)));
  const row = rows[0];
  return row ? { slot: safe(row.slot), label: safe(row.label), imageUrl: str(row.image_url), sortOrder: num(row.sort_order) } : null;
}
