import { connectDB, idOf } from "@/db";
import Worker from "@/db/models/Worker";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.user.role !== "worker" || !session.worker) {
    return unauthorized("Worker access only");
  }

  await connectDB();
  const worker = await Worker.findById(idOf(session.worker.id)).lean();
  if (!worker) return Response.json({ error: "Worker profile missing" }, { status: 404 });

  const isVerified = worker.verification === "approved" || worker.isVerified === true;
  return Response.json({
    worker: {
      isVerified,
      verification: worker.verification,
      insuranceStatus: worker.insuranceStatus || "inactive",
      emergencyContact: worker.emergencyContact || "",
      safetyStatus: worker.safetyStatus || "safe",
    },
    benefits: [
      {
        name: "Accident Support",
        status: worker.insuranceStatus === "active" ? "active" : "inactive",
        description: "Insurance-linked accident support status.",
      },
      {
        name: "Emergency Assistance",
        status: "available",
        description: "Send a location-aware SOS alert to administrators.",
      },
      {
        name: "Skill Development",
        status: isVerified ? "eligible" : "verification-required",
        description: "Verified workers can be considered for skill programmes.",
      },
    ],
  });
}
