import mongoose from "mongoose";

const userSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      passwordHash: {
        type: String,
        required: true,
        select: false,
      },

      role: {
        type: String,

        enum: [
          "customer",
          "worker",
          "admin",
        ],

        default:
          "customer",
      },

      language: {
        type: String,

        enum: [
          "en",
          "as",
          "bn",
          "brx",
          "doi",
          "gu",
          "hi",
          "kn",
          "ks",
          "kok",
          "mai",
          "ml",
          "mni",
          "mr",
          "ne",
          "or",
          "pa",
          "sa",
          "sat",
          "sd",
          "ta",
          "te",
          "ur",
        ],

        default: "en",
      },
    },
    {
      timestamps: true,
    }
  );

export const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );

export default User;