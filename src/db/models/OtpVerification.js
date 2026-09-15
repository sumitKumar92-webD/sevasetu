import mongoose from "mongoose";

const otpVerificationSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      purpose: {
        type: String,

        enum: [
          "booking",
        ],

        default:
          "booking",
      },

      /*
       * Plain OTP database mein
       * save nahi hoga.
       */
      codeHash: {
        type: String,
        required: true,
        select: false,
      },

      /*
       * Successful OTP verification
       * ke baad secure token ka hash.
       */
      verificationTokenHash: {
        type: String,
        default: "",
        select: false,
      },

      expiresAt: {
        type: Date,
        required: true,

        /*
         * MongoDB expired OTP ko
         * automatically delete karega.
         */
        index: {
          expires: 0,
        },
      },

      verifiedAt: {
        type: Date,
        default: null,
      },

      consumedAt: {
        type: Date,
        default: null,
      },

      attempts: {
        type: Number,
        default: 0,
      },

      lastSentAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

export const OtpVerification =
  mongoose.models
    .OtpVerification ||
  mongoose.model(
    "OtpVerification",
    otpVerificationSchema
  );

export default OtpVerification;