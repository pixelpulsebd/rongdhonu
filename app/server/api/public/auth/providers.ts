import "server-only";
import { appleConfigured, googleConfigured } from "@/lib/publicOAuth";

export interface PublicAuthProvidersResponse { google: boolean; apple: boolean }
export const getPublicAuthProvidersData = (): Promise<PublicAuthProvidersResponse> =>
  Promise.resolve({ google: googleConfigured(), apple: appleConfigured() });
