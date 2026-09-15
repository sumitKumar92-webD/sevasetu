import {
  getCurrentUser,
  unauthorized,
} from "@/lib/auth";

import {
  SERVICES,
} from "@/lib/services";

import {
  listWorkers,
} from "@/lib/workers";

import {
  rankWorkers,
} from "@/lib/geo";

import {
  createRazorpayOrder,
  publicRazorpayKey,
} from "@/lib/razorpay";

export const dynamic =
  "force-dynamic";

/**
 * India की current date YYYY-MM-DD में।
 */
function indiaDateKey(
  value = new Date()
) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );
}

/**
 * datetime-local value से YYYY-MM-DD।
 */
function selectedDateKey(
  value
) {
  const text =
    String(value || "");

  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      text
    )
  ) {
    return text.slice(0, 10);
  }

  return "";
}

/**
 * Future-date booking के लिए
 * Razorpay order create करना।
 */
export async function POST(
  request
) {
  const session =
    await getCurrentUser();

  if (!session) {
    return unauthorized();
  }

  if (
    session.user.role !==
    "customer"
  ) {
    return Response.json(
      {
        error:
          "Only customers can make payments.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const body =
      await request.json();

    /**
     * Service validate करें।
     */
    const selectedService =
      SERVICES.find(
        (service) =>
          service.key ===
          body.service
      );

    if (
      !selectedService
    ) {
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

    /**
     * Selected booking date।
     */
    const workDateKey =
      selectedDateKey(
        body.scheduledAt
      );

    if (!workDateKey) {
      return Response.json(
        {
          error:
            "Please choose a valid booking date.",
        },
        {
          status: 400,
        }
      );
    }

    const todayDateKey =
      indiaDateKey();

    /**
     * Past date रोकें।
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
     * आज की booking में Razorpay payment नहीं।
     * आज payment काम पूरा होने के बाद होगी।
     */
    if (
      workDateKey ===
      todayDateKey
    ) {
      return Response.json(
        {
          error:
            "Aaj ki booking ka payment kaam complete hone ke baad hoga.",
        },
        {
          status: 400,
        }
      );
    }

    const isEmergency =
      Boolean(
        body.isEmergency
      );

    /**
     * Future emergency booking allowed नहीं।
     */
    if (isEmergency) {
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

    const lat =
      Number(body.lat) ||
      28.6139;

    const lng =
      Number(body.lng) ||
      77.209;

    /**
     * Worker selection।
     */
    let workers =
      await listWorkers({
        service:
          selectedService.key,

        onlineOnly: true,
      });

    if (
      !workers.length
    ) {
      workers =
        await listWorkers({
          service:
            selectedService.key,
        });
    }

    const rankedWorkers =
      rankWorkers(
        workers,
        lat,
        lng,
        "smart"
      );

    let selectedWorker =
      null;

    if (body.workerId) {
      selectedWorker =
        rankedWorkers.find(
          (worker) =>
            worker.id ===
            String(
              body.workerId
            )
        ) ||
        rankedWorkers[0] ||
        null;
    } else {
      selectedWorker =
        rankedWorkers[0] ||
        null;
    }

    /**
     * Worker नहीं मिले तो service base price।
     */
    const normalPrice =
      selectedWorker
        ? Number(
            selectedWorker.pricePerHour
          )
        : Number(
            selectedService.base
          );

    if (
      !Number.isFinite(
        normalPrice
      ) ||
      normalPrice <= 0
    ) {
      return Response.json(
        {
          error:
            "Valid booking price could not be calculated.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Future normal booking पर emergency
     * surcharge नहीं लगेगा।
     */
    const finalPrice =
      normalPrice;

    const order =
      await createRazorpayOrder({
        /**
         * Razorpay amount paise में लेता है।
         */
        amount:
          Math.round(
            finalPrice * 100
          ),

        receipt:
          `sevasetu_${Date.now()}`,

        notes: {
          customerId:
            String(
              session.user.id
            ),

          service:
            selectedService.key,

          isEmergency:
            "false",

          scheduledDate:
            workDateKey,

          paymentPlan:
            "pay_now",
        },
      });

    return Response.json({
      key:
        publicRazorpayKey(),

      order,
    });
  } catch (error) {
    console.error(
      "Razorpay order creation error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "Could not start payment.",
      },
      {
        status: 500,
      }
    );
  }
}