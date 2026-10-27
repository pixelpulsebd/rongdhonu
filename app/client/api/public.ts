import { getApiJson } from "@/app/client/api/http";
import type { PublicContentResponse } from "@server/api/public/content";
import type { PublicBusinessResponse } from "@server/api/public/business";
import type { PublicHeroImagesResponse } from "@server/api/public/hero-images";
import type { PublicProcessResponse } from "@server/api/public/process";
import type { PublicReviewsResponse, PublicReviewResponse } from "@server/api/public/reviews";
import type { PublicServicesResponse, PublicServiceResponse } from "@server/api/public/services";
import type { PublicTeamResponse, PublicTeamMemberResponse } from "@server/api/public/team";
import type { PublicWorkResponse, PublicWorkItemResponse } from "@server/api/public/work";
import type { PublicProfileResponse } from "@server/api/public/profile";
import type { PublicAuthProvidersResponse } from "@server/api/public/auth/providers";
import type { PublicWorkReviewsResponse } from "@server/api/public/work/[id]/reviews";

/** Client-side functions call HTTP routes and share response contracts as type-only imports. */
export const fetchPublicContent = () => getApiJson<PublicContentResponse>("/api/public/content");
export const fetchPublicBusiness = () => getApiJson<PublicBusinessResponse>("/api/public/business");
export const fetchPublicHeroImages = () => getApiJson<PublicHeroImagesResponse>("/api/public/hero-images");
export const fetchPublicProcess = () => getApiJson<PublicProcessResponse>("/api/public/process");
export const fetchPublicReviews = () => getApiJson<PublicReviewsResponse>("/api/public/reviews");
export const fetchPublicReview = (slug: string) => getApiJson<PublicReviewResponse>(`/api/public/reviews/${encodeURIComponent(slug)}`);
export const fetchPublicServices = () => getApiJson<PublicServicesResponse>("/api/public/services");
export const fetchPublicService = (slug: string) => getApiJson<PublicServiceResponse>(`/api/public/services/${encodeURIComponent(slug)}`);
export const fetchPublicTeam = () => getApiJson<PublicTeamResponse>("/api/public/team");
export const fetchPublicTeamMember = (slug: string) => getApiJson<PublicTeamMemberResponse>(`/api/public/team/${encodeURIComponent(slug)}`);
export const fetchPublicWork = () => getApiJson<PublicWorkResponse>("/api/public/work");
export const fetchPublicWorkReviews = (workId: number) => getApiJson<PublicWorkReviewsResponse>(`/api/public/work/${encodeURIComponent(String(workId))}/reviews`, { cache: "no-store" });
export const fetchPublicProfile = () => getApiJson<PublicProfileResponse>("/api/public/profile", { cache: "no-store" });
export const fetchPublicAuthProviders = () => getApiJson<PublicAuthProvidersResponse>("/api/public/auth/providers", { cache: "no-store" });
