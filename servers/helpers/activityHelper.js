import mongoose from "mongoose";
import ActivityModel from "../Models/ActivityModel.js";
import { AppError } from "../../servers/Utils/AppError.js";

// Defines all valid actions for activity logging
export const VALID_ACTIONS = new Set([
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
  "UPDATED_BANK_DETAILS",
  "RAZORPAY_KEY_SECRET",
  "CANCELLED_SUBSCRIPTION",
  "CREATED_SUBSCRIPTION",
  "DELETED_SUBSCRIPTION_PLAN",
  "UPDATED_SUBSCRIPTION_PLAN",
  "SUBSCRIBED_TO_PLAN",
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
]);

// Records user activity with validation
export const recordActivity = async ({
  userId,
  action,
  message,
  targetPost,
  targetComment,
  targetUser,
  targetCategory,
}) => {
  try {
    // Validates user ID
    // Allow dynamic webhook actions like RAZORPAY_WEBHOOK_payment.captured
    const isWebhookAction =
      typeof action === "string" && action.startsWith("RAZORPAY_WEBHOOK_");

    if (!VALID_ACTIONS.has(action) && !isWebhookAction) {
      throw new AppError(
        `Invalid action: ${action}`,
        400,
        "RecordActivity",
        `Action must be in VALID_ACTIONS or start with 'RAZORPAY_WEBHOOK_'`
      );
    }

    // Validates action against allowed set
    if (!VALID_ACTIONS.has(action)) {
      throw new AppError(
        `Invalid action: ${action}`,
        400,
        "RecordActivity",
        `Action must be one of ${[...VALID_ACTIONS].join(", ")}`
      );
    }

    // Validates message
    const msg = typeof message === "string" ? message.trim() : "";
    if (!msg) {
      throw new AppError(
        "Message must be a non-empty string",
        400,
        "RecordActivity",
        "Activity message cannot be empty"
      );
    }

    // Validates optional reference IDs
    const validateId = (id, label) => {
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError(
          `Invalid ${label} ID`,
          400,
          "RecordActivity",
          `${label} must be a valid MongoDB ObjectId`
        );
      }
    };

    validateId(targetPost, "targetPost");
    validateId(targetComment, "targetComment");
    validateId(targetUser, "targetUser");

    // Validates category if provided
    const cleanCategory =
      typeof targetCategory === "string" ? targetCategory.trim() : undefined;
    if (targetCategory && !cleanCategory) {
      throw new AppError(
        "Invalid targetCategory",
        400,
        "RecordActivity",
        "Category must be a non-empty string"
      );
    }

    // Creates activity record
    const newActivity = await ActivityModel.create({
      user: userId,
      action,
      message: msg,
      targetPost,
      targetComment,
      targetUser,
      targetCategory: cleanCategory,
    });

    return newActivity;
  } catch (error) {
    // AppError with context for recording activity
    throw error instanceof AppError
      ? error
      : new AppError(
          error.message || "Failed to record activity",
          500,
          "RecordActivity",
          "Error in recordActivity"
        );
  }
};
