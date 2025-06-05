import mongoose from "mongoose";
import UserModel from "../Models/User.js";
import { recordActivity } from "../helpers/activityHelper.js";
import { AppError } from "../utils/AppError.js";
import SubscriptionPlanModel from "../Models/SubscriptionPlanModel.js";

// Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create or update subscription plan (Paid or Free)
export const createSubscriptionPlan = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) return next(new AppError("User not authenticated", 401));

    const { planType, amount, posts, bankAccountDetails } = req.body;

    // Validate input
    if (!["free", "paid"].includes(planType)) {
      return next(new AppError("Plan type must be 'free' or 'paid'", 400));
    }
    if (planType === "paid" && (!amount || !bankAccountDetails)) {
      return next(
        new AppError(
          "Amount and bank account details required for paid plan",
          400
        )
      );
    }
    if (!Array.isArray(posts) || posts.length === 0) {
      return next(new AppError("Posts must be a non-empty array", 400));
    }
    if (!posts.every(isValidObjectId)) {
      return next(new AppError("Invalid post IDs provided", 400));
    }

    const user = await UserModel.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    let subscriptionPlan;

    // Check if user already has a subscription plan
    if (user.subscriptionPlan) {
      subscriptionPlan = await SubscriptionPlanModel.findById(
        user.subscriptionPlan
      );
      if (!subscriptionPlan) {
        subscriptionPlan = new SubscriptionPlanModel({ author: userId });
      }
      // Update existing plan
      subscriptionPlan.planType = planType;
      subscriptionPlan.amount = planType === "paid" ? amount : 0;
      subscriptionPlan.posts = posts;
      subscriptionPlan.bankAccountDetails =
        planType === "paid" ? bankAccountDetails : {};
    } else {
      // Create new plan
      subscriptionPlan = new SubscriptionPlanModel({
        author: userId,
        planType,
        amount: planType === "paid" ? amount : 0,
        posts,
        bankAccountDetails: planType === "paid" ? bankAccountDetails : {},
        subscribers: [],
      });
    }

    subscriptionPlan.updatedAt = new Date();
    await subscriptionPlan.save();

    user.hasSubscriptionPlan = true;
    user.subscriptionPlan = subscriptionPlan._id;
    await user.save();

    await recordActivity({
      userId,
      action: "CREATED_SUBSCRIPTION_PLAN",
      message: `Created/Updated ${planType} subscription plan`,
      targetUser: userId,
    });

    return res.status(200).json({
      success: true,
      message: "Subscription plan created/updated successfully",
      data: {
        authorId: userId,
        ...subscriptionPlan.toObject(),
      },
    });
  } catch (error) {
    console.error("[createSubscriptionPlan] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal server error",
            500,
            "createSubscriptionPlan"
          )
    );
  }
};

// Subscribe to an author's paid plan
export const subscribeToPlan = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    const { authorId } = req.params;
    const { paymentId } = req.body;

    if (!userId) return next(new AppError("User not authenticated", 401));
    if (!isValidObjectId(authorId)) return next(new AppError("Invalid authorId", 400));
    if (!paymentId) return next(new AppError("Payment ID required", 400));

    const author = await UserModel.findById(authorId);
    if (!author || !author.subscriptionPlan) {
      return next(new AppError("Author or subscription plan not found", 404));
    }

    const plan = await SubscriptionPlanModel.findById(author.subscriptionPlan);
    if (!plan) return next(new AppError("Subscription plan not found", 404));
    if (plan.planType === "free") {
      return next(new AppError("Cannot subscribe to a free plan", 400));
    }

    // Check if already subscribed
    const existingSubscriberIndex = plan.subscribers.findIndex(
      (s) => s.subscriber.toString() === userId
    );

    if (existingSubscriberIndex !== -1) {
      // Update existing subscriber
      plan.subscribers[existingSubscriberIndex] = {
        subscriber: new mongoose.Types.ObjectId(userId),
        paymentId,
        subscribedAt: new Date(),
      };
    } else {
      // Add new subscriber
      plan.subscribers.push({
        subscriber: new mongoose.Types.ObjectId(userId),
        paymentId,
        subscribedAt: new Date(),
      });
    }

    plan.updatedAt = new Date();
    await plan.save();

    await recordActivity({
      userId,
      action: "SUBSCRIBED_TO_PLAN",
      message: `Subscribed to ${plan.planType} plan of author ${authorId}`,
      targetUser: authorId,
    });

    res.status(200).json({
      success: true,
      message: "Subscribed successfully",
      data: {
        authorId,
        subscriberId: userId,
        planType: plan.planType,
        subscribedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[subscribeToPlan] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Internal server error", 500)
    );
  }
};

