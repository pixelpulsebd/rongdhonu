import "server-only";
import { getBusinessProfile, getBusinessPublicSummary, type BusinessProfile } from "@/lib/content";
import type { BusinessPublicSummary } from "@/app/types/public-cms";

export interface PublicBusinessResponse { business: BusinessProfile | null }
export const getPublicBusinessData = (): Promise<PublicBusinessResponse> =>
  getBusinessProfile().then((business) => ({ business }));

export interface PublicBusinessSummaryResponse { business: BusinessPublicSummary | null }
export const getPublicBusinessSummaryData = (): Promise<PublicBusinessSummaryResponse> =>
  getBusinessPublicSummary().then((business) => ({ business }));
