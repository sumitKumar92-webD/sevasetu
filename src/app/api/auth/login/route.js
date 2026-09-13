import { connectDB } from "@/db";
import User from "@/db/models/User";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await ensureSeed();
    await connectDB();
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await signToken({ id: String(user._id), role: user.role });
    await setAuthCookie(token);

    return Response.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return Response.json({ error: "Login failed." }, { status: 500 });
  }
}
