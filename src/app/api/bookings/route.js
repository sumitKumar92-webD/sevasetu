// import { connectDB } from "@/db";
// import Booking from "@/db/models/Booking";
// import { getCurrentUser, unauthorized } from "@/lib/auth";
// import { listBookingsFor, getBookingById } from "@/lib/bookings";
// import { listWorkers } from "@/lib/workers";
// import { rankWorkers } from "@/lib/geo";
// import { SERVICES } from "@/lib/services";

// export const dynamic = "force-dynamic";

// export async function GET() {
//   const session = await getCurrentUser();
//   if (!session) return unauthorized();
//   await connectDB();
//   const rows = await listBookingsFor(session);
//   return Response.json({ bookings: rows });
// }

// export async function POST(request) {
//   const session = await getCurrentUser();
//   if (!session) return unauthorized();
//   if (session.user.role !== "customer") {
//     return Response.json({ error: "Only customers can create bookings." }, { status: 403 });
//   }

//   try {
//     await connectDB();
//     const body = await request.json();
//     const service = SERVICES.some((s) => s.key === body.service) ? body.service : null;
//     if (!service) return Response.json({ error: "Please choose a valid service." }, { status: 400 });

//     const lat = Number(body.lat) || 28.6139;
//     const lng = Number(body.lng) || 77.209;
//     const isEmergency = Boolean(body.isEmergency);
//     const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date();

//     /* ---- SMART WORKER ASSIGNMENT ------------------------------------ */
//     let candidates = await listWorkers({ service, onlineOnly: true });
//     if (!candidates.length) candidates = await listWorkers({ service }); // fall back to offline pros
//     const ranked = rankWorkers(candidates, lat, lng, isEmergency ? "distance" : "smart");

//     let chosen = null;
//     if (body.workerId) {
//       chosen = ranked.find((w) => w.id === String(body.workerId)) || null;
//     }
//     if (!chosen) chosen = ranked[0] || null;

//     const svc = SERVICES.find((s) => s.key === service);
//     const price = chosen ? chosen.pricePerHour : svc.base;

//     const created = await Booking.create({
//       customerId: session.user.id,
//       workerId: chosen ? chosen.id : null,
//       service,
//       address: body.address || "",
//       notes: body.notes || "",
//       scheduledAt: isNaN(scheduledAt.getTime()) ? new Date() : scheduledAt,
//       isEmergency,
//       status: chosen ? "assigned" : "searching",
//       customerLat: lat,
//       customerLng: lng,
//       workerLat: chosen ? chosen.lat : null,
//       workerLng: chosen ? chosen.lng : null,
//       price: isEmergency ? Math.round(price * 1.25) : price,
//     });

//     const booking = await getBookingById(created._id);
//     return Response.json({
//       booking,
//       matched: chosen
//         ? { id: chosen.id, name: chosen.name, distance: chosen.distance, rating: chosen.rating, score: chosen.score }
//         : null,
//       alternatives: ranked.slice(0, 5),
//     });
//   } catch (err) {
//     console.error("booking create error", err);
//     return Response.json({ error: "Could not create the booking." }, { status: 500 });
//   }
// }


import { connectDB } from "@/db";
import Booking from "@/db/models/Booking";

import {
  getCurrentUser,
  unauthorized,
} from "@/lib/auth";

import {
  listBookingsFor,
  getBookingById,
} from "@/lib/bookings";

import { listWorkers } from "@/lib/workers";
import { rankWorkers } from "@/lib/geo";
import { SERVICES } from "@/lib/services";

import {
  getRazorpayOrder,
  verifyRazorpaySignature,
} from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();

  if (!session) {
    return unauthorized();
  }

  await connectDB();

  const rows = await listBookingsFor(session);

  return Response.json({
    bookings: rows,
  });
}

