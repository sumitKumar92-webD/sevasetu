import bcrypt from "bcryptjs";

import {
  connectDB,
} from "@/db";

import User from "@/db/models/User";
import Worker from "@/db/models/Worker";

import {
  SERVICES,
} from "./services";

const CENTER = {
  lat: 28.6139,
  lng: 77.209,
};

const WORKER_SEED = [
  [
    "Ramesh Kumar",
    "electrician",
    4.8,
    62,
    6,
    true,
    "approved",
  ],
  [
    "Suresh Yadav",
    "electrician",
    4.3,
    31,
    3,
    true,
    "approved",
  ],
  [
    "Anil Sharma",
    "plumber",
    4.6,
    48,
    5,
    true,
    "approved",
  ],
  [
    "Mohd Irfan",
    "plumber",
    4.1,
    22,
    2,
    false,
    "approved",
  ],
  [
    "Vijay Singh",
    "carpenter",
    4.9,
    77,
    9,
    true,
    "approved",
  ],
  [
    "Sunita Devi",
    "cleaner",
    4.7,
    91,
    4,
    true,
    "approved",
  ],
  [
    "Pooja Verma",
    "cleaner",
    4.4,
    40,
    2,
    true,
    "approved",
  ],
  [
    "Rakesh Meena",
    "painter",
    4.2,
    27,
    7,
    false,
    "approved",
  ],
  [
    "Imran Khan",
    "ac_repair",
    4.8,
    55,
    8,
    true,
    "approved",
  ],
  [
    "Deepak Rawat",
    "appliance",
    4.5,
    36,
    4,
    true,
    "approved",
  ],
  [
    "Harpreet Singh",
    "driver",
    4.6,
    61,
    10,
    true,
    "approved",
  ],
  [
    "Kavita Joshi",
    "cook",
    4.9,
    84,
    6,
    true,
    "approved",
  ],
  [
    "Ajay Gupta",
    "tutor",
    4.3,
    19,
    3,
    true,
    "approved",
  ],
  [
    "Nitin Bansal",
    "electrician",
    0,
    0,
    1,
    true,
    "pending",
  ],
  [
    "Farhan Ali",
    "ac_repair",
    0,
    0,
    2,
    true,
    "pending",
  ],
];

function jitter(
  index,
  span = 0.075
) {
  const number =
    Math.sin(
      index * 12.9898
    ) * 43758.5453;

  return (
    (number -
      Math.floor(number) -
      0.5) *
    2 *
    span
  );
}

/*
 * Development में Next.js multiple API
 * requests parallel चला सकता है.
 *
 * Global state ensure करता है कि seed
 * function एक समय पर केवल एक बार चले.
 */
const globalSeedState =
  globalThis;

if (
  !globalSeedState
    .__sevaSetuSeedState
) {
  globalSeedState
    .__sevaSetuSeedState = {
    promise: null,
    completed: false,
  };
}

const seedState =
  globalSeedState
    .__sevaSetuSeedState;

async function findOrCreateUser({
  name,
  email,
  phone,
  passwordHash,
  role,
  language = "en",
}) {
  try {
    /*
     * $setOnInsert का मतलब:
     * User मौजूद है तो duplicate नहीं बनेगा.
     * User नहीं है तो नया बनेगा.
     */
    return await User
      .findOneAndUpdate(
        {
          email,
        },
        {
          $setOnInsert: {
            name,
            email,
            phone,
            passwordHash,
            role,
            language,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert:
            true,
        }
      );
  } catch (error) {
    /*
     * अगर दो server instances बिल्कुल
     * एक साथ upsert करें तो unique-index
     * error आ सकता है.
     *
     * उस स्थिति में existing user load करो.
     */
    if (
      error?.code === 11000
    ) {
      const existingUser =
        await User.findOne({
          email,
        });

      if (existingUser) {
        return existingUser;
      }
    }

    throw error;
  }
}

async function findOrCreateWorker({
  userId,
  workerData,
}) {
  try {
    return await Worker
      .findOneAndUpdate(
        {
          userId,
        },
        {
          $setOnInsert: {
            userId,
            ...workerData,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert:
            true,
        }
      );
  } catch (error) {
    if (
      error?.code === 11000
    ) {
      const existingWorker =
        await Worker.findOne({
          userId,
        });

      if (existingWorker) {
        return existingWorker;
      }
    }

    throw error;
  }
}

async function seedDatabase() {
  await connectDB();

  const passwordHash =
    await bcrypt.hash(
      "password123",
      10
    );

  /*
   * Admin demo account
   */
  await findOrCreateUser({
    name:
      "Admin SevaSetu",

    email:
      "admin@sevasetu.in",

    phone:
      "9000000001",

    passwordHash,

    role: "admin",

    language: "en",
  });

  /*
   * Customer demo account
   */
  await findOrCreateUser({
    name:
      "Priya Sharma",

    email:
      "customer@sevasetu.in",

    phone:
      "9000000002",

    passwordHash,

    role: "customer",

    language: "en",
  });

  /*
   * Demo workers
   */
  for (
    let index = 0;
    index <
    WORKER_SEED.length;
    index += 1
  ) {
    const [
      name,
      service,
      rating,
      ratingCount,
      experienceYears,
      isOnline,
      verification,
    ] =
      WORKER_SEED[index];

    const workerNumber =
      index + 1;

    const email =
      `worker${workerNumber}` +
      "@sevasetu.in";

    const phone =
      `98000000${10 + index}`;

    const selectedService =
      SERVICES.find(
        (serviceItem) =>
          serviceItem.key ===
          service
      );

    const user =
      await findOrCreateUser({
        name,
        email,
        phone,
        passwordHash,
        role: "worker",
        language: "en",
      });

    await findOrCreateWorker({
      userId: user._id,

      workerData: {
        service,

        bio:
          `${name} has ` +
          `${experienceYears} years ` +
          "of hands-on experience in " +
          `${
            selectedService?.en ||
            service
          } work.`,

        pricePerHour:
          (selectedService
            ?.base || 300) +
          index * 7,

        experienceYears,

        lat:
          CENTER.lat +
          jitter(index + 1),

        lng:
          CENTER.lng +
          jitter(index + 21),

        isOnline,

        verification,

        photoUrl: "",

        videoUrl:
          verification ===
          "approved"
            ? "https://www.youtube.com/watch?v=demo-skill-video"
            : "",

        ratingSum:
          Math.round(
            rating *
              ratingCount
          ),

        ratingCount,

        jobsDone:
          ratingCount,
      },
    });
  }

  console.log(
    "✅ Seed completed safely"
  );

  return true;
}

/*
 * Every API route can safely call ensureSeed().
 * Parallel requests को same Promise मिलेगा.
 */
export async function ensureSeed() {
  if (
    seedState.completed
  ) {
    return false;
  }

  if (!seedState.promise) {
    seedState.promise =
      seedDatabase()
        .then((result) => {
          seedState.completed =
            true;

          return result;
        })
        .catch((error) => {
          /*
           * Failed seed को retry करने देना.
           */
          seedState.promise =
            null;

          seedState.completed =
            false;

          throw error;
        });
  }

  return seedState.promise;
}