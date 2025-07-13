import mongoose from "mongoose";
import ActivityModel from "../Models/ActivityModel.js";
import { AppError } from "../utils/AppError.js";

// All valid actions
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
  "SENDER_EMAIL",
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
  "VIEWED_FOLLOWING_POSTS"
]);

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
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid userId", 400, "ActivityLogger");
    }

    // Validate action
    if (!VALID_ACTIONS.has(action)) {
      throw new AppError(`Invalid action: ${action}`, 400, "ActivityLogger");
    }

    // Validate message
    const msg = typeof message === "string" ? message.trim() : "";
    if (!msg) {
      throw new AppError(
        "Message must be a non-empty string",
        400,
        "ActivityLogger"
      );
    }

    // Validate optional references
    const validateId = (id, label) => {
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError(`Invalid ${label} ID`, 400, "ActivityLogger");
      }
    };

    validateId(targetPost, "targetPost");
    validateId(targetComment, "targetComment");
    validateId(targetUser, "targetUser");

    // Validate category if given
    const cleanCategory =
      typeof targetCategory === "string" ? targetCategory.trim() : undefined;
    if (targetCategory && !cleanCategory) {
      throw new AppError("Invalid targetCategory", 400, "ActivityLogger");
    }

    // Save to DB
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
  } catch (err) {
    console.error("[recordActivity] Error recording activity", {
      message: err.message,
      stack: err.stack,
      userId,
      action,
    });
    throw err instanceof AppError
      ? err
      : new AppError("Failed to record activity", 500, "ActivityLogger");
  }
};
