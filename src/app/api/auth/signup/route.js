import { connectDB } from "@/db";
import User from "@/db/models/User";
import Worker from "@/db/models/Worker";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { SERVICES } from "@/lib/services";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await connectDB();
    await ensureSeed();

    const body = await request.json();

    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const role = ["customer", "worker", "admin"].includes(body.role)
      ? body.role
      : "customer";

    if (!name || !email || password.length < 6) {
      return Response.json(
        { error: "Name, email and password (min 6 chars) required" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return Response.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const user = await User.create({
      name,
      email,
      phone: body.phone || "",
      passwordHash: await hashPassword(password),
      role,
      language: body.language || "en",
    });

    // Worker create
    if (role === "worker") {
      const service = SERVICES.some((s) => s.key === body.service)
        ? body.service
        : "electrician";

      const svc = SERVICES.find((s) => s.key === service);

      await Worker.create({
        userId: user._id,
        service,
        bio: body.bio || "",
        pricePerHour: Number(body.pricePerHour) || (svc ? svc.base : 300),
        experienceYears: Number(body.experienceYears) || 1,
        lat: Number(body.lat) || 28.6139,
        lng: Number(body.lng) || 77.209,
        isOnline: true,
        verification: "pending",
      });
    }

    const token = await signToken({
      id: String(user._id),
      role: user.role,
    });

    await setAuthCookie(token);

    return Response.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("signup error:", err);
    return Response.json(
      { error: "Signup failed" },
      { status: 500 }
    );
  }
}