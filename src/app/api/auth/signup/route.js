import {
  connectDB,
} from "@/db";

import User from "@/db/models/User";
import Worker from "@/db/models/Worker";

import {
  hashPassword,
  signToken,
  setAuthCookie,
} from "@/lib/auth";

import {
  SERVICES,
} from "@/lib/services";

import {
  ensureSeed,
} from "@/lib/seed";

import {
  LANGUAGE_CODES,
} from "@/i18n/languages";

export const dynamic =
  "force-dynamic";

function normalizePhone(
  value
) {
  return String(value || "")
    .replace(
      /[\s()-]/g,
      ""
    )
    .trim();
}

function isValidEmail(
  email
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isValidPhone(
  phone
) {
  if (!phone) {
    return true;
  }

  return /^(\+91)?[6-9]\d{9}$/.test(
    phone
  );
}

export async function POST(
  request
) {
  try {
    await ensureSeed();

    await connectDB();

    const body =
      await request.json();

    const name = String(
      body.name || ""
    ).trim();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const phone =
      normalizePhone(
        body.phone
      );

    const password =
      String(
        body.password || ""
      );

    const allowedRoles = [
      "customer",
      "worker",
      "admin",
    ];

    const role =
      allowedRoles.includes(
        body.role
      )
        ? body.role
        : "customer";

    const language =
      LANGUAGE_CODES.includes(
        body.language
      )
        ? body.language
        : "en";

    if (!name) {
      return Response.json(
        {
          error:
            "Full name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !email ||
      !isValidEmail(email)
    ) {
      return Response.json(
        {
          error:
            "Enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length < 6
    ) {
      return Response.json(
        {
          error:
            "Password must contain at least 6 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidPhone(phone)
    ) {
      return Response.json(
        {
          error:
            "Enter a valid 10-digit Indian mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    const existingUser =
      await User.findOne({
        email,
      });

    if (existingUser) {
      return Response.json(
        {
          error:
            "An account with this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const passwordHash =
      await hashPassword(
        password
      );

    const user =
      await User.create({
        name,
        email,
        phone,
        passwordHash,
        role,
        language,
      });

    let workerProfile =
      null;

    if (
      role === "worker"
    ) {
      const serviceExists =
        SERVICES.some(
          (serviceItem) =>
            serviceItem.key ===
            body.service
        );

      const service =
        serviceExists
          ? body.service
          : "electrician";

      const selectedService =
        SERVICES.find(
          (serviceItem) =>
            serviceItem.key ===
            service
        );

      const requestedPrice =
        Number(
          body.pricePerHour
        );

      const requestedExperience =
        Number(
          body.experienceYears
        );

      const latitude =
        Number(body.lat);

      const longitude =
        Number(body.lng);

      const pricePerHour =
        requestedPrice > 0
          ? requestedPrice
          : selectedService
                ?.base ||
            300;

      const experienceYears =
        requestedExperience >=
        0
          ? requestedExperience
          : 0;

      const lat =
        Number.isFinite(
          latitude
        )
          ? latitude
          : 28.6139;

      const lng =
        Number.isFinite(
          longitude
        )
          ? longitude
          : 77.209;

      workerProfile =
        await Worker.create({
          userId: user._id,

          service,

          bio: String(
            body.bio || ""
          ).trim(),

          pricePerHour,

          experienceYears,

          lat,
          lng,

          isOnline: true,

          verification:
            "pending",
        });
    }

    const token =
      await signToken({
        id: String(
          user._id
        ),

        role: user.role,
      });

    await setAuthCookie(
      token
    );

    return Response.json(
      {
        message:
          "Account created successfully.",

        user: {
          id: String(
            user._id
          ),

          name:
            user.name,

          email:
            user.email,

          phone:
            user.phone,

          role:
            user.role,

          language:
            user.language,
        },

        worker:
          workerProfile
            ? {
                id: String(
                  workerProfile._id
                ),

                service:
                  workerProfile
                    .service,

                pricePerHour:
                  workerProfile
                    .pricePerHour,

                experienceYears:
                  workerProfile
                    .experienceYears,

                verification:
                  workerProfile
                    .verification,

                isOnline:
                  workerProfile
                    .isOnline,
              }
            : null,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Signup API error:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return Response.json(
        {
          error:
            "An account with this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      const firstError =
        Object.values(
          error.errors || {}
        )[0];

      return Response.json(
        {
          error:
            firstError?.message ||
            "Invalid signup information.",
        },
        {
          status: 400,
        }
      );
    }

    return Response.json(
      {
        error:
          "Could not create the account. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}