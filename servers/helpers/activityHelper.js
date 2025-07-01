import mongoose from "mongoose";
import ActivityModel from "../Models/ActivityModel.js";
import { AppError } from "../utils/AppError.js";

// Allowed activity actions (must match ActivityModel enum exactly)
const VALID_ACTIONS = [
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
  " UNSUBSCRIBED_FROM_AUTHOR",
  "UPDATED_PAYOUT_DETAILS",
  "CREATED_PAYOUT_DETAILS",
  "DELETED_PAYOUT_DETAILS",
  "VIEWED_EARNINGS",
  "VIEWED_SUGGESTED_POSTS",
  "VIEWED_ALL_EARNINGS",
  "CREATED_PAYOUT"
  ,"VIEWED_ALL_AD_EARNINGS",
  "SET_AD_CONFIG",
  "RECORDED_AD_EARNINGS",
  "POST_BLOCKED",
  "APPROVED_EMAILS",
  "GENERATED_EARNINGS_REPORT",
  "DELETED_PENDING_EMAILS",
  "GENERATED_PENDING_EMAILS",
];

// Record activity function
export const recordActivity = async ({
  userId,
  action,
  targetPost,
  targetComment,
  targetUser,
  targetCategory,
  message,
}) => {
  try {
    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`[Activity] Invalid or missing userId: ${userId}`);
      throw new AppError("Invalid or missing userId", 400);
    }

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      console.error(`[Activity] Invalid or missing action: ${action}`);
      throw new AppError(`Invalid or missing action: ${action}`, 400);
    }

    // Normalize and validate message
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!trimmedMessage) {
      console.error(
        "[Activity] Message is required and must be a non-empty string"
      );
      throw new AppError(
        "Message is required and must be a non-empty string",
        400
      );
    }

    // Validate optional IDs
    if (targetPost && !mongoose.Types.ObjectId.isValid(targetPost)) {
      console.error(`[Activity] Invalid targetPost ID: ${targetPost}`);
      throw new AppError("Invalid targetPost ID", 400);
    }
    if (targetComment && !mongoose.Types.ObjectId.isValid(targetComment)) {
      console.error(`[Activity] Invalid targetComment ID: ${targetComment}`);
      throw new AppError("Invalid targetComment ID", 400);
    }
    if (targetUser && !mongoose.Types.ObjectId.isValid(targetUser)) {
      console.error(`[Activity] Invalid targetUser ID: ${targetUser}`);
      throw new AppError("Invalid targetUser ID", 400);
    }

    // Validate targetCategory if provided
    if (targetCategory !== undefined && targetCategory !== null) {
      if (typeof targetCategory !== "string" || !targetCategory.trim()) {
        console.error(`[Activity] Invalid targetCategory: ${targetCategory}`);
        throw new AppError("Invalid targetCategory", 400);
      }
      targetCategory = targetCategory.trim();
    }

    const newActivity = new ActivityModel({
      user: userId,
      action,
      targetPost,
      targetComment,
      targetUser,
      targetCategory,
      message: trimmedMessage,
    });

    await newActivity.save();
    // console.log(
    //   `[Activity] Recorded: user=${userId} action=${action} message="${trimmedMessage}"`
    // );

    return newActivity;
  } catch (err) {
    console.error("[Activity] Failed to record activity:", {
      error: err.message,
      userId,
      action,
      message,
    });
    throw err instanceof AppError ? err : new AppError(err.message, 500);
  }
};