// Check if user has access to a post
export const checkPostAccess = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    const { authorId, postId } = req.params;

    if (!userId) return next(new AppError("User not authenticated", 401));
    if (!isValidObjectId(authorId) || !isValidObjectId(postId)) {
      return next(new AppError("Invalid authorId or postId", 400));
    }

    const author = await UserModel.findById(authorId);
    if (!author || !author.subscriptionPlan) {
      return next(new AppError("Author or subscription plan not found", 404));
    }

    const plan = await SubscriptionPlanModel.findById(author.subscriptionPlan);
    if (!plan) return next(new AppError("Subscription plan not found", 404));

    // Check if post is in the plan
    const postExists = plan.posts.some((p) => p.toString() === postId);
    if (!postExists) {
      return next(new AppError("Post not included in subscription plan", 400)); // Line 199
    }

    // Check access
    let hasAccess = false;
    if (plan.planType === "free") {
      hasAccess = true; // Free plans grant access to all posts in the plan
    } else {
      // Paid plan: check if user is a subscriber
      hasAccess = plan.subscribers.some((s) => s.subscriber.toString() === userId);
    }

    return res.status(200).json({
      success: hasAccess,
      hasAccess,
      authorId,
      postId,
      message: hasAccess ? "Access granted" : "Subscription required to access this post",
    });
  } catch (error) {
    console.error("[checkPostAccess] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(error.message || "Internal server error", 500,"checkPostAccess")
    );
  }
};

// Get subscription plan details including subscriber count
export const getSubscriptionPlan = async (req, res, next) => {
  try {
    const { authorId } = req.params;

    if (!isValidObjectId(authorId)) {
      return next(new AppError("Invalid authorId", 400));
    }

    const user = await UserModel.findById(authorId).populate(
      "subscriptionPlan"
    );
    if (!user) return next(new AppError("User not found", 404));

    if (!user.subscriptionPlan) {
      return res.status(200).json({
        success: true,
        data: {
          authorId,
          planType: null,
          amount: 0,
          posts: [],
          bankAccountDetails: {},
          subscriberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    const plan = user.subscriptionPlan;
    const subscriberCount = plan.subscribers.length;

    res.status(200).json({
      success: true,
      data: {
        authorId,
        ...plan.toObject(),
        subscriberCount,
      },
    });
  } catch (error) {
    console.error("[getSubscriptionPlan] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal server error",
            500,
            "getSubscriptionPlan"
          )
    );
  }
};

// Get all subscriptions for the current user
export const getMySubscriptions = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) return next(new AppError("User not authenticated", 401));

    const plans = await SubscriptionPlanModel.find({
      "subscribers.subscriber": userId,
    });

    const subscriptions = plans.map((plan) => ({
      authorId: plan.author.toString(),
      planType: plan.planType,
      subscribedAt: plan.subscribers.find(
        (s) => s.subscriber.toString() === userId
      ).subscribedAt,
    }));

    res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error("[getMySubscriptions] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal server error",
            500,
            "getMySubscriptions"
          )
    );
  }
};

