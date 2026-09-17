import mongoose from "mongoose";

/** Extra profile data for users with role = worker. */
const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    service: { type: String, required: true, index: true },
    bio: { type: String, default: "" },
    city: { type: String, default: "New Delhi" },
    pricePerHour: { type: Number, default: 300, min: 0 },
    experienceYears: { type: Number, default: 1, min: 0 },
    lat: { type: Number, default: 28.6139 },
    lng: { type: Number, default: 77.209 },
    isOnline: { type: Boolean, default: false },
    verification: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    // Kept in sync with verification for simple API/UI checks.
    isVerified: { type: Boolean, default: false, index: true },
    insuranceStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    emergencyContact: { type: String, default: "" },
    safetyStatus: {
      type: String,
      enum: ["safe", "on-job", "completed", "emergency"],
      default: "safe",
      index: true,
    },
    photoUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    adminNote: { type: String, default: "" },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    jobsDone: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* Virtual link to the linked user account (name, phone, email). */
workerSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

export const Worker = mongoose.models.Worker || mongoose.model("Worker", workerSchema);
export default Worker;
