import { dbStatus, getDB } from "@/db";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, error } = await getDB();
  let seeded = false;

  if (ok) {
    try {
      seeded = await ensureSeed();
    } catch (err) {
      console.error("health seed error", err);
    }
  }

  return Response.json({
    status: "ok",
    app: "SevaSetu",
    db: ok,
    driver: "mongoose",
    ...dbStatus(),
    seeded,
    error: error ? "MongoDB connection failed" : null,
  });
}
