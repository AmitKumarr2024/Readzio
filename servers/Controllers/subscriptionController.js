import asyncHandler from "express-async-handler";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import SubscriptionConfig from "../Models/SubscriptionConfigModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import PaymentModel from "../Models/PaymentModel.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import crypto from "crypto";
import { RAZORPAY_KEY_SECRET } from "../config/dotenv.js";
import axiosInstance from "../Utils/axiosInstance.js";
import mongoose from "mongoose";
import { createNotification } from "../../servers/Utils/createNotification.js";
import UserSubscriptionPlan from "../Models/UserSubscriptionModel.js";
import UserSubscription from "../../servers/Models/UserSubscription.js";

// Validates MongoDB ObjectId
const validateObjectId = (id, type = "ID") => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid ${type}`,
      400,
      "ValidateObjectId",
      `Invalid MongoDB ObjectId for ${type}`
    );
  }
};

// Validates and converts amount to paise (cents)
const validateAndConvertAmount = (amount, field) => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0) {
    throw new AppError(
      `${field} must be a valid positive number`,
      400,
      "ValidateAndConvertAmount",
      `Invalid ${field} value`
    );
  }
  if (parsed > 10000) {
    return Math.round(parsed);
  }
  return Math.round(parsed * 100);
};

// Validates subscription plan type
const validatePlanType = (type) => {
  const validTypes = ["basic", "silver", "gold", "platinum", "custom"];
  if (!validTypes.includes(type.toLowerCase())) {
    throw new AppError(
      `Invalid plan type. Must be one of ${validTypes.join(", ")}`,
      400,
      "ValidatePlanType",
      "Invalid subscription plan type"
    );
  }
  return type.toLowerCase();
};

// Validates that a value is positive
const validatePositive = (value, field) => {
  if (value <= 0) {
    throw new AppError(
      `${field} must be positive`,
      400,
      "ValidatePositive",
      `Non-positive ${field} value`
    );
  }
};

// Validates subscription duration
const validateDuration = (durationDays) => {
  const validDurations = [30, 90, 365];
  if (!validDurations.includes(Number(durationDays))) {
    throw new AppError(
      "Duration must be 30, 90, or 365 days",
      400,
      "ValidateDuration",
      "Invalid subscription duration"
    );
  }
};

// Checks for existing subscription plan with the same name
const checkExistingPlan = async (userId, name, planId = null) => {
  const query = { author: userId, name, deletedAt: null };
  if (planId) query._id = { $ne: planId };
  const existing = await UserSubscriptionPlan.findOne(query);
  if (existing) {
    throw new AppError(
      `Plan "${name}" already exists`,
      400,
      "CheckExistingPlan",
      "Duplicate plan name detected"
    );
  }
};

// Checks subscription plan limit for a user
const checkPlanLimit = async (userId, planId = null) => {
  const query = { author: userId, deletedAt: null };
  if (planId) query._id = { $ne: planId };
  const plans = await UserSubscriptionPlan.find(query);
  if (plans.length >= 3) {
    throw new AppError(
      "Maximum 3 plans allowed per author",
      400,
      "CheckPlanLimit",
      "Plan limit exceeded"
    );
  }
};

// Creates a new subscription plan
export const createSubscriptionPlan = asyncHandler(async (req, res, next) => {
  try {
    const {
      name,
      description = "",
      price,
      postIds = [],
      durationDays,
      type = "custom",
      authorId,
    } = req.body;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "CreateSubscriptionPlan",
        "User not authenticated"
      );
    }
    if (!name || price === undefined || !durationDays || !authorId) {
      throw new AppError(
        "Missing required fields",
        400,
        "CreateSubscriptionPlan",
        "Required fields not provided"
      );
    }
    if (authorId !== req.user._id.toString()) {
      throw new AppError(
        "Author ID mismatch",
        403,
        "CreateSubscriptionPlan",
        "User not authorized for this author ID"
      );
    }
    validateObjectId(authorId, "Author ID");
    const priceInPaise = validateAndConvertAmount(price, "Price");
    validateDuration(durationDays);
    validatePlanType(type);

    for (const postId of postIds) {
      validateObjectId(postId, "Post ID");
    }
    await checkPlanLimit(req.user._id);
    await checkExistingPlan(req.user._id, name);

    const plan = await UserSubscriptionPlan.create({
      name,
      description,
      price: priceInPaise,
      postIds,
      durationDays,
      type,
      author: req.user._id,
      status: "not_confirmed",
    });

    if (postIds.length) {
      await PostModel.updateMany(
        { _id: { $in: postIds } },
        { $set: { isSubscriberOnly: true, isPremium: true } }
      );
    }

    await recordActivity({
      userId: req.user._id.toString(),
      action: "CREATED_SUBSCRIPTION",
      message: `Created ${type} subscription plan ${name} for ₹${(
        priceInPaise / 100
      ).toFixed(2)} with ${postIds.length} post(s)`,
      plan: { name, subscriptionPlanId: plan._id, type, postIds },
    });

    res.status(201).json({
      success: true,
      plan: { ...plan.toObject(), price: plan.price / 100 },
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to create subscription plan",
            500,
            "CreateSubscriptionPlan",
            "Error in createSubscriptionPlan"
          )
    );
  }
});

// Updates an existing subscription plan
export const updateSubscriptionPlan = asyncHandler(async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { name, description, price, postIds, durationDays, type, status } =
      req.body;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "UpdateSubscriptionPlan",
        "User not authenticated"
      );
    }
    validateObjectId(planId, "Plan ID");

    const plan = await UserSubscriptionPlan.findOne({
      _id: planId,
      author: req.user._id,
    });
    if (!plan) {
      throw new AppError(
        "Plan not found or unauthorized",
        404,
        "UpdateSubscriptionPlan",
        "Plan does not exist or user not authorized"
      );
    }

    if (name && name !== plan.name) {
      await checkExistingPlan(req.user._id, name, planId);
      plan.name = name;
    }
    if (description !== undefined) plan.description = description;
    if (price !== undefined) {
      validatePositive(price, "Price");
      plan.price = Math.round(Number(price) * 100);
    }
    if (postIds?.length) {
      for (const postId of postIds) validateObjectId(postId, "Post ID");
      plan.postIds = postIds;
    }
    if (durationDays !== undefined) {
      validateDuration(durationDays);
      const existingPlans = await UserSubscriptionPlan.find({
        author: req.user._id,
        durationDays,
        deletedAt: null,
        _id: { $ne: planId },
      });
      if (existingPlans.length > 0) {
        throw new AppError(
          `A plan with ${durationDays} days already exists`,
          400,
          "UpdateSubscriptionPlan",
          "Duplicate duration detected"
        );
      }
      await checkPlanLimit(req.user._id, planId);
      plan.durationDays = durationDays;
    }
    if (type) plan.type = validatePlanType(type);
    if (status) {
      if (!["active", "pending", "not_confirmed"].includes(status)) {
        throw new AppError(
          "Invalid status. Must be active, pending, or not_confirmed",
          400,
          "UpdateSubscriptionPlan",
          "Invalid status value"
        );
      }
      plan.status = status;
    }

    await plan.save();

    await recordActivity({
      userId: req.user._id.toString(),
      action: "UPDATED_SUBSCRIPTION_PLAN",
      message: `Updated subscription plan "${plan.name}" to ₹${(
        plan.price / 100
      ).toFixed(2)} for ${durationDays || plan.durationDays} days`,
      plan: {
        name: plan.name,
        subscriptionPlanId: plan._id,
        type: plan.type,
        status: plan.status,
      },
    });

    res.status(200).json({
      success: true,
      plan: { ...plan.toObject(), price: plan.price / 100 },
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to update subscription plan",
            500,
            "UpdateSubscriptionPlan",
            "Error in updateSubscriptionPlan"
          )
    );
  }
});

// Deletes a subscription plan and associated records
export const deleteSubscriptionPlan = asyncHandler(async (req, res, next) => {
  try {
    const { planId } = req.params;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "DeleteSubscriptionPlan",
        "User not authenticated"
      );
    }
    validateObjectId(planId, "Plan ID");

    const plan = await UserSubscriptionPlan.findById(planId);
    if (!plan) {
      throw new AppError(
        "Subscription plan not found",
        404,
        "DeleteSubscriptionPlan",
        "Plan does not exist"
      );
    }
    if (plan.author.toString() !== req.user._id.toString()) {
      throw new AppError(
        "You are not authorized to delete this plan",
        403,
        "DeleteSubscriptionPlan",
        "User not authorized for this plan"
      );
    }

    const subscriptions = await UserSubscription.find({ planId });
    const paymentIds = subscriptions
      .map((sub) => sub.paymentId)
      .filter((id) => id);
    if (subscriptions.length) await UserSubscription.deleteMany({ planId });
    if (paymentIds.length)
      await PaymentModel.deleteMany({ paymentId: { $in: paymentIds } });

    await UserSubscriptionPlan.findByIdAndDelete(planId);

    await recordActivity({
      userId: req.user._id.toString(),
      action: "DELETED_SUBSCRIPTION_PLAN",
      message: `Permanently deleted subscription plan "${plan.name}"`,
      plan: { name: plan.name, subscriptionPlanId: plan._id },
    });

    res.status(200).json({
      success: true,
      message: "Plan and associated records permanently deleted",
      plan: { name: plan.name, subscriptionPlanId: plan._id },
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to delete subscription plan",
            500,
            "DeleteSubscriptionPlan",
            "Error in deleteSubscriptionPlan"
          )
    );
  }
});

// Activates a subscription plan
export const activateSubscriptionPlan = asyncHandler(async (req, res, next) => {
  try {
    const { planId } = req.params;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "ActivateSubscriptionPlan",
        "User not authenticated"
      );
    }
    validateObjectId(planId, "Plan ID");

    const plan = await UserSubscriptionPlan.findOne({
      _id: planId,
      author: req.user._id,
    });
    if (!plan) {
      throw new AppError(
        "Plan not found or unauthorized",
        404,
        "ActivateSubscriptionPlan",
        "Plan does not exist or user not authorized"
      );
    }
    if (plan.status === "active") {
      throw new AppError(
        "Plan is already active",
        400,
        "ActivateSubscriptionPlan",
        "Plan already in active state"
      );
    }
    if (plan.status === "deleted" || plan.deletedAt) {
      throw new AppError(
        "Plan is deleted",
        400,
        "ActivateSubscriptionPlan",
        "Cannot activate a deleted plan"
      );
    }

    plan.status = "active";
    await plan.save();

    if (plan.postIds.length) {
      await PostModel.updateMany(
        { _id: { $in: plan.postIds } },
        { $set: { isSubscriberOnly: true, isPremium: true } }
      );
    }

    await recordActivity({
      userId: req.user._id.toString(),
      action: "ACTIVATED_SUBSCRIPTION_PLAN",
      message: `Activated subscription plan "${plan.name}"`,
      plan: { name: plan.name, subscriptionPlanId: plan._id, type: plan.type },
    });

    res.status(200).json({ success: true, plan });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to activate subscription plan",
            500,
            "ActivateSubscriptionPlan",
            "Error in activateSubscriptionPlan"
          )
    );
  }
});

// Subscribes a user to a plan with Razorpay payment verification
export const subscribeToPlan = asyncHandler(async (req, res, next) => {
  try {
    const {
      planId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "SubscribeToPlan",
        "User not authenticated"
      );
    }
    if (
      !planId ||
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature
    ) {
      throw new AppError(
        "Plan ID and Razorpay payment details required",
        400,
        "SubscribeToPlan",
        "Missing required payment fields"
      );
    }
    validateObjectId(planId, "Plan ID");

    const plan = await UserSubscriptionPlan.findById(planId);
    if (!plan) {
      throw new AppError(
        "Plan not found",
        404,
        "SubscribeToPlan",
        "Plan does not exist"
      );
    }
    if (plan.status !== "active") {
      throw new AppError(
        "Plan is not active",
        400,
        "SubscribeToPlan",
        "Plan not in active state"
      );
    }
    if (!plan.author || !mongoose.Types.ObjectId.isValid(plan.author)) {
      throw new AppError(
        "Invalid plan author",
        400,
        "SubscribeToPlan",
        "Plan has invalid author"
      );
    }
    if (plan.author.toString() === req.user._id.toString()) {
      throw new AppError(
        "Cannot subscribe to own plan",
        403,
        "SubscribeToPlan",
        "User cannot subscribe to their own plan"
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (generatedSignature !== razorpay_signature) {
      throw new AppError(
        "Invalid Razorpay signature",
        400,
        "SubscribeToPlan",
        "Payment signature verification failed"
      );
    }

    let payment = await PaymentModel.findOne({ orderId: razorpay_order_id });
    if (!payment) {
      payment = await PaymentModel.create({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        userId: req.user._id,
        amount: plan.price,
        currency: "INR",
        status: "paid",
      });
    } else if (payment.status !== "paid") {
      payment.paymentId = razorpay_payment_id;
      payment.signature = razorpay_signature;
      payment.status = "paid";
      await payment.save();
    }

    const expiryDate = new Date(
      Date.now() + plan.durationDays * 24 * 60 * 60 * 1000
    );
    const subscription = await UserSubscription.create({
      userId: req.user._id,
      planId,
      paymentId: razorpay_payment_id,
      expiryDate,
      status: "active",
      amountPaid: plan.price,
    });

  
    const notification = await createNotification({
      user: plan.author,
      sender: { _id: req.user._id },
      type: "subscription",
      planId: plan._id,
      content: `${req.user.fullName || "Someone"} subscribed to your plan "${
        plan.name
      }"`,
      navigateTo: `/plans/${plan._id}`,
    });

    req.io.to(plan.author.toString()).emit("newNotification", {
      notificationId: notification._id,
      type: "subscription",
      planId,
      userId: req.user._id,
    });

    await recordActivity({
      userId: req.user._id.toString(),
      action: "SUBSCRIBED_TO_PLAN",
      message: `Subscribed to plan "${plan.name}" for ₹${(
        plan.price / 100
      ).toFixed(2)}`,
      plan: { planId: plan._id, name: plan.name },
      subscriptionId: subscription._id,
    });

    res.status(201).json({
      success: true,
      subscription: {
        _id: subscription._id,
        userId: subscription.userId,
        planId: subscription.planId,
        paymentId: subscription.paymentId,
        expiryDate: subscription.expiryDate,
        status: subscription.status,
        amountPaid: subscription.amountPaid / 100,
      },
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to subscribe to plan",
            500,
            "SubscribeToPlan",
            "Error in subscribeToPlan"
          )
    );
  }
});

