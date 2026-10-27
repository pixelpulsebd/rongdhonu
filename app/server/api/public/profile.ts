import "server-only";
import { getPublicProfile } from "@/lib/publicProfile";

export interface PublicProfileResponse {
  profile: { name: string; email: string; phone?: string; provider?: "google" | "apple" | "form" } | null;
}

export const getPublicProfileData = (): Promise<PublicProfileResponse> =>
  getPublicProfile().then((profile) => ({
    profile: profile ? { name: profile.name, email: profile.email, phone: profile.phone, provider: profile.provider } : null,
  }));
