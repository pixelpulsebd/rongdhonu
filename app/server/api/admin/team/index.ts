import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminTeamResponse { team: Record<string, unknown>[] }
export const getAdminTeamData = (): Promise<AdminTeamResponse> => readTable("team_members").then((team) => ({ team: team.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0)) }));
