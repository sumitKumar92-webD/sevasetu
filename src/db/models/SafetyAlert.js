import mongoose from "mongoose";

/** Persistent worker SOS alert visible to administrators. */
const safetyAlertSchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    message: { type: String, default: "Worker requested emergency assistance" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved"],
      default: "open",
      index: true,
    },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const SafetyAlert =
  mongoose.models.SafetyAlert || mongoose.model("SafetyAlert", safetyAlertSchema);
export default SafetyAlert;
