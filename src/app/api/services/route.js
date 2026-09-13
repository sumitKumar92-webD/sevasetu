import { SERVICES } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ services: SERVICES });
}