// Get subscribers for an author's plan (author-only)
export const getSubscribers = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    const { authorId } = req.params;

    if (!userId) return next(new AppError("User not authenticated", 401));
    if (!isValidObjectId(authorId))
      return next(new AppError("Invalid authorId", 400));
    if (userId !== authorId) {
      return next(new AppError("Only the author can view subscribers", 403));
    }

    const author = await UserModel.findById(authorId).populate(
      "subscriptionPlan"
    );
    if (!author || !author.subscriptionPlan) {
      return next(new AppError("Author or subscription plan not found", 404));
    }

    const plan = author.subscriptionPlan;
    const subscribers = plan.subscribers.map((s) => ({
      subscriberId: s.subscriber.toString(),
      subscribedAt: s.subscribedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        authorId,
        subscriberCount: subscribers.length,
        subscribers,
      },
    });
  } catch (error) {
    console.error("[getSubscribers] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal server error",
            500,
            "getSubscribers"
          )
    );
  }
};

// Delete a user's subscription (author-only)
export const deleteSubscription = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    const { authorId, subscriberId } = req.params;

    if (!userId) return next(new AppError("User not authenticated", 401));
    if (!isValidObjectId(authorId) || !isValidObjectId(subscriberId)) {
      return next(new AppError("Invalid authorId or subscriberId", 400));
    }
    if (userId !== authorId) {
      return next(
        new AppError("Only the author can delete subscriptions", 403)
      );
    }

    const author = await UserModel.findById(authorId).populate(
      "subscriptionPlan"
    );
    if (!author || !author.subscriptionPlan) {
      return next(new AppError("Author or subscription plan not found", 404));
    }

    const plan = author.subscriptionPlan;
    const subIndex = plan.subscribers.findIndex(
      (s) => s.subscriber.toString() === subscriberId
    );

    if (subIndex === -1) {
      return next(new AppError("Subscription not found", 404));
    }

    // Optional: Integrate with payment provider to cancel/refund
    // const subscription = plan.subscribers[subIndex];
    // await cancelPayment(subscription.paymentId);

    plan.subscribers.splice(subIndex, 1);
    plan.updatedAt = new Date();
    await plan.save();

    await recordActivity({
      userId,
      action: "DELETED_SUBSCRIPTION",
      message: `Author ${userId} deleted subscription for user ${subscriberId}`,
      targetUser: subscriberId,
    });

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
      data: {
        authorId,
        subscriberId,
      },
    });
  } catch (error) {
    console.error("[deleteSubscription] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal server error",
            500,
            "deleteSubscription"
          )
    );
  }
};

// Delete an author's subscription plan
export const deleteSubscriptionPlan = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    const { authorId } = req.params;

    if (!userId) return next(new AppError("User not authenticated", 401));
    if (!isValidObjectId(authorId))
      return next(new AppError("Invalid authorId", 400));
    if (userId !== authorId) {
      return next(new AppError("Only the author can delete their plan", 403));
    }

    const user = await UserModel.findById(authorId).populate(
      "subscriptionPlan"
    );
    if (!user) return next(new AppError("User not found", 404));
    if (!user.subscriptionPlan) {
      return next(new AppError("No subscription plan found", 404));
    }

    // Optional: Cancel any active subscriptions with payment provider
    // for (const sub of user.subscriptionPlan.subscribers) {
    //   await cancelPayment(sub.paymentId);
    // }

    await SubscriptionPlanModel.findByIdAndDelete(user.subscriptionPlan._id);

    user.hasSubscriptionPlan = false;
    user.subscriptionPlan = null;
    await user.save();

    await recordActivity({
      userId,
      action: "DELETED_SUBSCRIPTION_PLAN",
      message: `Author ${userId} deleted their subscription plan`,
      targetUser: userId,
    });

    res.status(200).json({
      success: true,
      message: "Subscription plan deleted successfully",
      data: {
        authorId,
      },
    });
  } catch (error) {
    console.error("[deleteSubscriptionPlan] Error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Internal server error",
            500,
            "deleteSubscriptionPlan"
          )
    );
  }
};
