import "server-only";
import { getHeroImages, getPrimaryHeroImage, type HeroImageRow } from "@/lib/content";

export interface PublicHeroImagesResponse { heroImages: HeroImageRow[] }
export const getPublicHeroImagesData = (): Promise<PublicHeroImagesResponse> =>
  getHeroImages().then((heroImages) => ({ heroImages }));

export interface PublicPrimaryHeroResponse { initialHero: HeroImageRow | null }
export const getPublicPrimaryHeroData = (): Promise<PublicPrimaryHeroResponse> =>
  getPrimaryHeroImage().then((initialHero) => ({ initialHero }));
