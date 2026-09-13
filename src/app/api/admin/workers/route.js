import { connectDB } from "@/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { listWorkers } from "@/lib/workers";
import { avgRating } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "admin") return unauthorized("Admin access only");
  await connectDB();
  const rows = await listWorkers({ onlyApproved: false });
  const workersList = rows
    .map((w) => ({ ...w, rating: avgRating(w) }))
    .sort((a, b) => (a.verification === "pending" ? -1 : 1) - (b.verification === "pending" ? -1 : 1));
  return Response.json({ workers: workersList });
}
