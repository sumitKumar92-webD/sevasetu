import Worker from "@/db/models/Worker";

/** Flat worker shape used by the client (name/email come from the user doc). */
export function shapeWorker(w) {
  const u = w.user || {};
  return {
    id: String(w._id),
    userId: String(w.userId || ""),
    name: u.name || "",
    phone: u.phone || "",
    email: u.email || "",
    service: w.service,
    bio: w.bio || "",
    city: w.city || "",
    pricePerHour: w.pricePerHour,
    experienceYears: w.experienceYears,
    lat: w.lat,
    lng: w.lng,
    isOnline: !!w.isOnline,
    verification: w.verification,
    photoUrl: w.photoUrl || "",
    videoUrl: w.videoUrl || "",
    ratingSum: w.ratingSum,
    ratingCount: w.ratingCount,
    jobsDone: w.jobsDone,
  };
}

/** Shared worker lookup used by the search API, bookings and admin routes. */
export async function listWorkers({ service, onlyApproved = true, onlineOnly = false } = {}) {
  const filter = {};
  if (service) filter.service = service;
  if (onlyApproved) filter.verification = "approved";
  if (onlineOnly) filter.isOnline = true;

  const docs = await Worker.find(filter).populate("user", "name phone email").lean();
  return docs.map(shapeWorker);
}
