import mongoose from "mongoose";

/** One rating per completed booking. Feeds the worker ranking. */
const ratingSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Rating = mongoose.models.Rating || mongoose.model("Rating", ratingSchema);
export default Rating;
