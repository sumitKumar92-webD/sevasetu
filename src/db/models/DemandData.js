import mongoose from "mongoose";

/**
 * Aggregated demand bucket used by the beginner-friendly forecasting feature.
 * One document represents bookings for one service, area, weekday and hour.
 */
const demandDataSchema = new mongoose.Schema(
  {
    serviceType: { type: String, required: true, index: true },
    location: { type: String, required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    hour: { type: Number, required: true, min: 0, max: 23 },
    bookingsCount: { type: Number, default: 0, min: 0 },
    lastBookingAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

demandDataSchema.index(
  { serviceType: 1, location: 1, dayOfWeek: 1, hour: 1 },
  { unique: true, name: "service_location_time_1" }
);

export const DemandData =
  mongoose.models.DemandData || mongoose.model("DemandData", demandDataSchema);
export default DemandData;
