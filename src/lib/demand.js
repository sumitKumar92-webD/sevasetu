import DemandData from "@/db/models/DemandData";

/** Convert free-form address/city into a small comparable location key. */
export function normalizeLocation(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/\b\d{6}\b/g, "")
    .replace(/[^\p{L}\s,.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) || cleaned || "unknown";
}

/** Return weekday/hour in India time without changing server timezone. */
export function indiaTimeBucket(value = new Date()) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const shifted = new Date(safeDate.getTime() + 330 * 60 * 1000);
  return { dayOfWeek: shifted.getUTCDay(), hour: shifted.getUTCHours() };
}

/** Increment one aggregate bucket whenever a booking is created. */
export async function recordDemand({ serviceType, location, scheduledAt }) {
  const locationKey = normalizeLocation(location);
  const { dayOfWeek, hour } = indiaTimeBucket(scheduledAt);
  return DemandData.findOneAndUpdate(
    { serviceType, location: locationKey, dayOfWeek, hour },
    { $inc: { bookingsCount: 1 }, $set: { lastBookingAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export function demandLevel(count) {
  if (count >= 20) return "high";
  if (count >= 8) return "medium";
  return "low";
}