// Cancels a subscription
export const cancelSubscription = asyncHandler(async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "CancelSubscription",
        "User not authenticated"
      );
    }
    validateObjectId(subscriptionId, "Subscription ID");

    const subscription = await UserSubscription.findOneAndUpdate(
      { _id: subscriptionId, userId: req.user._id },
      { status: "cancelled" },
      { new: true }
    );
    if (!subscription) {
      throw new AppError(
        "Subscription not found or unauthorized",
        404,
        "CancelSubscription",
        "Subscription does not exist or user not authorized"
      );
    }

    const plan = await UserSubscriptionPlan.findById(subscription.planId);

    await recordActivity({
      userId: req.user._id.toString(),
      action: "CANCELLED_SUBSCRIPTION",
      message: `Cancelled subscription ${subscriptionId}`,
      subscriptionId,
    });

    res.status(200).json({ success: true, subscription });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to cancel subscription",
            500,
            "CancelSubscription",
            "Error in cancelSubscription"
          )
    );
  }
});

// Refunds a subscription
export const refundSubscription = asyncHandler(async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "RefundSubscription",
        "User not authenticated"
      );
    }
    validateObjectId(subscriptionId, "Subscription ID");

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId: req.user._id,
    });
    if (!subscription) {
      throw new AppError(
        "Subscription not found or unauthorized",
        404,
        "RefundSubscription",
        "Subscription does not exist or user not authorized"
      );
    }

    const payment = await PaymentModel.findOne({
      paymentId: subscription.paymentId,
    });
    if (!payment) {
      throw new AppError(
        "Payment not found",
        404,
        "RefundSubscription",
        "Payment record not found"
      );
    }

    const timeSincePayment =
      Date.now() - new Date(subscription.createdAt).getTime();
    if (timeSincePayment > 1 * 60 * 60 * 1000) {
      throw new AppError(
        "Refund period has expired (within 1 hour only)",
        403,
        "RefundSubscription",
        "Refund window exceeded"
      );
    }

    const razorpayMode = (process.env.RAZORPAY_MODE || "test").toLowerCase();
    const isTestMode = razorpayMode === "test";
    const isPaymentTest = payment.paymentId.startsWith("pay_test_");
    if (isTestMode && !isPaymentTest) {
      throw new AppError(
        "Razorpay in TEST mode but payment ID is LIVE",
        400,
        "RefundSubscription",
        "Mode mismatch with payment ID"
      );
    }
    if (!isTestMode && isPaymentTest) {
      throw new AppError(
        "Razorpay in LIVE mode but payment ID is TEST",
        400,
        "RefundSubscription",
        "Mode mismatch with payment ID"
      );
    }

    try {
      await axiosInstance.get(`/payments/${payment.paymentId}`, {
        headers: { "X-Api-Type": "razorpay" },
      });
    } catch (err) {
      throw new AppError(
        "Payment not found on Razorpay",
        404,
        "RefundSubscription",
        "Payment not found in Razorpay system"
      );
    }

    try {
      const refundResponse = await axiosInstance.post(
        `/payments/${payment.paymentId}/refund`,
        {},
        { headers: { "X-Api-Type": "razorpay" } }
      );
      subscription.status = "refunded";
      await subscription.save();
      await PaymentModel.findOneAndUpdate(
        { paymentId: subscription.paymentId },
        { status: "refunded" }
      );

      await recordActivity({
        userId: req.user._id.toString(),
        action: "REFUNDED_SUBSCRIPTION",
        message: `Refunded subscription ${subscriptionId}`,
        subscriptionId,
      });

      const plan = await UserSubscriptionPlan.findById(subscription.planId);
   
      res.status(200).json({ success: true, refund: refundResponse.data });
    } catch (refundError) {
      throw new AppError(
        refundError.response?.data?.error?.description || "Refund failed",
        refundError.response?.status || 500,
        "RefundSubscription",
        "Error processing refund with Razorpay"
      );
    }
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to refund subscription",
            500,
            "RefundSubscription",
            "Error in refundSubscription"
          )
    );
  }
});

