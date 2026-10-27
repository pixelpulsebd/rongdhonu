import "server-only";
import {
  getActiveReviews,
  getActiveServices,
  getActiveTeam,
  getActiveWork,
  getBusinessProfile,
  getHeroImages,
  type BusinessProfile,
  type HeroImageRow,
  type ReviewRow,
  type ServiceRow,
  type TeamMemberRow,
  type WorkRow,
} from "@/lib/content";

export interface PublicContentResponse {
  business: BusinessProfile | null;
  services: ServiceRow[];
  reviews: ReviewRow[];
  team: TeamMemberRow[];
  work: WorkRow[];
  heroImages: HeroImageRow[];
}

/** Server-side aggregate loader; returns a Promise without async/await syntax. */
export function getPublicContentData(): Promise<PublicContentResponse> {
  return Promise.all([
    getBusinessProfile(),
    getActiveServices(),
    getActiveReviews(),
    getActiveTeam(),
    getActiveWork(),
    getHeroImages(),
  ]).then(([business, services, reviews, team, work, heroImages]) => ({
    business,
    services,
    reviews,
    team,
    work,
    heroImages,
  }));
}
