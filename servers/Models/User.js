import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Defines schema for users
const userSchema = new mongoose.Schema(
  {
    // User's name
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    // User role (user or admin)
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Indicates if user is admin
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // Unique email address
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    // Password (optional for Google sign-ups)
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
    // Google account ID
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Profile avatar URL
    avatar: {
      type: String,
      default: "",
    },
    // Profile banner URL
    banner: {
      type: String,
      default: "",
    },
    // User's gender
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    // User's location
    location: {
      type: String,
      default: "",
    },
    // User's profession
    profession: {
      type: String,
      default: "",
    },
    // User's bio
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    // Date of account creation
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    // Indicates if user is blocked
    blocked: {
      type: Boolean,
      default: false,
    },
    // Bookmarked posts
    bookmarks: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Post",
      },
    ],
    // Total number of posts
    totalPosts: {
      type: Number,
      default: 0,
    },
    // Total views across posts
    totalViews: {
      type: Number,
      default: 0,
    },
    // Total time spent on posts
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
    // Users followed by this user
    following: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    // Users following this user
    followers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    // Users blocked by this user
    blockedUsers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    // Recently visited categories
    recentCategories: [
      {
        category: { type: String },
        lastVisited: { type: Date, default: Date.now },
      },
    ],
    // Cookie consent status
    cookieConsent: {
      type: Boolean,
      default: null, // null = not asked, true = accepted, false = declined
    },
    // Authors subscribed to by the user
    subscribedAuthors: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    // Users subscribed to this user
    subscribers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User",
      },
    ],
    // Indicates if user has a subscription plan
    hasSubscriptionPlan: {
      type: Boolean,
      default: false,
    },
    // User's subscription plan
    subscriptionPlan: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
    // Date of subscription
    subscriptionDate: {
      type: Date,
    },
    // Eligibility for subscription
    isEligibleForSubscription: {
      type: Boolean,
      default: null,
    },

    // Admin-only simulated milestone values
    milestoneOverride: {
      type: Object,
      default: {
        followerCount: null,
        postCount: null,
        engagementRate: null,
        accountAgeDays: null,
      },
    },

    // Subscribed categories
    categories: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Category",
      },
    ],
    // Email send attempts
    emailAttempts: {
      type: Number,
      default: 0,
    },
    // Email send status
    emailStatus: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent",
    },
    // Last email error
    emailLastError: {
      type: String,
    },
    // Flag to stop email attempts
    stopEmailAttempts: {
      type: Boolean,
      default: false,
    },
    // Indicates if account is verified
    isAccountVerified: {
      type: Boolean,
      default: false,
    },
    // OTP for account verification
    verifyOtp: {
      type: String,
      default: "",
    },
    // OTP expiration for verification
    verifyOtpExpireAt: {
      type: Number,
      default: 0,
    },
    // OTP for password reset
    resetOtp: {
      type: String,
      default: "",
    },
    // OTP expiration for password reset
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
  { timestamps: true } // Adds createdAt and updatedAt
);

// Hashes password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compares entered password with stored hash
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Indexes for efficient querying
userSchema.index({ role: 1 }); // For role-based queries
userSchema.index({ isAdmin: 1 }); // For admin queries
userSchema.index({ bookmarks: 1 }); // For bookmark queries
userSchema.index({ following: 1 }); // For following queries
userSchema.index({ followers: 1 }); // For follower queries

// Creates and exports the User model
const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
export default UserModel;
