import { connectDB } from "@/db";
import Worker from "@/db/models/Worker";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { toJson } from "@/db";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "admin") return unauthorized("Admin access only");
  const { id } = await context.params;
  const body = await request.json();

  if (!["approved", "rejected", "pending"].includes(body.verification)) {
    return Response.json({ error: "Invalid verification status" }, { status: 400 });
  }

  await connectDB();
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  const worker = await Worker.findByIdAndUpdate(
    id,
    { verification: body.verification, adminNote: body.adminNote || "" },
    { new: true }
  );

  if (!worker) return Response.json({ error: "Worker not found" }, { status: 404 });
  return Response.json({ worker: toJson(worker) });
}
