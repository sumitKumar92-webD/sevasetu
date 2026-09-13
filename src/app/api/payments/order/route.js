import {
  getCurrentUser,
  unauthorized,
} from "@/lib/auth";

import { SERVICES } from "@/lib/services";
import { listWorkers } from "@/lib/workers";
import { rankWorkers } from "@/lib/geo";

import {
  createRazorpayOrder,
  publicRazorpayKey,
} from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const session = await getCurrentUser();

  if (!session) {
    return unauthorized();
  }

  if (session.user.role !== "customer") {
    return Response.json(
      {
        error: "Only customers can make payments.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const body = await request.json();

    const service = SERVICES.find(
      (item) => item.key === body.service
    );

    if (!service) {
      return Response.json(
        {
          error: "Please choose a valid service.",
        },
        {
          status: 400,
        }
      );
    }

    const lat = Number(body.lat) || 28.6139;
    const lng = Number(body.lng) || 77.209;
    const isEmergency = Boolean(body.isEmergency);

    let workers = await listWorkers({
      service: service.key,
      onlineOnly: true,
    });

    if (!workers.length) {
      workers = await listWorkers({
        service: service.key,
      });
    }

    const rankedWorkers = rankWorkers(
      workers,
      lat,
      lng,
      isEmergency ? "distance" : "smart"
    );

    let selectedWorker = null;

    if (body.workerId) {
      selectedWorker =
        rankedWorkers.find(
          (worker) =>
            worker.id === String(body.workerId)
        ) || rankedWorkers[0];
    } else {
      selectedWorker = rankedWorkers[0];
    }

    const normalPrice = selectedWorker
      ? selectedWorker.pricePerHour
      : service.base;

    const finalPrice = isEmergency
      ? Math.round(normalPrice * 1.25)
      : normalPrice;

    const order = await createRazorpayOrder({
      // Razorpay amount paise mein leta hai.
      amount: finalPrice * 100,

      receipt: `sevasetu_${Date.now()}`,

      notes: {
        customerId: String(session.user.id),
        service: service.key,
        isEmergency: String(isEmergency),
      },
    });

    return Response.json({
      key: publicRazorpayKey(),
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