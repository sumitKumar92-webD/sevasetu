import { connectDB } from "@/db";
import SafetyAlert from "@/db/models/SafetyAlert";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "admin") return unauthorized("Admin access only");

  await connectDB();
  const docs = await SafetyAlert.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({ path: "workerId", populate: { path: "user", select: "name phone email" } })
    .lean();

  const alerts = docs.map((alert) => ({
    id: String(alert._id),
    bookingId: alert.bookingId ? String(alert.bookingId) : null,
    workerId: alert.workerId?._id ? String(alert.workerId._id) : "",
    workerName: alert.workerId?.user?.name || "Worker",
    workerPhone: alert.workerId?.user?.phone || "",
    message: alert.message,
    lat: alert.lat,
    lng: alert.lng,
    status: alert.status,
    createdAt: alert.createdAt,
  }));

  return Response.json({ alerts });
}
