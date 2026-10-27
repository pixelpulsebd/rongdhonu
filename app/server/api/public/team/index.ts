import "server-only";
import { getActiveTeam, getTeamBySlug, type TeamMemberRow } from "@/lib/content";

export interface PublicTeamResponse { team: TeamMemberRow[] }
export interface PublicTeamMemberResponse { member: TeamMemberRow | null }
export const getPublicTeamData = (): Promise<PublicTeamResponse> =>
  getActiveTeam().then((team) => ({ team }));
export const getPublicTeamMemberData = (slug: string): Promise<PublicTeamMemberResponse> =>
  getTeamBySlug(slug).then((member) => ({ member }));