// Retrieves subscription history for an author
export const getSubscriptionHistoryByAuthor = asyncHandler(
  async (req, res, next) => {
    try {
      const { authorId } = req.params;

      if (!req.user?._id) {
        throw new AppError(
          "Unauthorized",
          401,
          "GetSubscriptionHistoryByAuthor",
          "User not authenticated"
        );
      }
      validateObjectId(authorId, "Author ID");
      if (authorId !== req.user._id.toString()) {
        throw new AppError(
          "Unauthorized: Can only fetch history for own plans",
          403,
          "GetSubscriptionHistoryByAuthor",
          "User not authorized for this author ID"
        );
      }

      const plans = await UserSubscriptionPlan.find({
        author: authorId,
      }).select("_id");
      if (!plans.length) {
        return res.status(200).json({
          success: true,
          subscriptions: [],
          message: "No plans found for this author",
        });
      }

      const subscriptions = await UserSubscription.find({
        planId: { $in: plans.map((p) => p._id) },
      })
        .populate("userId", "name email")
        .populate("planId", "name price durationDays")
        .lean();

      const enrichedSubscriptions = await Promise.all(
        subscriptions.map(async (sub) => ({
          ...sub,
          paymentStatus:
            (
              await PaymentModel.findOne({ paymentId: sub.paymentId }).lean()
            )?.status || "not_paid",
          amount:
            (
              await PaymentModel.findOne({ paymentId: sub.paymentId }).lean()
            )?.amount / 100 ||
            sub.planId?.price / 100 ||
            0,
        }))
      );

      res.status(200).json({
        success: true,
        subscriptions: enrichedSubscriptions,
        count: enrichedSubscriptions.length,
      });
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to fetch subscription history",
              500,
              "GetSubscriptionHistoryByAuthor",
              "Error in getSubscriptionHistoryByAuthor"
            )
      );
    }
  }
);

