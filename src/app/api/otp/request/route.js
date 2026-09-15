import crypto from "crypto";

import {
  connectDB,
} from "@/db";

import OtpVerification from "@/db/models/OtpVerification";

import {
  getCurrentUser,
  unauthorized,
} from "@/lib/auth";

import {
  sendOtpSms,
} from "@/lib/sms";

export const dynamic =
  "force-dynamic";

const OTP_EXPIRY_MINUTES = 5;

const OTP_RESEND_SECONDS = 60;

const OTP_SECRET =
  process.env.OTP_SECRET ||
  process.env.JWT_SECRET ||
  "sevasetu_dev_otp_secret";

function normalizePhone(
  value
) {
  const phone = String(
    value || ""
  )
    .replace(
      /[\s()-]/g,
      ""
    )
    .trim();

  /*
   * 10-digit Indian number ko
   * +91 format mein convert karega.
   */
  if (
    /^[6-9]\d{9}$/.test(
      phone
    )
  ) {
    return `+91${phone}`;
  }

  /*
   * Number pehle se +91 mein ho.
   */
  if (
    /^\+91[6-9]\d{9}$/.test(
      phone
    )
  ) {
    return phone;
  }

  return null;
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(
      `${value}:${OTP_SECRET}`
    )
    .digest("hex");
}

function maskPhone(phone) {
  return (
    phone.slice(0, 3) +
    "******" +
    phone.slice(-2)
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

  if (
    session.user.role !==
    "customer"
  ) {
    return Response.json(
      {
        error:
          "Only customers can request a booking OTP.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    await connectDB();

    const body =
      await request.json();

    const phone =
      normalizePhone(
        body.phone ||
          session.user.phone
      );

    if (!phone) {
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

    /*
     * Prevent OTP spam.
     */
    const resendLimit =
      new Date(
        Date.now() -
          OTP_RESEND_SECONDS *
            1000
      );

    const recentRequest =
      await OtpVerification
        .findOne({
          userId:
            session.user.id,

          purpose:
            "booking",

          lastSentAt: {
            $gt: resendLimit,
          },
        });

    if (recentRequest) {
      return Response.json(
        {
          error:
            "Please wait 60 seconds before requesting another OTP.",
        },
        {
          status: 429,
        }
      );
    }

    /*
     * Generate cryptographically
     * secure six-digit OTP.
     */
    const otp = String(
      crypto.randomInt(
        100000,
        1000000
      )
    );

    /*
     * Remove previous unused OTP.
     */
    await OtpVerification
      .deleteMany({
        userId:
          session.user.id,

        purpose:
          "booking",

        consumedAt: null,
      });

    const expiresAt =
      new Date(
        Date.now() +
          OTP_EXPIRY_MINUTES *
            60 *
            1000
      );

    const otpRecord =
      await OtpVerification
        .create({
          userId:
            session.user.id,

          phone,

          purpose:
            "booking",

          codeHash:
            hashValue(otp),

          expiresAt,

          lastSentAt:
            new Date(),
        });

    try {
      const smsResult =
        await sendOtpSms(
          phone,
          otp
        );

      return Response.json(
        {
          message:
            "OTP sent successfully.",

          requestId:
            String(
              otpRecord._id
            ),

          phoneMasked:
            maskPhone(phone),

          expiresIn:
            OTP_EXPIRY_MINUTES *
            60,

          /*
           * Development mein OTP
           * frontend ko मिलेगा.
           * Production mein कभी नहीं.
           */
          ...(smsResult.provider ===
          "development"
            ? {
                devOtp: otp,
              }
            : {}),
        },
        {
          status: 200,
        }
      );
    } catch (smsError) {
      /*
       * SMS fail hone par OTP record
       * delete karna जरूरी है.
       */
      await OtpVerification
        .findByIdAndDelete(
          otpRecord._id
        );

      throw smsError;
    }
  } catch (error) {
    console.error(
      "OTP request error:",
      error
    );

    return Response.json(
      {
        error:
          error.message ||
          "OTP could not be sent.",
      },
      {
        status: 500,
      }
    );
  }
}