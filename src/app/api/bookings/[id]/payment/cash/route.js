import { connectDB, sameId } from "@/db";
import Booking from "@/db/models/Booking";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const session = await getCurrentUser();
  if (!session) return unauthorized();
  if (session.user.role !== "customer") {
    return Response.json(
      { error: "Only the customer can confirm cash payment." },
      { status: 403 }
    );
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
        { error: "Cash payment can be confirmed only after work completion." },
        { status: 400 }
      );
    }
    if (booking.paymentStatus === "paid") {
      return Response.json({ booking: await getBookingById(id), alreadyPaid: true });
    }

    booking.paymentStatus = "paid";
    booking.paymentMethod = "cash";
    booking.paymentProvider = "pay_later";
    booking.razorpayOrderId = undefined;
    booking.razorpayPaymentId = undefined;
    booking.paidAt = new Date();
    await booking.save();

    return Response.json({
      booking: await getBookingById(id),
      message: "Cash payment confirmed successfully.",
    });
  } catch (error) {
    console.error("Cash payment error:", error);
    return Response.json(
      { error: error.message || "Could not confirm cash payment." },
      { status: 500 }
    );
  }
}
