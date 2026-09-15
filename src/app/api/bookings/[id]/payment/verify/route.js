import { connectDB, sameId } from "@/db";
import Booking from "@/db/models/Booking";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";
import { getRazorpayOrder, verifyRazorpaySignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const session = await getCurrentUser();
  if (!session) return unauthorized();
  if (session.user.role !== "customer") {
    return Response.json({ error: "Only customers can verify payments." }, { status: 403 });
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

    if (booking.paymentStatus === "paid") {
      return Response.json({ booking: await getBookingById(id), alreadyPaid: true });
    }
    if (booking.status !== "completed") {
      return Response.json({ error: "Work is not completed yet." }, { status: 400 });
    }

    const body = await request.json();
    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    if (!orderId || !paymentId || !signature) {
      return Response.json({ error: "Incomplete payment details." }, { status: 400 });
    }
    if (String(booking.razorpayOrderId || "") !== String(orderId)) {
      return Response.json(
        { error: "Payment order does not match this booking." },
        { status: 400 }
      );
    }
    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      return Response.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const order = await getRazorpayOrder(orderId);
    const expectedAmount = Math.round(Number(booking.price || 0) * 100);
    const validOrder =
      order &&
      order.currency === "INR" &&
      Number(order.amount) === expectedAmount &&
      Number(order.amount_paid) === expectedAmount &&
      Number(order.amount_due) === 0 &&
      String(order.notes?.bookingId || "") === String(booking._id) &&
      String(order.notes?.customerId || "") === String(session.user.id) &&
      order.notes?.paymentPlan === "after_work";

    if (!validOrder) {
      return Response.json(
        { error: "Payment does not match the booking amount." },
        { status: 400 }
      );
    }

    const duplicate = await Booking.findOne({
      razorpayPaymentId: paymentId,
      _id: { $ne: booking._id },
    });
    if (duplicate) {
      return Response.json({ error: "This payment was already used." }, { status: 409 });
    }

    booking.paymentStatus = "paid";
    booking.paymentMethod = "online";
    booking.paymentProvider = "razorpay";
    booking.razorpayOrderId = orderId;
    booking.razorpayPaymentId = paymentId;
    booking.paidAt = new Date();
    await booking.save();

    return Response.json({
      booking: await getBookingById(id),
      message: "Payment completed successfully.",
    });
  } catch (error) {
    console.error("After-work payment verification error:", error);
    if (error?.code === 11000) {
      return Response.json({ error: "This payment was already used." }, { status: 409 });
    }
    return Response.json(
      { error: error.message || "Could not verify payment." },
      { status: 500 }
    );
  }
}
