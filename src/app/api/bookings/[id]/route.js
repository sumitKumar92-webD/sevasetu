import { connectDB, idOf, sameId } from "@/db";
import Booking from "@/db/models/Booking";
import Worker from "@/db/models/Worker";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";
import { listWorkers } from "@/lib/workers";
import { rankWorkers, stepTowards } from "@/lib/geo";

export const dynamic = "force-dynamic";

const ALLOWED = ["searching", "assigned", "on_the_way", "completed", "cancelled"];

function canSee(session, booking) {
  if (session.user.role === "admin") return true;
  if (session.user.role === "customer") return sameId(booking.customerId, session.user.id);
  return session.worker ? sameId(booking.workerId, session.worker.id) : false;
}

export async function GET(request, context) {
  const session = await getCurrentUser();
  if (!session) return unauthorized();
  const { id } = await context.params;
  await connectDB();
  const booking = await getBookingById(id);
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  if (!canSee(session, booking)) return unauthorized("Not your booking");
  return Response.json({ booking });
}

export async function PATCH(request, context) {
  const session = await getCurrentUser();
  if (!session) return unauthorized();
  const { id } = await context.params;

  await connectDB();
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  const raw = await Booking.findById(id);
  if (!raw) return Response.json({ error: "Booking not found" }, { status: 404 });

  const shaped = await getBookingById(id);
  if (!shaped) return Response.json({ error: "Booking not found" }, { status: 404 });
  if (!canSee(session, shaped)) return unauthorized("Not your booking");

  const body = await request.json();
  const patch = {};

  /* Worker pushes its live GPS position (the "socket ping" of this app) */
  if (body.action === "location" && body.lat && body.lng) {
    patch.workerLat = Number(body.lat);
    patch.workerLng = Number(body.lng);
    if (session.worker) {
      await Worker.updateOne(
        { _id: idOf(session.worker.id) },
        { lat: Number(body.lat), lng: Number(body.lng) }
      );
    }
  }

  /* Demo movement: nudge the worker marker towards the customer */
  if (body.action === "simulate" && raw.workerLat != null) {
    const next = stepTowards(raw.workerLat, raw.workerLng, raw.customerLat, raw.customerLng, 0.2);
    patch.workerLat = next.lat;
    patch.workerLng = next.lng;
  }

  /* Customer asks for another matching round */
  if (body.action === "reassign") {
    let candidates = await listWorkers({ service: raw.service, onlineOnly: true });
    if (!candidates.length) candidates = await listWorkers({ service: raw.service });
    const ranked = rankWorkers(candidates, raw.customerLat, raw.customerLng, "smart");
    const chosen = ranked.find((w) => !sameId(w.id, raw.workerId)) || ranked[0];
    if (chosen) {
      patch.workerId = idOf(chosen.id);
      patch.workerLat = chosen.lat;
      patch.workerLng = chosen.lng;
      patch.status = "assigned";
      patch.price = raw.isEmergency
        ? Math.round(chosen.pricePerHour * 1.25)
        : chosen.pricePerHour;
    }
  }

  if (body.status && ALLOWED.includes(body.status)) {
    patch.status = body.status;
    if (raw.workerId && body.status === "on_the_way") {
      await Worker.updateOne({ _id: raw.workerId }, { safetyStatus: "on-job" });
    }
    if (body.status === "completed" && raw.workerId) {
      await Worker.updateOne(
        { _id: raw.workerId },
        { $inc: { jobsDone: 1 }, $set: { safetyStatus: "completed" } }
      );
    }
    if (raw.workerId && body.status === "cancelled") {
      await Worker.updateOne({ _id: raw.workerId }, { safetyStatus: "safe" });
    }
  }

  await Booking.updateOne({ _id: raw._id }, patch);
  const updated = await getBookingById(id);
  return Response.json({ booking: updated });
}
