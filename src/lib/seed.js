
import bcrypt from "bcryptjs";
import { connectDB } from "@/db";
import User from "@/db/models/User";
import Worker from "@/db/models/Worker";
import { SERVICES } from "./services";

const CENTER = { lat: 28.6139, lng: 77.209 };

const WORKER_SEED = [
  ["Ramesh Kumar","electrician",4.8,62,6,true,"approved"],
  ["Suresh Yadav","electrician",4.3,31,3,true,"approved"],
  ["Anil Sharma","plumber",4.6,48,5,true,"approved"],
  ["Mohd Irfan","plumber",4.1,22,2,false,"approved"],
  ["Vijay Singh","carpenter",4.9,77,9,true,"approved"],
  ["Sunita Devi","cleaner",4.7,91,4,true,"approved"],
  ["Pooja Verma","cleaner",4.4,40,2,true,"approved"],

];

function jitter(i, span = 0.075) {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  return ((a - Math.floor(a)) - 0.5) * 2 * span;
}

export async function ensureSeed() {
  await connectDB();

  // ✅ FIX: check by admin email instead of count
  const existingAdmin = await User.findOne({ email: "admin@sevasetu.in" });
  if (existingAdmin) {
    console.log("Seed already exists ✅");
    return false;
  }

  const pass = await bcrypt.hash("password123", 10);

  // ✅ SAFE INSERT
  try {
    await User.create([
      {
        name: "Admin SevaSetu",
        email: "admin@sevasetu.in",
        phone: "9000000001",
        passwordHash: pass,
        role: "admin",
      },
      {
        name: "Priya Sharma",
        email: "customer@sevasetu.in",
        phone: "9000000002",
        passwordHash: pass,
        role: "customer",
      },
    ]);
  } catch (err) {
    console.log("Users already exist, skipping...");
  }

  // ✅ WORKERS SAFE INSERT
  for (let i = 0; i < WORKER_SEED.length; i++) {
    const [name, service, rating, count, exp, online, verification] =
      WORKER_SEED[i];

    const email = `worker${i + 1}@sevasetu.in`;

    const exists = await User.findOne({ email });
    if (exists) continue;

    const svc = SERVICES.find((s) => s.key === service);

    const user = await User.create({
      name,
      email,
      phone: `98000000${10 + i}`,
      passwordHash: pass,
      role: "worker",
    });

    await Worker.create({
      userId: user._id,
      service,
      bio: `${name} has ${exp} years experience in ${service}`,
      pricePerHour: (svc ? svc.base : 300) + i * 7,
      experienceYears: exp,
      lat: CENTER.lat + jitter(i + 1),
      lng: CENTER.lng + jitter(i + 21),
      isOnline: online,
      verification,
      ratingSum: Math.round(rating * count),
      ratingCount: count,
      jobsDone: count,
    });
  }

  console.log("✅ Seed Completed");
  return true;
}