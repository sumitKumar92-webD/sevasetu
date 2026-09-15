import mongoose from "mongoose";

/**
 * Booking status:
 *
 * searching
 * assigned
 * on_the_way
 * completed
 * cancelled
 *
 * Payment rule:
 *
 * आज की booking:
 * paymentPlan = after_work
 *
 * Future booking:
 * paymentPlan = pay_now
 */
const bookingSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      default: null,
      index: true,
    },

    service: {
      type: String,
      required: true,
      index: true,
    },

    address: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },

    scheduledAt: {
      type: Date,
      default: Date.now,
    },

    isEmergency: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,

      enum: [
        "searching",
        "assigned",
        "on_the_way",
        "completed",
        "cancelled",
      ],

      default: "searching",
      index: true,
    },

    customerLat: {
      type: Number,
      default: 28.6139,
    },

    customerLng: {
      type: Number,
      default: 77.209,
    },

    workerLat: {
      type: Number,
      default: null,
    },

    workerLng: {
      type: Number,
      default: null,
    },

    price: {
      type: Number,
      default: 0,
    },

    /**
     * आज:
     * after_work
     *
     * Future date:
     * pay_now
     */
    paymentPlan: {
      type: String,

      enum: [
        "pay_now",
        "after_work",
      ],

      default: "after_work",
      index: true,
    },

    /**
     * आज की booking में selected work date/time।
     * Future booking में payment का current time।
     */
    paymentDueAt: {
      type: Date,
      default: null,
      index: true,
    },

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

    /**
     * razorpay:
     * Future-date online payment
     *
     * pay_later:
     * आज काम पूरा होने के बाद payment
     */
    paymentProvider: {
      type: String,

      enum: [
        "razorpay",
        "pay_later",
      ],

      default: "pay_later",
    },

    razorpayOrderId: {
      type: String,
      default: undefined,
    },

    /**
     * इसे inline unique:true नहीं रखना है।
     * नीचे partial unique index लगाया गया है।
     */
    razorpayPaymentId: {
      type: String,
      default: undefined,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    ratingStars: {
      type: Number,
      default: null,
    },

    ratingComment: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Unique index केवल उन्हीं documents पर लगेगा
 * जिनमें actual Razorpay payment ID मौजूद है।
 *
 * Pay-later booking में razorpayPaymentId field
 * मौजूद नहीं होगी, इसलिए duplicate null error नहीं आएगा।
 */
bookingSchema.index(
  {
    razorpayPaymentId: 1,
  },
  {
    name: "razorpayPaymentId_1",
    unique: true,

    partialFilterExpression: {
      razorpayPaymentId: {
        $type: "string",
      },
    },
  }
);

export const Booking =
  mongoose.models.Booking ||
  mongoose.model(
    "Booking",
    bookingSchema
  );

export default Booking;