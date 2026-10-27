import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminHeroImagesResponse { heroImages: Record<string, unknown>[] }
export const getAdminHeroImagesData = (): Promise<AdminHeroImagesResponse> =>
  readTable("hero_images").then((heroImages) => ({ heroImages: heroImages.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) }));
