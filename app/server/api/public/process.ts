import "server-only";
import { getHeroImages, type HeroImageRow } from "@/lib/content";

export interface PublicProcessResponse { process: HeroImageRow[] }
export const getPublicProcessData = (): Promise<PublicProcessResponse> =>
  getHeroImages().then((items) => ({ process: items.filter((item) => item.slot !== "banner" && Boolean(item.imageUrl)) }));
