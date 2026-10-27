import "server-only";
import { getBusinessProfile, type BusinessProfile } from "@/lib/content";

export interface AdminBusinessResponse { business: BusinessProfile | null }
export const getAdminBusinessData = (): Promise<AdminBusinessResponse> =>
  getBusinessProfile().then((business) => ({ business }));