// Retrieves analytics for a subscription plan
export const getSubscriptionAnalytics = asyncHandler(async (req, res, next) => {
  try {
    const { planId } = req.params;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "GetSubscriptionAnalytics",
        "User not authenticated"
      );
    }
    validateObjectId(planId, "Plan ID");

    const plan = await UserSubscriptionPlan.findById(planId);
    if (!plan) {
      throw new AppError(
        "Plan not found",
        404,
        "GetSubscriptionAnalytics",
        "Plan does not exist"
      );
    }
    if (plan.author.toString() !== req.user._id.toString()) {
      throw new AppError(
        "Unauthorized access to this plan",
        403,
        "GetSubscriptionAnalytics",
        "User not authorized for this plan"
      );
    }

    const subscriptions = await UserSubscription.find({ planId }).lean();
    const totalSubscribers = subscriptions.length;
    const activeSubscribers = subscriptions.filter(
      (sub) => sub.status === "active"
    ).length;
    const totalRevenue = (
      await Promise.all(
        subscriptions.map(
          async (sub) =>
            (
              await PaymentModel.findOne({ paymentId: sub.paymentId })
            )?.amount || 0
        )
      )
    ).reduce((sum, amount) => sum + amount, 0);

 

    res.status(200).json({
      success: true,
      plan,
      totalSubscribers,
      activeSubscribers,
      totalRevenue: totalRevenue / 100,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch subscription analytics",
            500,
            "GetSubscriptionAnalytics",
            "Error in getSubscriptionAnalytics"
          )
    );
  }
});

