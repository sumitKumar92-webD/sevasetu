import { connectDB, idOf } from "@/db";
import SafetyAlert from "@/db/models/SafetyAlert";
import Worker from "@/db/models/Worker";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "admin") return unauthorized("Admin access only");

  const { id } = await context.params;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return Response.json({ error: "Safety alert not found" }, { status: 404 });
  }
  const body = await request.json();
  if (!["acknowledged", "resolved"].includes(body.status)) {
    return Response.json({ error: "Invalid alert status" }, { status: 400 });
  }

  await connectDB();
  const patch = { status: body.status };
  if (body.status === "acknowledged") patch.acknowledgedAt = new Date();
  if (body.status === "resolved") {
    patch.resolvedAt = new Date();
    patch.resolvedBy = idOf(session.user.id);
  }

  const alert = await SafetyAlert.findByIdAndUpdate(id, patch, { new: true });
  if (!alert) return Response.json({ error: "Safety alert not found" }, { status: 404 });
  if (body.status === "resolved") {
    await Worker.updateOne({ _id: alert.workerId }, { safetyStatus: "safe" });
  }
  return Response.json({ alert });
}
