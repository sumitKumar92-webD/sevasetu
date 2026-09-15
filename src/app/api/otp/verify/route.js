import crypto from "crypto";

import {
  connectDB,
} from "@/db";

import OtpVerification from "@/db/models/OtpVerification";

import {
  getCurrentUser,
  unauthorized,
} from "@/lib/auth";

export const dynamic =
  "force-dynamic";

const MAX_OTP_ATTEMPTS = 5;

const OTP_SECRET =
  process.env.OTP_SECRET ||
  process.env.JWT_SECRET ||
  "sevasetu_dev_otp_secret";

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(
      `${value}:${OTP_SECRET}`
    )
    .digest("hex");
}

function safeStringEqual(
  first,
  second
) {
  if (
    !first ||
    !second ||
    first.length !==
      second.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(first),
    Buffer.from(second)
  );
}

export async function POST(
  request
) {
  const session =
    await getCurrentUser();

  if (!session) {
    return unauthorized();
  }

  try {
    await connectDB();

    const body =
      await request.json();

    const requestId =
      String(
        body.requestId || ""
      );

    const otp =
      String(body.otp || "")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (
      !requestId ||
      !/^\d{6}$/.test(otp)
    ) {
      return Response.json(
        {
          error:
            "Enter a valid six-digit OTP.",
        },
        {
          status: 400,
        }
      );
    }

    const otpRecord =
      await OtpVerification
        .findOne({
          _id: requestId,

          userId:
            session.user.id,

          purpose:
            "booking",

          consumedAt: null,
        })
        .select(
          "+codeHash +verificationTokenHash"
        );

    if (!otpRecord) {
      return Response.json(
        {
          error:
            "OTP request was not found. Request a new OTP.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      otpRecord.expiresAt <=
      new Date()
    ) {
      return Response.json(
        {
          error:
            "OTP has expired. Request a new OTP.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      otpRecord.attempts >=
      MAX_OTP_ATTEMPTS
    ) {
      return Response.json(
        {
          error:
            "Too many incorrect attempts. Request a new OTP.",
        },
        {
          status: 429,
        }
      );
    }

    const submittedHash =
      hashValue(otp);

    const otpIsCorrect =
      safeStringEqual(
        otpRecord.codeHash,
        submittedHash
      );

    if (!otpIsCorrect) {
      otpRecord.attempts += 1;

      await otpRecord.save();

      const attemptsLeft =
        MAX_OTP_ATTEMPTS -
        otpRecord.attempts;

      return Response.json(
        {
          error:
            attemptsLeft > 0
              ? `Incorrect OTP. ${attemptsLeft} attempts remaining.`
              : "Too many incorrect attempts. Request a new OTP.",
        },
        {
          status:
            attemptsLeft > 0
              ? 400
              : 429,
        }
      );
    }

    /*
     * Secure random verification
     * token generate होगा.
     */
    const verificationToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    otpRecord.verifiedAt =
      new Date();

    otpRecord.verificationTokenHash =
      hashValue(
        verificationToken
      );

    await otpRecord.save();

    return Response.json(
      {
        message:
          "Mobile number verified successfully.",

        verificationToken,

        phone:
          otpRecord.phone,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "OTP verification error:",
      error
    );

    /*
     * Invalid MongoDB ObjectId.
     */
    if (
      error?.name ===
      "CastError"
    ) {
      return Response.json(
        {
          error:
            "Invalid OTP request.",
        },
        {
          status: 400,
        }
      );
    }

    return Response.json(
      {
        error:
          "OTP could not be verified.",
      },
      {
        status: 500,
      }
    );
  }
}