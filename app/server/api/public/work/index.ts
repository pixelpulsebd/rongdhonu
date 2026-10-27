import "server-only";
import { getActiveWork, getWorkBySlug, type WorkRow } from "@/lib/content";

export interface PublicWorkResponse { work: WorkRow[] }
export interface PublicWorkItemResponse { work: WorkRow | null }
export const getPublicWorkData = (): Promise<PublicWorkResponse> =>
  getActiveWork().then((work) => ({ work }));
export const getPublicWorkItemData = (slug: string): Promise<PublicWorkItemResponse> =>
  getWorkBySlug(slug).then((work) => ({ work }));
