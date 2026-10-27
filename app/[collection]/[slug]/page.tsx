import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicDetailPage from "@/app/components/PublicDetailPage";
import { getPublicBusinessData } from "@server/api/public/business";
import { getPublicServiceData } from "@server/api/public/services";
import { getPublicReviewData, getPublicWorkReviewsData } from "@server/api/public/reviews";
import { getPublicTeamMemberData } from "@server/api/public/team";
import { getPublicWorkItemData } from "@server/api/public/work";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ collection: string; slug: string }> }): Promise<Metadata> {
  const { collection, slug } = await params;
  const { business } = await getPublicBusinessData();
  if (!business) return {};
  const safeBusiness = business;

  if (collection === "services") {
    const { service: item } = await getPublicServiceData(slug); if (!item) return {};
    return { title: item.name, description: item.description, alternates: { canonical: `/services/${item.slug}` } };
  }
  if (collection === "reviews") {
    const { review: item } = await getPublicReviewData(slug); if (!item) return {};
    return { title: `${item.name} — Client Review`, description: item.textEn, alternates: { canonical: `/reviews/${item.slug}` } };
  }
  if (collection === safeBusiness.workSlug) {
    const { work: item } = await getPublicWorkItemData(slug); if (!item) return {};
    return { title: item.title, description: item.description, alternates: { canonical: `/${safeBusiness.workSlug}/${item.slug}` } };
  }
  if (collection === safeBusiness.teamSlug) {
    const { member: item } = await getPublicTeamMemberData(slug); if (!item) return {};
    return { title: item.name, description: item.bio || `${item.name} at ${safeBusiness.name}.`, alternates: { canonical: `/${safeBusiness.teamSlug}/${item.slug}` } };
  }
  return {};
}

export default async function DynamicDetailPage({ params }: { params: Promise<{ collection: string; slug: string }> }) {
  const { collection, slug } = await params;
  const { business } = await getPublicBusinessData();
  if (!business) return notFound();
  const safeBusiness = business;

  if (collection === "services") {
    const { service } = await getPublicServiceData(slug); if (!service) return notFound();
    return <PublicDetailPage data={{ kind: "service", basePath: "/services", businessEmail: safeBusiness.email, service }} />;
  }
  if (collection === "reviews") {
    const { review } = await getPublicReviewData(slug); if (!review) return notFound();
    return <PublicDetailPage data={{ kind: "review", basePath: "/reviews", workBasePath: `/${safeBusiness.workSlug}`, businessEmail: safeBusiness.email, review }} />;
  }
  if (collection === safeBusiness.workSlug) {
    const { work } = await getPublicWorkItemData(slug); if (!work) return notFound();
    const { reviews } = await getPublicWorkReviewsData(work.id);
    return <PublicDetailPage data={{ kind: "work", basePath: `/${safeBusiness.workSlug}`, businessEmail: safeBusiness.email, work: { ...work, reviews } }} />;
  }
  if (collection === safeBusiness.teamSlug) {
    const { member: team } = await getPublicTeamMemberData(slug); if (!team) return notFound();
    return <PublicDetailPage data={{ kind: "team", basePath: `/${safeBusiness.teamSlug}`, businessEmail: safeBusiness.email, team }} />;
  }
  notFound();
}
