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

/**
 * India की current date YYYY-MM-DD में।
 */
function indiaDateKey(value = new Date()) {
  return new Date(value).toLocaleDateString(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );
}

/**
 * Booking form के datetime-local value से
 * selected YYYY-MM-DD निकालता है।
 */
function selectedDateKey(value) {
  const text = String(value || "");

  if (
    /^\d{4}-\d{2}-\d{2}/.test(text)
  ) {
    return text.slice(0, 10);
  }

  return "";
}

/**
 * Booking list।
 */
export async function GET() {
  const session =
    await getCurrentUser();

  if (!session) {
    return unauthorized();
  }

  await connectDB();

  const bookings =
    await listBookingsFor(session);

  return Response.json({
    bookings,
  });
}

/**
 * नई booking बनाना।
 */
export async function POST(request) {
  const session =
    await getCurrentUser();

  if (!session) {
    return unauthorized();
  }

  if (
    session.user.role !== "customer"
  ) {
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

    const body =
      await request.json();

    /**
     * Service validate करें।
     */
    const selectedService =
      SERVICES.find(
        (service) =>
          service.key === body.service
      );

    if (!selectedService) {
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

    const service =
      selectedService.key;

    /**
     * Customer location।
     */
    const lat =
      Number(body.lat) ||
      28.6139;

    const lng =
      Number(body.lng) ||
      77.209;

    /**
     * Work date और time।
     */
    const rawScheduledAt =
      String(
        body.scheduledAt || ""
      );

    const parsedScheduledAt =
      rawScheduledAt
        ? new Date(rawScheduledAt)
        : new Date();

    const validScheduledAt =
      Number.isNaN(
        parsedScheduledAt.getTime()
      )
        ? new Date()
        : parsedScheduledAt;

    const workDateKey =
      selectedDateKey(
        rawScheduledAt
      ) ||
      indiaDateKey(
        validScheduledAt
      );

    const todayDateKey =
      indiaDateKey();

    const bookingIsToday =
      workDateKey ===
      todayDateKey;

    const isEmergency =
      Boolean(
        body.isEmergency
      );

    /**
     * Past-date booking रोकें।
     */
    if (
      workDateKey <
      todayDateKey
    ) {
      return Response.json(
        {
          error:
            "Past date ki booking nahi ho sakti.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Emergency booking केवल आज।
     */
    if (
      isEmergency &&
      !bookingIsToday
    ) {
      return Response.json(
        {
          error:
            "Emergency booking sirf aaj ke liye available hai.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * महत्वपूर्ण:
     *
     * Frontend से paymentPlan कुछ भी आए,
     * server booking date के अनुसार plan तय करेगा।
     *
     * आज:
     * after_work
     *
     * Future:
     * pay_now
     */
    const paymentPlan =
      bookingIsToday
        ? "after_work"
        : "pay_now";

    /**
     * Online payment details।
     */
    const payment =
      body.payment || {};

    const orderId =
      payment.razorpay_order_id;

    const paymentId =
      payment.razorpay_payment_id;

    const signature =
      payment.razorpay_signature;

    let paidOrder = null;

    /**
     * Future booking के लिए Razorpay payment
     * verify करना जरूरी है।
     */
    if (
      paymentPlan === "pay_now"
    ) {
      if (
        !orderId ||
        !paymentId ||
        !signature
      ) {
        return Response.json(
          {
            error:
              "Future booking ke liye online payment complete karein.",
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

      paidOrder =
        await getRazorpayOrder(
          orderId
        );

      const validOrder =
        paidOrder &&
        paidOrder.currency === "INR" &&
        Number(
          paidOrder.amount_due
        ) === 0 &&
        String(
          paidOrder.notes
            ?.customerId
        ) ===
          String(
            session.user.id
          ) &&
        paidOrder.notes
          ?.service ===
          service &&
        paidOrder.notes
          ?.isEmergency ===
          String(isEmergency) &&
        paidOrder.notes
          ?.scheduledDate ===
          workDateKey;

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

      /**
       * एक payment को दो booking में
       * use होने से रोकें।
       */
      const duplicatePayment =
        await Booking.findOne({
          razorpayPaymentId:
            paymentId,
        });

      if (
        duplicatePayment
      ) {
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
    }

    /**
     * Matching workers।
     */
    let candidates =
      await listWorkers({
        service,
        onlineOnly: true,
      });

    if (
      !candidates.length
    ) {
      candidates =
        await listWorkers({
          service,
        });
    }

    const rankedWorkers =
      rankWorkers(
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
        rankedWorkers.find(
          (worker) =>
            worker.id ===
            String(
              body.workerId
            )
        ) || null;
    }

    if (!chosenWorker) {
      chosenWorker =
        rankedWorkers[0] ||
        null;
    }

    /**
     * Booking price।
     */
    const normalPrice =
      chosenWorker
        ? Number(
            chosenWorker.pricePerHour
          )
        : Number(
            selectedService.base
          );

    const bookingPrice =
      isEmergency
        ? Math.round(
            normalPrice * 1.25
          )
        : normalPrice;

    /**
     * आज की booking में due date work time है।
     * Future booking पहले ही paid होगी।
     */
    const paymentDueAt =
      bookingIsToday
        ? validScheduledAt
        : new Date();

    /**
     * MongoDB booking data।
     */
    const bookingData = {
      customerId:
        session.user.id,

      workerId:
        chosenWorker
          ? chosenWorker.id
          : null,

      service,

      address:
        String(
          body.address || ""
        ).trim(),

      notes:
        String(
          body.notes || ""
        ).trim(),

      scheduledAt:
        validScheduledAt,

      isEmergency,

      status:
        chosenWorker
          ? "assigned"
          : "searching",

      customerLat: lat,
      customerLng: lng,

      workerLat:
        chosenWorker
          ? chosenWorker.lat
          : null,

      workerLng:
        chosenWorker
          ? chosenWorker.lng
          : null,

      price:
        paymentPlan === "pay_now"
          ? Number(
              paidOrder.amount
            ) / 100
          : bookingPrice,

      paymentPlan,

      paymentDueAt,

      paymentStatus:
        paymentPlan === "pay_now"
          ? "paid"
          : "pending",

      paymentProvider:
        paymentPlan === "pay_now"
          ? "razorpay"
          : "pay_later",
    };

    /**
     * Razorpay fields केवल future paid
     * booking में add होंगे।
     *
     * Pay-later booking में null value भी
     * save नहीं होगी।
     */
    if (
      paymentPlan === "pay_now"
    ) {
      bookingData.razorpayOrderId =
        orderId;

      bookingData.razorpayPaymentId =
        paymentId;

      bookingData.paidAt =
        new Date();
    }

    const created =
      await Booking.create(
        bookingData
      );

    const booking =
      await getBookingById(
        created._id
      );

    return Response.json({
      booking,

      matched: chosenWorker
        ? {
            id:
              chosenWorker.id,

            name:
              chosenWorker.name,

            distance:
              chosenWorker.distance,

            rating:
              chosenWorker.rating,

            score:
              chosenWorker.score,
          }
        : null,

      alternatives:
        rankedWorkers.slice(
          0,
          5
        ),
    });
  } catch (error) {
    console.error(
      "Booking creation error:",
      error
    );

    /**
     * Duplicate Razorpay payment error।
     */
    if (error?.code === 11000) {
      return Response.json(
        {
          error:
            "This payment was already used for another booking.",
        },
        {
          status: 409,
        }
      );
    }

    return Response.json(
      {
        error:
          error.message ||
          "Could not create the booking.",
      },
      {
        status: 500,
      }
    );
  }
}