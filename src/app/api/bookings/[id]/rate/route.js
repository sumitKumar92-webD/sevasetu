import { connectDB } from "@/db";
import Booking from "@/db/models/Booking";
import Rating from "@/db/models/Rating";
import Worker from "@/db/models/Worker";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getBookingById } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const session = await getCurrentUser();
  if (!session) return unauthorized();
  const { id } = await context.params;

  await connectDB();
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  const raw = await Booking.findById(id);
  if (!raw) return Response.json({ error: "Booking not found" }, { status: 404 });

  const shaped = await getBookingById(id);
  if (shaped.customerId !== session.user.id) return unauthorized("Not your booking");
  if (shaped.status !== "completed") {
    return Response.json({ error: "You can rate only completed jobs." }, { status: 400 });
  }
  if (shaped.paymentStatus !== "paid") {
    return Response.json(
      { error: "Please complete the payment before rating the worker." },
      { status: 402 }
    );
  }
  if (shaped.ratingStars) {
    return Response.json({ error: "This job is already rated." }, { status: 409 });
  }
  if (!raw.workerId) {
    return Response.json({ error: "No worker was assigned to this job." }, { status: 400 });
  }

  const body = await request.json();
  const stars = Math.min(5, Math.max(1, Number(body.stars) || 0));
  if (!stars) return Response.json({ error: "Please pick 1 to 5 stars." }, { status: 400 });

  await Rating.create({
    bookingId: raw._id,
    workerId: raw.workerId,
    customerId: raw.customerId,
    stars,
    comment: body.comment || "",
  });

  await Booking.updateOne({ _id: raw._id }, { ratingStars: stars, ratingComment: body.comment || "" });
  await Worker.updateOne({ _id: raw.workerId }, { $inc: { ratingSum: stars, ratingCount: 1 } });

  const updated = await getBookingById(id);
  return Response.json({ booking: updated });
}
