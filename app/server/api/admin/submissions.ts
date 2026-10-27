import "server-only";
import { readTable } from "@/lib/drive-store";
export interface AdminSubmissionsResponse { submissions: Record<string, unknown>[] }
export const getAdminSubmissionsData = (): Promise<AdminSubmissionsResponse> => readTable("contact_submissions").then((submissions) => ({ submissions: submissions.sort((a, b) => new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime()).slice(0, 500) }));
