import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/db";
import User from "@/db/models/User";
import Worker from "@/db/models/Worker";
import { idOf, toJson } from "@/db";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "sevasetu_dev_secret_change_me"
);
export const COOKIE_NAME = "sevasetu_token";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Returns { user, worker } or null. */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.id) return null;

  await connectDB();
  const user = await User.findById(idOf(payload.id)).select("+passwordHash");
  if (!user) return null;

  let worker = null;
  if (user.role === "worker") {
    const w = await Worker.findOne({ userId: user._id });
    worker = w ? toJson(w) : null;
  }

  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      language: user.language,
    },
    worker,
  };
}

export function unauthorized(message = "Please log in to continue") {
  return Response.json({ error: message }, { status: 401 });
}
