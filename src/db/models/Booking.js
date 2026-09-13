import mongoose from "mongoose";

/**
 * Booking + live tracking state.
 * status: searching -> assigned -> on_the_way -> completed (or cancelled)
 */
const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", default: null, index: true },
    service: { type: String, required: true, index: true },
    address: { type: String, default: "" },
    notes: { type: String, default: "" },
    scheduledAt: { type: Date, default: Date.now },
    isEmergency: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["searching", "assigned", "on_the_way", "completed", "cancelled"],
      default: "searching",
      index: true,
    },
    customerLat: { type: Number, default: 28.6139 },
    customerLng: { type: Number, default: 77.209 },
    workerLat: { type: Number, default: null },
    workerLng: { type: Number, default: null },
    price: { type: Number, default: 0 },

    paymentStatus: {
  type: String,
  enum: [
    "pending",
    "paid",
    "failed",
    "refunded",
  ],
  default: "pending",
  index: true,
},

paymentProvider: {
  type: String,
  default: "razorpay",
},

razorpayOrderId: {
  type: String,
  default: null,
  index: true,
},

razorpayPaymentId: {
  type: String,
  default: null,
  unique: true,
  sparse: true,
},

paidAt: {
  type: Date,
  default: null,
},


    // denormalised rating (kept on the booking so history renders in one query)
    ratingStars: { type: Number, default: null },
    ratingComment: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
export default Booking;
