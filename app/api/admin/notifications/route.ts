import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiGuard";
import { readTable } from "@/lib/drive-store";
export const GET = withAdmin(async () => {
  const [reviews, submissions] = await Promise.all([readTable("user_reviews"), readTable("contact_submissions")]);
  return NextResponse.json({ pendingReviews: reviews.filter((row) => row.status === "pending").length, newEnquiries: submissions.filter((row) => row.status === "new").length }, { headers: { "Cache-Control": "private, no-store" } });
});
