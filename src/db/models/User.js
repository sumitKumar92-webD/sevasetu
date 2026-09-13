import mongoose from "mongoose";

/** Customers, workers and admins all live in the `users` collection. */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "worker", "admin"], default: "customer" },
    language: { type: String, enum: ["en", "hi"], default: "en" },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
