import mongoose from "mongoose";

// Defines schema for tracking user activities
const activitySchema = new mongoose.Schema(
  {
    // References the user performing the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimizes queries by user
    },
    // Specifies the type of action performed
    action: {
      type: String,
      enum: [
        "POST_CREATED",
        "POST_EDITED",
        "POST_DELETED",
        "COMMENTED",
        "COMMENT_DELETED",
        "LIKED",
        "BOOKMARKED",
        "FOLLOWED_USER",
        "UNFOLLOWED_USER",
        "VOTED_IN_POLL",
        "REPORTED_CONTENT",
        "LOGGED_IN",
        "UPDATED_PROFILE",
        "VIEWED_USERS",
        "DELETED_ACCOUNT",
        "VIEWED_PROFILE",
        "VIEWED_ACTIVITY",
        "VIEWED_POSTS",
        "VIEWED_POST",
        "SIGNED_UP",
        "LOGGED_OUT",
        "CHECKED_AUTH",
        "GOOGLE_LOGGED_IN",
        "BLOCKED_USER",
        "UNBLOCKED_USER",
        "CREATED_RAZORPAY_ORDER",
        "VERIFIED_PAYMENT",
        "FAILED_PAYMENT_VERIFICATION",
        "PROCESSED_BULK_PAYOUT",
        "ATTEMPTED_BULK_PAYOUT",
        "SEARCHED_POSTS",
        "VIEWED_TRENDING_POSTS",
        "VIEWED_LATEST_POSTS",
        "VIEWED_SUBSCRIBED_POSTS",
        "SUBSCRIBED_CATEGORY",
        "UNSUBSCRIBED_CATEGORY",
        "VIEWED_FOLLOWERS_LIST",
        "VIEWED_FOLLOWING_LIST",
        "CREATED_SUBSCRIPTION_PLAN",
        "SUBSCRIBED_TO_PLAN",
        "DELETED_SUBSCRIPTION",
        "DELETED_SUBSCRIPTION_PLAN",
        "UPDATED_SUBSCRIPTION_PLAN",
        "UPDATED_BANK_DETAILS",
        "RAZORPAY_KEY_SECRET",
        "CANCELLED_SUBSCRIPTION",
        "CREATED_SUBSCRIPTION",
        "UNSUBSCRIBED_FROM_AUTHOR",
        "UPDATED_PAYOUT_DETAILS",
        "CREATED_PAYOUT_DETAILS",
        "DELETED_PAYOUT_DETAILS",
        "VIEWED_EARNINGS",
        "VIEWED_SUGGESTED_POSTS",
        "VIEWED_ALL_EARNINGS",
        "CREATED_PAYOUT",
        "VIEWED_ALL_AD_EARNINGS",
        "SET_AD_CONFIG",
        "RECORDED_AD_EARNINGS",
        "POST_BLOCKED",
        "APPROVED_EMAILS",
        "GENERATED_EARNINGS_REPORT",
        "DELETED_PENDING_EMAILS",
        "GENERATED_PENDING_EMAILS",
        "CHECKED_EMAIL_STATUS",
        "ERR_CONNECTION_RESET",
        "FETCHED_ALL_USER_LOCATIONS",
        "SAVED_USER_LOCATION",
        "FETCHED_FOLLOWING",
        "FETCHED_FOLLOWERS",
        "INDIA_COUNTRY_PATH",
        "EMAIL_FAILED",
        "EMAIL_SENT",
        "EMAIL_VERIFIED",
        "PASSWORD_RESET",
        "SENDER_EMAIL",
        "EMAIL_SKIPPED",
        "EMAIL_FAILED_ALL_ATTEMPTS",
        "DISMISSED_NOTIFICATION",
        "DEACTIVATED_NOTIFICATION",
        "CREATED_NOTIFICATION",
        "POST_APPEAL_SUBMITTED",
        "PERMISSION_DENIED",
        "POSITION_UNAVAILABLE",
        "TIMEOUT",
        "LOCATION_LOGGED",
        "POLL_VOTED",
        "VIEWED_FOLLOWING_POSTS",
        "GRANTED_FULL_ACCESS",
        "REMOVED_USER_FROM_PLAN",
        "TOGGLED_PLAN_RESTRICTIONS",
        "UPDATED_SUBSCRIPTION_CRITERIA",
        "TOGGLED_SUBSCRIPTION_PLAN_STATUS",
        "VITE_BACKEND_URL",
        "ERR_CONNECTION_REFUSED",
        "JWT_SECRET",
        "ERR_BLOCKED_BY_CLIENT",
        "PASSWORD_VERIFIED_FOR_DELETION",
        "PASSWORD_UPDATED",
        "RESET_USER_MILESTONES",
        "OVERRIDDEN_USER_MILESTONES",
      ],
      required: true,
    },
    // Optional reference to a related post
    targetPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    // Optional reference to a related comment
    targetComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    // Optional reference to a related user
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Optional category related to the action
    targetCategory: {
      type: String,
    },
    // Descriptive message for the activity
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500, // Limits message length for storage efficiency
    },
    // Soft delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true, // Optimizes queries for non-deleted activities
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Indexes for efficient querying
activitySchema.index({ user: 1, action: 1, createdAt: -1 }); // For user activity history
activitySchema.index({ targetPost: 1 }); // For post-related activities
activitySchema.index({ targetComment: 1 }); // For comment-related activities
activitySchema.index({ targetUser: 1 }); // For user-related activities

// Creates and exports the Activity model
const ActivityModel = mongoose.model("Activity", activitySchema);
export default ActivityModel;
