import "server-only";
import { getActiveServices, getServiceBySlug, type ServiceRow } from "@/lib/content";

export interface PublicServicesResponse { services: ServiceRow[] }
export interface PublicServiceResponse { service: ServiceRow | null }
export const getPublicServicesData = (): Promise<PublicServicesResponse> =>
  getActiveServices().then((services) => ({ services }));
export const getPublicServiceData = (slug: string): Promise<PublicServiceResponse> =>
  getServiceBySlug(slug).then((service) => ({ service }));
