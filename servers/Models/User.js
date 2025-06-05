import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"] },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        "Password is required unless signed up with Google",
      ],
      minlength: 6,
    },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: "" },
    banner: { type: String, default: "" },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
    location: { type: String, default: "" },
    profession: { type: String, default: "" },
    bio: { type: String, maxlength: 500, default: "" },
    joiningDate: { type: Date, default: Date.now },
    blocked: { type: Boolean, default: false },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    subscribedCategories: { type: [String], default: [] },
    subscribedAuthors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    hasSubscriptionPlan: { type: Boolean, default: false },

    // Reference to separate subscription plan
    subscriptionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },

    subscriptionDate: { type: Date },
  },
  {
    timestamps: true,
    indexes: [{ key: { email: 1 }, unique: true }],
  }
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