export async function POST(request) {
  const session = await getCurrentUser();

  if (!session) {
    return unauthorized();
  }

  if (session.user.role !== "customer") {
    return Response.json(
      {
        error:
          "Only customers can create bookings.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    await connectDB();

    const body = await request.json();

    const service = SERVICES.some(
      (item) => item.key === body.service
    )
      ? body.service
      : null;

    if (!service) {
      return Response.json(
        {
          error:
            "Please choose a valid service.",
        },
        {
          status: 400,
        }
      );
    }

    const lat = Number(body.lat) || 28.6139;
    const lng = Number(body.lng) || 77.209;

    const isEmergency = Boolean(
      body.isEmergency
    );

    const scheduledAt = body.scheduledAt
      ? new Date(body.scheduledAt)
      : new Date();

    /*
     * Verify Razorpay payment
     */

    const payment = body.payment || {};

    const orderId =
      payment.razorpay_order_id;

    const paymentId =
      payment.razorpay_payment_id;

    const signature =
      payment.razorpay_signature;

    if (
      !orderId ||
      !paymentId ||
      !signature
    ) {
      return Response.json(
        {
          error:
            "Complete payment before booking.",
        },
        {
          status: 402,
        }
      );
    }

    const validSignature =
      verifyRazorpaySignature(
        orderId,
        paymentId,
        signature
      );

    if (!validSignature) {
      return Response.json(
        {
          error:
            "Payment verification failed.",
        },
        {
          status: 400,
        }
      );
    }

    const paidOrder =
      await getRazorpayOrder(orderId);

    const validOrder =
      paidOrder.currency === "INR" &&
      Number(paidOrder.amount_due) === 0 &&
      String(
        paidOrder.notes?.customerId
      ) === String(session.user.id) &&
      paidOrder.notes?.service === service &&
      paidOrder.notes?.isEmergency ===
        String(isEmergency);

    if (!validOrder) {
      return Response.json(
        {
          error:
            "Payment does not match this booking.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Prevent duplicate payment usage
     */

    const duplicateBooking =
      await Booking.findOne({
        razorpayPaymentId: paymentId,
      });

    if (duplicateBooking) {
      return Response.json(
        {
          error:
            "This payment was already used.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Smart worker assignment
     */

    let candidates = await listWorkers({
      service,
      onlineOnly: true,
    });

    if (!candidates.length) {
      candidates = await listWorkers({
        service,
      });
    }

    const ranked = rankWorkers(
      candidates,
      lat,
      lng,
      isEmergency
        ? "distance"
        : "smart"
    );

    let chosenWorker = null;

    if (body.workerId) {
      chosenWorker =
        ranked.find(
          (worker) =>
            worker.id ===
            String(body.workerId)
        ) || null;
    }

    if (!chosenWorker) {
      chosenWorker = ranked[0] || null;
    }

    /*
     * Create paid booking
     */

    const created = await Booking.create({
      customerId: session.user.id,

      workerId: chosenWorker
        ? chosenWorker.id
        : null,

      service,

      address: body.address || "",

      notes: body.notes || "",

      scheduledAt: isNaN(
        scheduledAt.getTime()
      )
        ? new Date()
        : scheduledAt,

      isEmergency,

      status: chosenWorker
        ? "assigned"
        : "searching",

      customerLat: lat,
      customerLng: lng,

      workerLat: chosenWorker
        ? chosenWorker.lat
        : null,

      workerLng: chosenWorker
        ? chosenWorker.lng
        : null,

      // Verified Razorpay order amount.
      price:
        Number(paidOrder.amount) / 100,

      paymentStatus: "paid",
      paymentProvider: "razorpay",

      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,

      paidAt: new Date(),
    });

    const booking = await getBookingById(
      created._id
    );

    return Response.json({
      booking,

      matched: chosenWorker
        ? {
            id: chosenWorker.id,
            name: chosenWorker.name,
            distance:
              chosenWorker.distance,
            rating: chosenWorker.rating,
            score: chosenWorker.score,
          }
        : null,

      alternatives: ranked.slice(0, 5),
    });
  } catch (error) {
    console.error(
      "Booking creation error:",
      error
    );

    return Response.json(
      {
        error:
          "Could not create the booking.",
      },
      {
        status: 500,
      }
    );
  }
}