// Sends renewal reminders for subscriptions nearing expiry
export const sendRenewalReminders = asyncHandler(async (req, res, next) => {
  try {
    const { daysBeforeExpiry = 7 } = req.body;

    if (daysBeforeExpiry <= 0) {
      throw new AppError(
        "Days before expiry must be positive",
        400,
        "SendRenewalReminders",
        "Invalid days before expiry"
      );
    }

    const subscriptions = await UserSubscription.find({
      status: "active",
      expiryDate: {
        $lte: new Date(Date.now() + daysBeforeExpiry * 24 * 60 * 60 * 1000),
      },
      lastReminderSent: { $exists: false },
    });

    for (const sub of subscriptions) {
      const user = await UserModel.findById(sub.userId);
      const plan = await UserSubscriptionPlan.findById(sub.planId);
    
      sub.lastReminderSent = new Date();
      await sub.save();

      await recordActivity({
        userId: sub.userId.toString(),
        action: "SENT_RENEWAL_REMINDER",
        message: `Sent renewal reminder for subscription ${sub._id}`,
        subscriptionId: sub._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Sent reminders to ${subscriptions.length} users`,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to send renewal reminders",
            500,
            "SendRenewalReminders",
            "Error in sendRenewalReminders"
          )
    );
  }
});

// Retrieves all subscription plans for the authenticated user
export const getAllMySubscriptionPlans = asyncHandler(
  async (req, res, next) => {
    try {
      if (!req.user?._id) {
        throw new AppError(
          "Unauthorized",
          401,
          "GetAllMySubscriptionPlans",
          "User not authenticated"
        );
      }

      const filter = {
        author: req.user._id,
        ...(req.query.includeDeleted !== "true" && { deletedAt: null }),
      };

      const plans = await UserSubscriptionPlan.find(filter).sort({
        createdAt: -1,
      });

      const enrichedPlans = await Promise.all(
        plans.map(async (plan) => {
          const subscriptions = await UserSubscription.find({
            planId: plan._id,
          });
          const totalSubscribers = subscriptions.length;
          const activeSubscribers = subscriptions.filter(
            (sub) => sub.status === "active"
          ).length;
          const totalRevenue = subscriptions.reduce(
            (sum, sub) =>
              sub.status === "active"
                ? sum + (sub.amountPaid || plan.price || 0)
                : sum,
            0
          );

          return {
            ...plan.toObject(),
            totalSubscribers,
            activeSubscribers,
            totalRevenue: totalRevenue / 100,
            subscriptionHistory: subscriptions.map((sub) => ({
              userId: sub.userId,
              status: sub.status,
              amountPaid: (sub.amountPaid || 0) / 100,
              createdAt: sub.createdAt,
              updatedAt: sub.updatedAt,
              cancelledAt: sub.cancelledAt || null,
            })),
          };
        })
      );

      res.status(200).json({
        success: true,
        count: enrichedPlans.length,
        plans: enrichedPlans,
        analytics: enrichedPlans.reduce(
          (acc, plan) => ({
            ...acc,
            [plan._id]: {
              totalSubscribers: plan.totalSubscribers,
              activeSubscribers: plan.activeSubscribers,
              totalRevenue: plan.totalRevenue,
            },
          }),
          {}
        ),
      });
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to fetch subscription plans",
              500,
              "GetAllMySubscriptionPlans",
              "Error in getAllMySubscriptionPlans"
            )
      );
    }
  }
);

// Retrieves subscription plans by author
export const getSubscriptionPlansByAuthor = asyncHandler(
  async (req, res, next) => {
    try {
      const { authorId } = req.params;

      if (!req.user?._id) {
        throw new AppError(
          "Unauthorized",
          401,
          "GetSubscriptionPlansByAuthor",
          "User not authenticated"
        );
      }
      validateObjectId(authorId, "Author ID");

      const plans = await UserSubscriptionPlan.find({
        author: authorId,
        status: { $ne: "deleted" },
      }).sort({ createdAt: -1 });

      res.status(200).json({ success: true, count: plans.length, plans });
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to fetch subscription plans by author",
              500,
              "GetSubscriptionPlansByAuthor",
              "Error in getSubscriptionPlansByAuthor"
            )
      );
    }
  }
);

// Unsubscribes a user from all plans by an author
export const unsubscribeByAuthor = asyncHandler(async (req, res, next) => {
  try {
    const { authorId, userId } = req.body;

    if (!req.user?._id) {
      throw new AppError(
        "Unauthorized",
        401,
        "UnsubscribeByAuthor",
        "User not authenticated"
      );
    }
    validateObjectId(authorId, "Author ID");
    validateObjectId(userId, "User ID");
    if (userId !== req.user._id.toString()) {
      throw new AppError(
        "Unauthorized: User ID mismatch",
        403,
        "UnsubscribeByAuthor",
        "User ID does not match authenticated user"
      );
    }

    const plans = await UserSubscriptionPlan.find({ author: authorId }).select(
      "_id"
    );
    if (!plans.length) {
      return res
        .status(200)
        .json({ success: true, message: "No subscriptions to cancel" });
    }

    const updatedSubscriptions = await UserSubscription.updateMany(
      { userId, planId: { $in: plans.map((p) => p._id) }, status: "active" },
      { status: "cancelled" },
      { new: true }
    );

    if (updatedSubscriptions.modifiedCount > 0) {
      await recordActivity({
        userId: req.user._id.toString(),
        action: "UNSUBSCRIBED_FROM_AUTHOR",
        message: `Unsubscribed from all plans by author ${authorId}`,
        authorId,
      });
    }

    res.status(200).json({
      success: true,
      message: `Cancelled ${updatedSubscriptions.modifiedCount} subscription(s)`,
      authorId,
      userId,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to unsubscribe from author",
            500,
            "UnsubscribeByAuthor",
            "Error in unsubscribeByAuthor"
          )
    );
  }
});

// Retrieves subscription status for plans by an author
export const getSubscriptionStatusByAuthor = asyncHandler(
  async (req, res, next) => {
    try {
      const userId = req.user?._id.toString();
      const { authorId } = req.body;

      if (!userId) {
        throw new AppError(
          "Unauthorized",
          401,
          "GetSubscriptionStatusByAuthor",
          "User not authenticated"
        );
      }
      validateObjectId(authorId, "Author ID");

      if (authorId === userId) {
        throw new AppError(
          "You cannot subscribe to your own plans",
          400,
          "GetSubscriptionStatusByAuthor",
          "User cannot subscribe to own plans"
        );
      }

      const authorPlanIds = await UserSubscriptionPlan.find({
        author: authorId,
      }).distinct("_id");

      const activeSubscriptions = await UserSubscription.find({
        userId,
        planId: { $in: authorPlanIds },
        status: "active",
        expiryDate: { $gt: new Date() },
      }).populate({
        path: "planId",
        select:
          "_id author name price status description postIds durationDays type",
        populate: {
          path: "postIds",
          model: "Post",
          select:
            "title _id isSubscriberOnly category tags excerpt readingTime",
        },
      });

      const subscriptions = await Promise.all(
        activeSubscriptions.map(async (sub) => {
          const subscriberCount = await UserSubscription.countDocuments({
            planId: sub.planId._id,
            status: "active",
            expiryDate: { $gt: new Date() },
          });

          return {
            subscriptionId: sub._id,
            planId: sub.planId._id,
            planName: sub.planId.name,
            planType: sub.planId.type || "silver",
            price: sub.planId.price / 100,
            durationDays: sub.planId.durationDays,
            description:
              sub.planId.description ||
              "Unlock exclusive content with this plan.",
            posts:
              sub.planId.postIds?.map((post) => ({
                id: post._id,
                title: post.title || "Untitled Post",
                isSubscriberOnly: post.isSubscriberOnly || false,
                category: post.category || "General",
                tags: post.tags || [],
                excerpt: post.excerpt || "No excerpt available.",
                readingTime: post.readingTime || 0,
                postType:
                  post.isPremium || post.isSubscriberOnly ? "premium" : "free",
              })) || [],
            subscriberCount,
            paymentId: sub.paymentId,
            subscribedAt: sub.createdAt,
            expiresAt: sub.expiryDate,
          };
        })
      );

      res.status(200).json({
        success: true,
        isSubscribed: subscriptions.length > 0,
        subscriptions,
      });
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to fetch subscription status",
              500,
              "GetSubscriptionStatusByAuthor",
              "Error in getSubscriptionStatusByAuthor"
            )
      );
    }
  }
);

// Retrieves all subscribed plans for the authenticated user
export const getMySubscribedPlans = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      throw new AppError(
        "Unauthorized",
        401,
        "GetMySubscribedPlans",
        "User not authenticated"
      );
    }

    const query = {
      userId,
      ...(req.query.includeCancelled !== "true" && {
        status: { $ne: "cancelled" },
      }),
      ...(req.query.includeExpired !== "true" && {
        expiryDate: { $gt: new Date() },
      }),
    };

    const subscriptions = await UserSubscription.find(query)
      .populate({
        path: "planId",
        select: "name author price durationDays type status",
      })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = subscriptions
      .filter((sub) => sub.planId)
      .map((sub) => ({
        subscriptionId: sub._id,
        planId: sub.planId._id,
        planName: sub.planId.name,
        authorId: sub.planId.author,
        planType: sub.planId.type,
        price: (sub.planId.price || 0) / 100,
        durationDays: sub.planId.durationDays,
        status: sub.status,
        expiresAt: sub.expiryDate,
        subscribedAt: sub.createdAt,
      }));

    res
      .status(200)
      .json({ success: true, count: enriched.length, plans: enriched });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch subscribed plans",
            500,
            "GetMySubscribedPlans",
            "Error in getMySubscribedPlans"
          )
    );
  }
});

// Checks eligibility for creating subscription plans
export const checkEligibilityForSubscription = asyncHandler(
  async (req, res, next) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        throw new AppError(
          "Unauthorized",
          401,
          "CheckEligibilityForSubscription",
          "User not authenticated"
        );
      }

      const user = await UserModel.findById(userId).lean();
      if (!user) {
        throw new AppError(
          "User not found",
          404,
          "CheckEligibilityForSubscription",
          "User does not exist"
        );
      }

      const config = await SubscriptionConfig.findOne({
        key: "subscriptionEligibility",
      }).lean();
      if (!config) {
        throw new AppError(
          "Subscription configuration not found",
          500,
          "CheckEligibilityForSubscription",
          "Missing subscription eligibility configuration"
        );
      }

      const followerCount = user.followers?.length || 0;
      const postCount = await PostModel.countDocuments({
        author: userId,
        isPublished: true,
      });

      const isEligible =
        followerCount >= config.minFollowers &&
        postCount >= config.minPosts &&
        (user.engagementRate || 0) >= config.minEngagementRate &&
        (Date.now() - new Date(user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24) >=
          config.minAccountAgeDays;

      res.status(200).json({
        success: true,
        isEligible,
        followerCount,
        postCount,
        engagementRate: user.engagementRate || 0,
        accountAgeDays: Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
        criteria: {
          minFollowers: config.minFollowers,
          minPosts: config.minPosts,
          minEngagementRate: config.minEngagementRate,
          minAccountAgeDays: config.minAccountAgeDays,
        },
        message: isEligible
          ? "You are eligible to create subscription plans."
          : `You need at least ${config.minFollowers} followers, ${
              config.minPosts
            } published posts, ${
              config.minEngagementRate * 100
            }% engagement rate, and an account age of ${
              config.minAccountAgeDays
            } days to enable subscriptions.`,
      });
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to check subscription eligibility",
              500,
              "CheckEligibilityForSubscription",
              "Error in checkEligibilityForSubscription"
            )
      );
    }
  }
);
