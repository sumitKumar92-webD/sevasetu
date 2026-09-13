import { clearAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAuthCookie();
  return Response.json({ ok: true });
}
