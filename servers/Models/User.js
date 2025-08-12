import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
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
      select: false,
      minlength: 6,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    avatar: {
      type: String,
      default: "",
    },
    banner: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    location: {
      type: String,
      default: "",
    },
    profession: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    bookmarks: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Post",
      },
    ],
    totalPosts: {
      type: Number,
      default: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
    following: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    recentCategories: [
      {
        category: { type: String },
        lastVisited: { type: Date, default: Date.now },
      },
    ],
    cookieConsent: {
      type: Boolean,
      default: null,
    },
    subscribedAuthors: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    subscribers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    hasSubscriptionPlan: {
      type: Boolean,
      default: false,
    },
    subscriptionPlan: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
    subscriptionDate: {
      type: Date,
    },
    isEligibleForSubscription: {
      type: Boolean,
      default: null,
    },
    milestoneOverride: {
      type: Object,
      default: {
        followerCount: null,
        postCount: null,
        engagementRate: null,
        accountAgeDays: null,
      },
    },
    tourCompleted: {
      type: Boolean,
      default: false,
    },

    categories: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Category",
      },
    ],
    emailAttempts: {
      type: Number,
      default: 0,
    },
    emailStatus: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent",
    },
    emailLastError: {
      type: String,
    },
    stopEmailAttempts: {
      type: Boolean,
      default: false,
    },
    isAccountVerified: {
      type: Boolean,
      default: false,
    },
    verifyOtp: {
      type: String,
      default: "",
    },
    verifyOtpExpireAt: {
      type: Number,
      default: 0,
    },
    resetOtp: {
      type: String,
      default: "",
    },
    resetOtpExpireAt: {
      type: Number,
      default: 0,
    },
    feedbackPrompt: {
      shown: { type: Boolean, default: false },
      shownAt: { type: Date },
      responded: { type: Boolean, default: false },
      rating: { type: Number, min: 1, max: 5 },
      message: { type: String },
    },
  },
  { timestamps: true }
);

// Hashes password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compares entered password with stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Creates and exports the User model
const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
export default UserModel;
