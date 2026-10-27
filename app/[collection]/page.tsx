import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicCollectionPage from "@/app/components/PublicCollectionPage";
import { getPublicBusinessData } from "@server/api/public/business";
import { getPublicServicesData } from "@server/api/public/services";
import { getPublicReviewsData } from "@server/api/public/reviews";
import { getPublicTeamData } from "@server/api/public/team";
import { getPublicWorkData } from "@server/api/public/work";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }): Promise<Metadata> {
  const { collection } = await params;
  const { business } = await getPublicBusinessData();
  if (!business) return {};
  const safeBusiness = business;
  const isServices = collection === "services";
  const isReviews = collection === "reviews";
  const isWork = collection === safeBusiness.workSlug;
  const isTeam = collection === safeBusiness.teamSlug;
  if (!isServices && !isReviews && !isWork && !isTeam) return {};
  const title = isServices ? "Services" : isReviews ? "Customer Reviews" : isWork ? "Our Work" : "Our Team";
  return { title: `${title} | ${safeBusiness.name}`, alternates: { canonical: `/${collection}` }, description: `${title} from ${safeBusiness.name}.` };
}

export default async function DynamicCollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  const { business } = await getPublicBusinessData();
  if (!business) return notFound();
  const safeBusiness = business;

  if (collection === "services") {
    const { services } = await getPublicServicesData();
    return <PublicCollectionPage data={{ collection: "services", basePath: "/services", businessName: safeBusiness.name, services }} />;
  }
  if (collection === "reviews") {
    const { reviews } = await getPublicReviewsData();
    return <PublicCollectionPage data={{ collection: "reviews", basePath: "/reviews", businessName: safeBusiness.name, reviews }} />;
  }
  if (collection === safeBusiness.workSlug) {
    const { work } = await getPublicWorkData();
    return <PublicCollectionPage data={{ collection: "work", basePath: `/${safeBusiness.workSlug}`, businessName: safeBusiness.name, work }} />;
  }
  if (collection === safeBusiness.teamSlug) {
    const { team } = await getPublicTeamData();
    return <PublicCollectionPage data={{ collection: "team", basePath: `/${safeBusiness.teamSlug}`, businessName: safeBusiness.name, team }} />;
  }

  notFound();
}
