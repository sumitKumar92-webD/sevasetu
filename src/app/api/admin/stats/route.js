import { connectDB } from "@/db";
import User from "@/db/models/User";
import Worker from "@/db/models/Worker";
import Booking from "@/db/models/Booking";
import Rating from "@/db/models/Rating";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "admin") return unauthorized("Admin access only");

  await connectDB();

  const [
    totalUsers,
    customers,
    totalWorkers,
    pending,
    approved,
    online,
    totalBookings,
    completed,
    active,
    emergency,
    revenueRows,
    avgRows,
    byService,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "customer" }),
    Worker.countDocuments(),
    Worker.countDocuments({ verification: "pending" }),
    Worker.countDocuments({ verification: "approved" }),
    Worker.countDocuments({ isOnline: true }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "completed" }),
    Booking.countDocuments({ status: "on_the_way" }),
    Booking.countDocuments({ isEmergency: true }),
    Booking.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]),
    Rating.aggregate([{ $group: { _id: null, avg: { $avg: "$stars" } } }]),
    Booking.aggregate([{ $group: { _id: "$service", n: { $sum: 1 } } }]),
  ]);

  return Response.json({
    stats: {
      totalUsers,
      customers,
      totalWorkers,
      pending,
      approved,
      online,
      totalBookings,
      completed,
      active,
      emergency,
      revenue: revenueRows[0]?.total || 0,
      avgRating: Math.round(Number(avgRows[0]?.avg || 0) * 10) / 10,
      byService: byService.map((row) => ({ service: row._id, n: row.n })),
    },
  });
}
