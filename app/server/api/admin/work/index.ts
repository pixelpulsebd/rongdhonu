import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminWorkResponse { work: Record<string, unknown>[] }
export const getAdminWorkData = (): Promise<AdminWorkResponse> => readTable("work_items").then((work) => ({ work: work.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0)) }));
