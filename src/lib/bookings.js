import Booking from "@/db/models/Booking";
import { idOf } from "@/db";

/** Flat booking shape (names denormalised for the UI in a single query). */
export function shapeBooking(b) {
  const customer = b.customerId && typeof b.customerId === "object" ? b.customerId : null;
  const worker = b.workerId && typeof b.workerId === "object" ? b.workerId : null;
  const workerUser = worker && worker.user ? worker.user : {};

  return {
    id: String(b._id),
    customerId: customer ? String(customer._id) : idOf(b.customerId) || null,
    workerId: worker ? String(worker._id) : idOf(b.workerId) || null,
    service: b.service,
    address: b.address || "",
    notes: b.notes || "",
    scheduledAt: b.scheduledAt,
    isEmergency: !!b.isEmergency,
    status: b.status,
    customerLat: b.customerLat,
    customerLng: b.customerLng,
    workerLat: b.workerLat,
    workerLng: b.workerLng,
    price: b.price,
    ratingStars: b.ratingStars ?? null,
    ratingComment: b.ratingComment || "",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    customerName: customer ? customer.name || "" : "",
    customerPhone: customer ? customer.phone || "" : "",
    workerName: workerUser ? workerUser.name || "" : "",
    workerPhone: workerUser ? workerUser.phone || "" : "",
    workerPhoto: worker ? worker.photoUrl || "" : "",
    workerVerification: worker ? worker.verification || "" : "",
    workerRatingSum: worker ? worker.ratingSum ?? 0 : 0,
    workerRatingCount: worker ? worker.ratingCount ?? 0 : 0,
    workerUserId: workerUser ? String(workerUser._id || "") : "",
  };
}

function bookingQuery() {
  return Booking.find()
    .populate("customerId", "name phone")
    .populate({ path: "workerId", populate: { path: "user", select: "name phone" } });
}

export async function getBookingById(id) {
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) return null;
  const doc = await bookingQuery().findOne({ _id: id });
  return doc ? shapeBooking(doc) : null;
}

export async function listBookingsFor(session) {
  const { user, worker } = session;
  let filter = {};

  if (user.role === "customer") {
    filter = { customerId: idOf(user.id) };
  } else if (user.role === "worker") {
    if (!worker) return [];
    filter = { workerId: idOf(worker.id) };
  }

  let query = bookingQuery();
  if (user.role !== "admin") query = query.find(filter);
  else query = query.find({}).limit(100);

  const docs = await query.sort({ createdAt: -1 });
  return docs.map(shapeBooking);
}
