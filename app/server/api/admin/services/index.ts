import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminServicesResponse { services: Record<string, unknown>[] }
export const getAdminServicesData = (): Promise<AdminServicesResponse> => readTable("services").then((services) => ({ services: services.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || String(a.slug ?? "").localeCompare(String(b.slug ?? "")) ) }));
