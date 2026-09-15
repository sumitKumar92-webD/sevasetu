import { connectDB, sameId } from "@/db";
import Booking from "@/db/models/Booking";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { createRazorpayOrder, publicRazorpayKey } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const session = await getCurrentUser();
  if (!session) return unauthorized();
  if (session.user.role !== "customer") {
    return Response.json({ error: "Only customers can make payments." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }

    await connectDB();
    const booking = await Booking.findById(id);
    if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
    if (!sameId(booking.customerId, session.user.id)) return unauthorized("Not your booking.");
    if (booking.status !== "completed") {
      return Response.json(
        { error: "Payment is available after the worker completes the work." },
        { status: 400 }
      );
    }
    if (booking.paymentStatus === "paid") {
      return Response.json({ error: "This booking is already paid." }, { status: 409 });
    }
    if (booking.paymentPlan !== "after_work") {
      return Response.json(
        { error: "This booking does not require after-work payment." },
        { status: 400 }
      );
    }

    const price = Number(booking.price || 0);
    if (!Number.isFinite(price) || price <= 0) {
      return Response.json({ error: "A valid payment amount was not found." }, { status: 400 });
    }

    const order = await createRazorpayOrder({
      amount: Math.round(price * 100),
      receipt: `work_${String(booking._id).slice(-12)}_${Date.now().toString().slice(-8)}`,
      notes: {
        bookingId: String(booking._id),
        customerId: String(session.user.id),
        service: String(booking.service),
        paymentPlan: "after_work",
        paymentPurpose: "completed_work",
      },
    });

    booking.razorpayOrderId = order.id;
    booking.paymentProvider = "razorpay";
    await booking.save();

    return Response.json({ key: publicRazorpayKey(), order, bookingId: String(booking._id) });
  } catch (error) {
    console.error("After-work order error:", error);
    return Response.json(
      { error: error.message || "Could not start payment." },
      { status: 500 }
    );
  }
}
