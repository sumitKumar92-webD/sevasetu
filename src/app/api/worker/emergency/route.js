import { connectDB, idOf, sameId } from "@/db";
import Booking from "@/db/models/Booking";
import SafetyAlert from "@/db/models/SafetyAlert";
import Worker from "@/db/models/Worker";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "worker" || !session.worker) {
    return unauthorized("Worker access only");
  }

  try {
    await connectDB();
    const body = await request.json();
    const worker = await Worker.findById(idOf(session.worker.id));
    if (!worker) return Response.json({ error: "Worker profile missing" }, { status: 404 });

    let booking = null;
    if (body.bookingId) {
      if (!/^[0-9a-fA-F]{24}$/.test(String(body.bookingId))) {
        return Response.json({ error: "Invalid booking ID" }, { status: 400 });
      }
      booking = await Booking.findById(body.bookingId);
      if (!booking || !sameId(booking.workerId, worker._id)) {
        return Response.json({ error: "This booking is not assigned to you." }, { status: 403 });
      }
    }

    const existing = await SafetyAlert.findOne({
      workerId: worker._id,
      bookingId: booking?._id || null,
      status: { $in: ["open", "acknowledged"] },
    });
    if (existing) {
      return Response.json({ success: true, alert: existing, alreadyOpen: true });
    }

    const lat = Number.isFinite(Number(body.lat)) ? Number(body.lat) : worker.lat;
    const lng = Number.isFinite(Number(body.lng)) ? Number(body.lng) : worker.lng;
    const message = String(body.message || "Worker requested emergency assistance").trim().slice(0, 500);

    const alert = await SafetyAlert.create({
      workerId: worker._id,
      bookingId: booking?._id || null,
      message,
      lat,
      lng,
    });

    worker.safetyStatus = "emergency";
    worker.lat = lat;
    worker.lng = lng;
    await worker.save();

    return Response.json({ success: true, message: "Emergency alert sent to admin.", alert });
  } catch (error) {
    console.error("Worker emergency error:", error);
    return Response.json({ error: error.message || "Could not send emergency alert." }, { status: 500 });
  }
}
