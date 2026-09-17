import { connectDB, idOf, toJson } from "@/db";
import Worker from "@/db/models/Worker";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { SERVICES } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "worker") return unauthorized("Worker access only");
  await connectDB();
  const worker = await Worker.findOne({ userId: idOf(session.user.id) });
  if (!worker) return Response.json({ error: "Worker profile missing" }, { status: 404 });
  return Response.json({ worker: toJson(worker) });
}

export async function PATCH(request) {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "worker") return unauthorized("Worker access only");

  await connectDB();
  const worker = await Worker.findOne({ userId: idOf(session.user.id) });
  if (!worker) return Response.json({ error: "Worker profile missing" }, { status: 404 });

  const body = await request.json();
  const patch = {};

  if (typeof body.isOnline === "boolean") patch.isOnline = body.isOnline;
  if (typeof body.bio === "string") patch.bio = body.bio;
  if (typeof body.city === "string") patch.city = body.city;
  if (typeof body.emergencyContact === "string") {
    patch.emergencyContact = body.emergencyContact.replace(/[^0-9+ -]/g, "").slice(0, 20);
  }
  if (body.service && SERVICES.some((s) => s.key === body.service)) patch.service = body.service;
  if (body.pricePerHour !== undefined) patch.pricePerHour = Number(body.pricePerHour) || 300;
  if (body.experienceYears !== undefined) patch.experienceYears = Number(body.experienceYears) || 0;
  if (body.lat !== undefined && body.lng !== undefined) {
    patch.lat = Number(body.lat);
    patch.lng = Number(body.lng);
  }
  // "Uploads" – profile photo is stored as a compressed data-url, skill video as a link.
  if (typeof body.photoUrl === "string") {
    patch.photoUrl = body.photoUrl;
    patch.verification = "pending";
    patch.isVerified = false;
  }
  if (typeof body.videoUrl === "string") {
    patch.videoUrl = body.videoUrl;
    patch.verification = "pending";
    patch.isVerified = false;
  }

  if (!Object.keys(patch).length) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  Object.assign(worker, patch);
  await worker.save();

  return Response.json({ worker: toJson(worker) });
}
