import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isAdmin: { type: Boolean, default: false },
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
        function () { return !this.googleId; },
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
    bookmarks: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Post" }],
    totalPosts: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
    following: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    recentCategories: [
      {
        category: { type: String },
        lastVisited: { type: Date, default: Date.now },
      },
    ],
    subscribedAuthors: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    subscribers: [{ type: mongoose.SchemaTypes.ObjectId, ref: "User" }],
    hasSubscriptionPlan: { type: Boolean, default: false },
    subscriptionPlan: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
    subscriptionDate: { type: Date },
    categories: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Category" }],
    emailAttempts: { type: Number, default: 0 },
    emailStatus: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent",
    },
    emailLastError: { type: String },
    stopEmailAttempts: { type: Boolean, default: false },
    // Added fields for OTP functionality
    isAccountVerified: { type: Boolean, default: false },
    verifyOtp: { type: String, default: "" },
    verifyOtpExpireAt: { type: Number, default: 0 },
    resetOtp: { type: String, default: "" },
    resetOtpExpireAt: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ isAdmin: 1 });
userSchema.index({ bookmarks: 1 });
userSchema.index({ following: 1 });
userSchema.index({ followers: 1 });

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

export default UserModel;