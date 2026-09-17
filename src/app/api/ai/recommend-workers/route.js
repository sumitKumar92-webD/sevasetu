import { connectDB } from "@/db";
import DemandData from "@/db/models/DemandData";
import { SERVICES } from "@/lib/services";
import { listWorkers } from "@/lib/workers";
import { rankWorkers } from "@/lib/geo";
import { demandLevel, indiaTimeBucket, normalizeLocation } from "@/lib/demand";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Beginner-friendly recommendation: historical counts + existing smart ranking. */
export async function GET(request) {
  try {
    await connectDB();
    await ensureSeed();

    const { searchParams } = new URL(request.url);
    const requestedService = String(searchParams.get("service") || "").trim();
    const location = normalizeLocation(searchParams.get("location") || "delhi");
    const lat = Number(searchParams.get("lat")) || 28.6139;
    const lng = Number(searchParams.get("lng")) || 77.209;

    if (requestedService && !SERVICES.some((item) => item.key === requestedService)) {
      return Response.json({ error: "Please choose a valid service." }, { status: 400 });
    }

    const topServices = await DemandData.aggregate([
      { $match: { location } },
      { $group: { _id: "$serviceType", bookingsCount: { $sum: "$bookingsCount" } } },
      { $sort: { bookingsCount: -1 } },
      { $limit: 5 },
    ]);

    const service = requestedService || topServices[0]?._id || "plumber";
    const areaEntry = topServices.find((row) => row._id === service);
    const areaBookingsCount = Number(areaEntry?.bookingsCount || 0);
    const { dayOfWeek, hour } = indiaTimeBucket();
    const timeEntry = await DemandData.findOne({
      serviceType: service,
      location,
      dayOfWeek,
      hour,
    }).lean();

    let workers = await listWorkers({ service, onlineOnly: true });
    if (!workers.length) workers = await listWorkers({ service });
    const ranked = rankWorkers(workers, lat, lng, "smart");
    const recommendedWorker = ranked[0]
      ? { ...ranked[0], recommended: true, recommendationReason: "Best available match for this service and location" }
      : null;
    const level = demandLevel(areaBookingsCount);

    return Response.json({
      requestedService: service,
      location,
      demand: {
        bookingsCount: areaBookingsCount,
        currentTimeBookings: Number(timeEntry?.bookingsCount || 0),
        dayOfWeek,
        hour,
        level,
        highDemandArea: level === "high",
      },
      topServices: topServices.map((row) => ({
        serviceType: row._id,
        bookingsCount: row.bookingsCount,
      })),
      recommendedWorker,
      alternatives: ranked.slice(1, 4),
    });
  } catch (error) {
    console.error("Worker recommendation error:", error);
    return Response.json(
      { error: error.message || "Could not calculate recommendation." },
      { status: 500 }
    );
  }
}
