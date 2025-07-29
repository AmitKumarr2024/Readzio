import mongoose from "mongoose";

// Activity Schema to track user behavior/actions
const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // POST actions
        "POST_CREATED",
        "POST_EDITED",
        "POST_DELETED",
        "POST_BLOCKED",
        "POST_APPEAL_SUBMITTED",

        // COMMENT actions
        "COMMENTED",
        "COMMENT_DELETED",

        // SOCIAL actions
        "LIKED",
        "BOOKMARKED",
        "SHARED",
        "FOLLOWED_USER",
        "UNFOLLOWED_USER",
        "BLOCKED_USER",
        "UNBLOCKED_USER",

        // POLL
        "VOTED_IN_POLL",
        "POLL_VOTED",

        // PROFILE
        "VIEWED_PROFILE",
        "UPDATED_PROFILE",
        "VIEWED_USERS",
        "DELETED_ACCOUNT",
        "UPDATED_BANK_DETAILS",
        "PASSWORD_UPDATED",
        "PASSWORD_VERIFIED_FOR_DELETION",
        "RESET_USER_MILESTONES",
        "OVERRIDDEN_USER_MILESTONES",

        // AUTH
        "LOGGED_IN",
        "LOGGED_OUT",
        "GOOGLE_LOGGED_IN",
        "SIGNED_UP",
        "CHECKED_AUTH",

        // SUBSCRIPTION
        "CREATED_SUBSCRIPTION",
        "CANCELLED_SUBSCRIPTION",
        "CREATED_SUBSCRIPTION_PLAN",
        "UPDATED_SUBSCRIPTION_PLAN",
        "DELETED_SUBSCRIPTION_PLAN",
        "SUBSCRIBED_TO_PLAN",
        "REMOVED_USER_FROM_PLAN",
        "TOGGLED_PLAN_RESTRICTIONS",
        "UPDATED_SUBSCRIPTION_CRITERIA",
        "TOGGLED_SUBSCRIPTION_PLAN_STATUS",
        "UNSUBSCRIBED_FROM_AUTHOR",

        // EARNINGS & PAYOUT
        "VIEWED_EARNINGS",
        "VIEWED_ALL_EARNINGS",
        "VIEWED_ALL_AD_EARNINGS",
        "CREATED_PAYOUT",
        "UPDATED_PAYOUT_DETAILS",
        "CREATED_PAYOUT_DETAILS",
        "DELETED_PAYOUT_DETAILS",
        "PROCESSED_BULK_PAYOUT",
        "ATTEMPTED_BULK_PAYOUT",
        "GENERATED_EARNINGS_REPORT",

        // POSTS INTERACTION
        "VIEWED_POSTS",
        "VIEWED_POST",
        "VIEWED_TRENDING_POSTS",
        "VIEWED_LATEST_POSTS",
        "VIEWED_SUBSCRIBED_POSTS",
        "VIEWED_SUGGESTED_POSTS",
        "VIEWED_FOLLOWING_POSTS",
        "SUBSCRIBED_CATEGORY",
        "UNSUBSCRIBED_CATEGORY",
        "SEARCHED_POSTS",

        // FOLLOWERS
        "VIEWED_FOLLOWERS_LIST",
        "VIEWED_FOLLOWING_LIST",
        "FETCHED_FOLLOWERS",
        "FETCHED_FOLLOWING",

        // EMAIL
        "EMAIL_SENT",
        "EMAIL_VERIFIED",
        "EMAIL_FAILED",
        "EMAIL_SKIPPED",
        "EMAIL_FAILED_ALL_ATTEMPTS",
        "SENDER_EMAIL",
        "EMAIL_SKIPPED",
        "APPROVED_EMAILS",
        "GENERATED_PENDING_EMAILS",
        "DELETED_PENDING_EMAILS",
        "CHECKED_EMAIL_STATUS",

        // RAZORPAY
        "CREATED_RAZORPAY_ORDER",
        "VERIFIED_PAYMENT",
        "FAILED_PAYMENT_VERIFICATION",
        "RAZORPAY_KEY_SECRET",

        // ADS
        "SET_AD_CONFIG",
        "RECORDED_AD_EARNINGS",

        // LOCATION
        "LOCATION_LOGGED",
        "INDIA_COUNTRY_PATH",
        "FETCHED_ALL_USER_LOCATIONS",
        "SAVED_USER_LOCATION",

        // ERRORS
        "ERR_CONNECTION_RESET",
        "ERR_CONNECTION_REFUSED",
        "ERR_BLOCKED_BY_CLIENT",
        "JWT_SECRET",
        "PASSWORD_RESET",
        "PERMISSION_DENIED",
        "TIMEOUT",
        "POSITION_UNAVAILABLE",

        // NOTIFICATIONS
        "CREATED_NOTIFICATION",
        "DISMISSED_NOTIFICATION",
        "DEACTIVATED_NOTIFICATION",

        // DEV/DEBUG
        "VITE_BACKEND_URL",
      ],
    },

    // Optional references
    targetPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    targetComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetCategory: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // Adds createdAt, updatedAt
  }
);

// Indexes for performance
activitySchema.index({ user: 1, action: 1, createdAt: -1 });
activitySchema.index({ targetPost: 1 });
activitySchema.index({ targetComment: 1 });
activitySchema.index({ targetUser: 1 });

const ActivityModel =
  mongoose.models.Activity || mongoose.model("Activity", activitySchema);

export default ActivityModel;
