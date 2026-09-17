import Booking from "@/db/models/Booking";

import {
  idOf,
} from "@/db";

/**
 * MongoDB booking को frontend के लिए
 * flat object में convert करता है।
 */
export function shapeBooking(
  booking
) {
  const customer =
    booking.customerId &&
    typeof booking.customerId === "object"
      ? booking.customerId
      : null;

  const worker =
    booking.workerId &&
    typeof booking.workerId === "object"
      ? booking.workerId
      : null;

  const workerUser =
    worker && worker.user
      ? worker.user
      : {};

  return {
    id: String(
      booking._id
    ),

    customerId: customer
      ? String(
          customer._id
        )
      : idOf(
          booking.customerId
        ) || null,

    workerId: worker
      ? String(
          worker._id
        )
      : idOf(
          booking.workerId
        ) || null,

    service:
      booking.service,

    address:
      booking.address || "",

    location:
      booking.location || "",

    notes:
      booking.notes || "",

    scheduledAt:
      booking.scheduledAt,

    isEmergency:
      Boolean(
        booking.isEmergency
      ),

    status:
      booking.status,

    customerLat:
      booking.customerLat,

    customerLng:
      booking.customerLng,

    workerLat:
      booking.workerLat,

    workerLng:
      booking.workerLng,

    price:
      Number(
        booking.price || 0
      ),

    paymentPlan:
      booking.paymentPlan ||
      "after_work",

    paymentDueAt:
      booking.paymentDueAt ||
      null,

    paymentStatus:
      booking.paymentStatus ||
      "pending",

    paymentProvider:
      booking.paymentProvider ||
      "pay_later",

    razorpayOrderId:
      booking.razorpayOrderId ||
      "",

    razorpayPaymentId:
      booking.razorpayPaymentId ||
      "",

    paidAt:
      booking.paidAt ||
      null,

    ratingStars:
      booking.ratingStars ??
      null,

    ratingComment:
      booking.ratingComment ||
      "",

    createdAt:
      booking.createdAt,

    updatedAt:
      booking.updatedAt,

    customerName:
      customer
        ? customer.name || ""
        : "",

    customerPhone:
      customer
        ? customer.phone || ""
        : "",

    workerName:
      workerUser
        ? workerUser.name || ""
        : "",

    workerPhone:
      workerUser
        ? workerUser.phone || ""
        : "",

    workerPhoto:
      worker
        ? worker.photoUrl || ""
        : "",

    workerVerification:
      worker
        ? worker.verification || ""
        : "",

    workerRatingSum:
      worker
        ? worker.ratingSum ?? 0
        : 0,

    workerRatingCount:
      worker
        ? worker.ratingCount ?? 0
        : 0,

    workerUserId:
      workerUser
        ? String(
            workerUser._id || ""
          )
        : "",
  };
}

/**
 * Customer और worker details populate करना।
 */
function bookingQuery() {
  return Booking.find()
    .populate(
      "customerId",
      "name phone"
    )
    .populate({
      path: "workerId",

      populate: {
        path: "user",
        select: "name phone",
      },
    });
}

/**
 * ID से एक booking प्राप्त करना।
 */
export async function getBookingById(
  id
) {
  if (
    !/^[0-9a-fA-F]{24}$/.test(
      String(id)
    )
  ) {
    return null;
  }

  const document =
    await bookingQuery().findOne({
      _id: id,
    });

  return document
    ? shapeBooking(document)
    : null;
}

/**
 * Logged-in user के अनुसार bookings।
 */
export async function listBookingsFor(
  session
) {
  const {
    user,
    worker,
  } = session;

  let filter = {};

  if (
    user.role ===
    "customer"
  ) {
    filter = {
      customerId: idOf(
        user.id
      ),
    };
  } else if (
    user.role ===
    "worker"
  ) {
    if (!worker) {
      return [];
    }

    filter = {
      workerId: idOf(
        worker.id
      ),
    };
  }

  let query =
    bookingQuery();

  if (
    user.role !==
    "admin"
  ) {
    query =
      query.find(filter);
  } else {
    query = query
      .find({})
      .limit(100);
  }

  const documents =
    await query.sort({
      createdAt: -1,
    });

  return documents.map(
    shapeBooking
  );
}