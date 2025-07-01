import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'POST_CREATED',
        'POST_EDITED',
        'POST_DELETED',
        'COMMENTED',
        'COMMENT_DELETED',
        'LIKED',
        'BOOKMARKED',
        'FOLLOWED_USER',
        'UNFOLLOWED_USER',
        'VOTED_IN_POLL',
        'REPORTED_CONTENT',
        'LOGGED_IN',
        'UPDATED_PROFILE',
        'VIEWED_USERS',
        'DELETED_ACCOUNT',
        'VIEWED_PROFILE',
        'VIEWED_ACTIVITY',
        'VIEWED_POSTS',
        'VIEWED_POST',
        'SIGNED_UP',
        'LOGGED_OUT',
        'CHECKED_AUTH',
        'GOOGLE_LOGGED_IN',
        'BLOCKED_USER',
        'UNBLOCKED_USER',
        'CREATED_RAZORPAY_ORDER',
        'VERIFIED_PAYMENT',
        'FAILED_PAYMENT_VERIFICATION',
        'PROCESSED_BULK_PAYOUT',
        'ATTEMPTED_BULK_PAYOUT',
        'SEARCHED_POSTS',
        'VIEWED_TRENDING_POSTS',
        'VIEWED_LATEST_POSTS',
        'VIEWED_SUBSCRIBED_POSTS',
        'SUBSCRIBED_CATEGORY',
        'UNSUBSCRIBED_CATEGORY',
        'VIEWED_FOLLOWERS_LIST',
        'VIEWED_FOLLOWING_LIST',
        'CREATED_SUBSCRIPTION_PLAN',
        'SUBSCRIBED_TO_PLAN',
        'DELETED_SUBSCRIPTION',
        'DELETED_SUBSCRIPTION_PLAN',
        'UPDATED_SUBSCRIPTION_PLAN',
        'UPDATED_BANK_DETAILS',
        'RAZORPAY_KEY_SECRET',
        'CANCELLED_SUBSCRIPTION',
        'CREATED_SUBSCRIPTION',
        'UNSUBSCRIBED_FROM_AUTHOR',
        'UPDATED_PAYOUT_DETAILS',
        'CREATED_PAYOUT_DETAILS',
        'DELETED_PAYOUT_DETAILS',
        'VIEWED_EARNINGS',
        'VIEWED_SUGGESTED_POSTS', // Added missing enum value
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
      ],
      required: true,
    },
    targetPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    targetComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    targetCategory: {
      type: String,
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
  { timestamps: true }
);

activitySchema.index({ user: 1, action: 1, createdAt: -1 });
activitySchema.index({ targetPost: 1 });
activitySchema.index({ targetComment: 1 });
activitySchema.index({ targetUser: 1 });

const ActivityModel = mongoose.model('Activity', activitySchema);
export default ActivityModel;