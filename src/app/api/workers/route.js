import { connectDB } from "@/db";
import { rankWorkers } from "@/lib/geo";
import { listWorkers } from "@/lib/workers";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await ensureSeed();
    const { searchParams } = new URL(request.url);
    const service = searchParams.get("service") || "";
    const sort = searchParams.get("sort") || "smart";
    const q = (searchParams.get("q") || "").toLowerCase();
    const lat = Number(searchParams.get("lat")) || 28.6139;
    const lng = Number(searchParams.get("lng")) || 77.209;
    const onlineOnly = searchParams.get("onlineOnly") === "true";

    let rows = await listWorkers({ service, onlineOnly });
    if (q) {
      rows = rows.filter(
        (w) => w.name.toLowerCase().includes(q) || w.service.toLowerCase().includes(q)
      );
    }

    return Response.json({ workers: rankWorkers(rows, lat, lng, sort) });
  } catch (err) {
    console.error("workers list error", err);
    return Response.json({ error: "Could not load workers." }, { status: 500 });
  }
}
