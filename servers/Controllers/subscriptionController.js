import asyncHandler from "express-async-handler";
import SubscriptionPlanModel from "../Models/SubscriptionPlanModel.js";
import UserSubscriptionModel from "../Models/UserSubscriptionModel.js";
import PaymentModel from "../Models/PaymentModel.js";
import { recordActivity } from "../helpers/activityHelper.js";
import crypto from "crypto";
import { RAZORPAY_KEY_SECRET, SENDER_EMAIL } from "../config/dotenv.js";
import { AppError } from "../utils/AppError.js";
import axiosInstance from "../utils/axiosInstance.js";
import mongoose from "mongoose";
import transporter from "../config/nodeMailer.js";
import { createNotification } from "../utils/createNotification.js";
import createMailOption from "../helpers/emailHelper.js";
import UserModel from "../models/User.js";
import { sendEmailWithRetries } from "../helpers/sendEmailWithRetries.js";
import PostModel from "../Models/Post.js";

const validateObjectId = (id, type = "ID") => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${type}`, 400);
  }
};

const validatePlanType = (type) => {
  const validTypes = ["silver", "gold", "platinum", "custom"];
  if (!validTypes.includes(type.toLowerCase())) {
    throw new AppError(
      `Invalid plan type. Must be one of ${validTypes.join(", ")}`,
      400
    );
  }
  return type.toLowerCase();
};

const validatePositive = (value, field) => {
  if (value <= 0) throw new AppError(`${field} must be positive`, 400);
};

const checkExistingPlan = async (userId, name, planId = null) => {
  const query = { author: userId, name };
  if (planId) query._id = { $ne: planId };
  const existing = await SubscriptionPlanModel.findOne(query);
  if (existing) throw new AppError(`Plan "${name}" already exists`, 400);
};

const checkActivePlan = async (userId, planId = null) => {
  const query = { author: userId, status: "active" };
  if (planId) query._id = { $ne: planId };
  const existing = await SubscriptionPlanModel.findOne(query);
  if (existing) throw new AppError("An active plan already exists", 400);
};

export const createSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const {
    name,
    description = "",
    price,
    postIds = [],
    durationDays,
    type = "custom",
    authorId,
  } = req.body;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  if (!name || price === undefined || !durationDays || !authorId) {
    throw new AppError("Missing required fields", 400);
  }
  if (authorId !== req.user._id.toString())
    throw new AppError("Author ID mismatch", 403);

  validateObjectId(authorId, "Author ID");
  validatePositive(price, "Price");
  validatePositive(durationDays, "Duration");
  validatePlanType(type);

  for (const postId of postIds) validateObjectId(postId, "Post ID");
  await checkActivePlan(req.user._id);
  await checkExistingPlan(req.user._id, name);

  const priceInPaise = Math.round(Number(price));
  const plan = await SubscriptionPlanModel.create({
    name,
    description,
    price: priceInPaise,
    postIds,
    durationDays,
    type,
    author: req.user._id,
    status: "not_confirmed",
  });

  await recordActivity({
    userId: req.user._id.toString(),
    action: "CREATED_SUBSCRIPTION",
    message: `Created ${type} subscription plan ${name} for ₹${(
      priceInPaise / 100
    ).toFixed(2)} with ${postIds.length} post(s)`,
    plan: { name, subscriptionPlanId: plan._id, type, postIds },
  });

  res.status(201).json({ success: true, plan });
});

export const updateSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const { planId } = req.params;
  const { name, description, price, postIds, durationDays, type, status } =
    req.body;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  validateObjectId(planId, "Plan ID");

  const plan = await SubscriptionPlanModel.findOne({
    _id: planId,
    author: req.user._id,
  });
  if (!plan) throw new AppError("Plan not found or unauthorized", 404);

  if (name && name !== plan.name)
    await checkExistingPlan(req.user._id, name, planId);
  if (name) plan.name = name;
  if (description !== undefined) plan.description = description;
  if (price !== undefined) {
    validatePositive(price, "Price");
    plan.price = Math.round(Number(price));
  }
  if (postIds?.length) {
    for (const postId of postIds) validateObjectId(postId, "Post ID");
    plan.postIds = postIds;
  }
  if (durationDays !== undefined) {
    validatePositive(durationDays, "Duration");
    plan.durationDays = durationDays;
  }
  if (type) plan.type = validatePlanType(type);
  if (status) {
    if (!["active", "pending", "not_confirmed"].includes(status)) {
      throw new AppError(
        "Invalid status. Must be active, pending, or not_confirmed",
        400
      );
    }
    if (status === "active") await checkActivePlan(req.user._id, planId);
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

  res.status(200).json({ success: true, plan });
});

export const deleteSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const { planId } = req.params;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  validateObjectId(planId, "Plan ID");

  const plan = await SubscriptionPlanModel.findById(planId);
  if (!plan) throw new AppError("Subscription plan not found", 404);
  if (plan.author.toString() !== req.user._id.toString()) {
    throw new AppError("You are not authorized to delete this plan", 403);
  }

  const subscriptions = await UserSubscriptionModel.find({ planId });
  const paymentIds = subscriptions
    .map((sub) => sub.paymentId)
    .filter((id) => id);
  if (subscriptions.length) await UserSubscriptionModel.deleteMany({ planId });
  if (paymentIds.length)
    await PaymentModel.deleteMany({ paymentId: { $in: paymentIds } });

  await SubscriptionPlanModel.findByIdAndDelete(planId);
  await recordActivity({
    userId: req.user._id.toString(),
    action: "DELETED_SUBSCRIPTION_PLAN",
    message: `Permanently deleted subscription plan "${plan.name}"`,
    plan: { name: plan.name, subscriptionPlanId: plan._id },
  });

  res
    .status(200)
    .json({
      success: true,
      message: "Plan and associated records permanently deleted",
      plan: { name: plan.name, subscriptionPlanId: plan._id },
    });
});

export const subscribeToPlan = asyncHandler(async (req, res, next) => {
  const { planId, razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  if (
    !planId ||
    !razorpay_payment_id ||
    !razorpay_order_id ||
    !razorpay_signature
  ) {
    throw new AppError("Plan ID and Razorpay payment details required", 400);
  }
  validateObjectId(planId, "Plan ID");

  const plan = await SubscriptionPlanModel.findById(planId);
  if (!plan) throw new AppError("Plan not found", 404);
  if (plan.status !== "active") throw new AppError("Plan is not active", 400);
  if (!plan.author || !mongoose.Types.ObjectId.isValid(plan.author)) {
    throw new AppError("Invalid plan author", 400);
  }
  if (plan.author.toString() === req.user._id.toString()) {
    throw new AppError("Cannot subscribe to own plan", 403);
  }

  const existingSubscription = await UserSubscriptionModel.findOne({
    userId: req.user._id,
    planId,
    status: "active",
    expiryDate: { $gt: new Date() },
  });
  if (existingSubscription)
    throw new AppError(
      "You already have an active subscription to this plan",
      400
    );

  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (generatedSignature !== razorpay_signature)
    throw new AppError("Invalid Razorpay signature", 400);

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
  const subscription = await UserSubscriptionModel.create({
    userId: req.user._id,
    planId,
    paymentId: razorpay_payment_id,
    expiryDate,
    status: "active",
  });

  // Send subscription confirmation email
  const mailOption = createMailOption({
    to: req.user.email,
    subject: "Subscription Confirmation",
    name: req.user.fullName || "User",
    email: req.user.email,
    message: `You have successfully subscribed to the plan "${
      plan.name
    }" for ₹${(plan.price / 100).toFixed(
      2
    )}. Your subscription will expire on ${expiryDate.toDateString()}.`,
    hasButton: false,
  });
  await sendEmailWithRetries(mailOption, req.user._id, "subscription");
  await transporter.sendMail(mailOption);

  const notification = await createNotification({
    user: req.user._id,
    targetUser: plan.author,
    type: "subscription",
    planId,
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
    message: `Subscribed to plan "${plan.name}" for ₹${plan.price / 100}`,
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
      createdAt: subscription.createdAt,
    },
  });
});

export const cancelSubscription = asyncHandler(async (req, res, next) => {
  const { subscriptionId } = req.params;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  validateObjectId(subscriptionId, "Subscription ID");

  const subscription = await UserSubscriptionModel.findOneAndUpdate(
    { _id: subscriptionId, userId: req.user._id },
    { status: "cancelled" },
    { new: true }
  );
  if (!subscription)
    throw new AppError("Subscription not found or unauthorized", 404);

  const plan = await SubscriptionPlanModel.findById(subscription.planId);
  // Send cancellation confirmation email
  const mailOption = createMailOption({
    to: req.user.email,
    subject: "Subscription Cancellation Confirmation",
    name: req.user.fullName || "User",
    email: req.user.email,
    message: `Your subscription to "${plan.name}" has been successfully cancelled.`,
    hasButton: false,
  });
  await transporter.sendMail(mailOption);

  await recordActivity({
    userId: req.user._id.toString(),
    action: "CANCELLED_SUBSCRIPTION",
    message: `Cancelled subscription ${subscriptionId}`,
    subscriptionId,
  });

  res.status(200).json({ success: true, subscription });
});

export const refundSubscription = asyncHandler(async (req, res, next) => {
  const { subscriptionId } = req.params;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  validateObjectId(subscriptionId, "Subscription ID");

  const subscription = await UserSubscriptionModel.findOne({
    _id: subscriptionId,
    userId: req.user._id,
  });
  if (!subscription)
    throw new AppError("Subscription not found or unauthorized", 404);

  const payment = await PaymentModel.findOne({
    paymentId: subscription.paymentId,
  });
  if (!payment) throw new AppError("Payment not found", 404);

  const timeSincePayment =
    Date.now() - new Date(subscription.createdAt).getTime();
  if (timeSincePayment > 1 * 60 * 60 * 1000) {
    throw new AppError("Refund period has expired (within 1 hour only)", 403);
  }

  const razorpayMode = (process.env.RAZORPAY_MODE || "test").toLowerCase();
  const isTestMode = razorpayMode === "test";
  const isPaymentTest = payment.paymentId.startsWith("pay_test_");
  if (isTestMode && !isPaymentTest)
    throw new AppError("Razorpay in TEST mode but payment ID is LIVE", 400);
  if (!isTestMode && isPaymentTest)
    throw new AppError("Razorpay in LIVE mode but payment ID is TEST", 400);

  try {
    await axiosInstance.get(`/payments/${payment.paymentId}`, {
      headers: { "X-Api-Type": "razorpay" },
    });
  } catch (err) {
    throw new AppError("Payment not found on Razorpay", 404);
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

    const plan = await SubscriptionPlanModel.findById(subscription.planId);
    const mailOption = createMailOption({
      to: req.user.email,
      subject: "Refund Processed Successfully",
      name: req.user.fullName || "User",
      email: req.user.email,
      message: `Your refund of ₹${(payment.amount / 100).toFixed(
        2
      )} for the plan "${plan.name}" has been successfully processed.`,
      hasButton: false,
    });
    await transporter.sendMail(mailOption);

    res.status(200).json({ success: true, refund: refundResponse.data });
  } catch (refundError) {
    throw new AppError(
      refundError.response?.data?.error?.description || "Refund failed",
      refundError.response?.status || 500
    );
  }
});

export const getSubscriptionHistoryByAuthor = asyncHandler(
  async (req, res, next) => {
    const { authorId } = req.params;
    if (!req.user?._id) throw new AppError("Unauthorized", 401);
    validateObjectId(authorId, "Author ID");
    if (authorId !== req.user._id.toString())
      throw new AppError(
        "Unauthorized: Can only fetch history for own plans",
        403
      );

    const plans = await SubscriptionPlanModel.find({ author: authorId }).select(
      "_id"
    );
    if (!plans.length) {
      return res
        .status(200)
        .json({
          success: true,
          subscriptions: [],
          message: "No plans found for this author",
        });
    }

    const subscriptions = await UserSubscriptionModel.find({
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

    res
      .status(200)
      .json({
        success: true,
        subscriptions: enrichedSubscriptions,
        count: enrichedSubscriptions.length,
      });
  }
);

export const getSubscriptionAnalytics = asyncHandler(async (req, res, next) => {
  const { planId } = req.params;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  validateObjectId(planId, "Plan ID");

  const plan = await SubscriptionPlanModel.findById(planId);
  if (!plan) throw new AppError("Plan not found", 404);
  if (plan.author.toString() !== req.user._id.toString())
    throw new AppError("Unauthorized access to this plan", 403);

  const subscriptions = await UserSubscriptionModel.find({ planId }).lean();
  const totalSubscribers = subscriptions.length;
  const activeSubscribers = subscriptions.filter(
    (sub) => sub.status === "active"
  ).length;
  const totalRevenue = (
    await Promise.all(
      subscriptions.map(
        async (sub) =>
          (await PaymentModel.findOne({ paymentId: sub.paymentId }))?.amount ||
          0
      )
    )
  ).reduce((sum, amount) => sum + amount, 0);

  if (req.query.sendEmail === "true") {
    const mailOption = createMailOption({
      to: req.user.email,
      subject: "Subscription Analytics Report",
      name: req.user.fullName || "User",
      email: req.user.email,
      message: `Your plan "${
        plan.name
      }" has ${activeSubscribers} active subscribers and has generated ₹${
        totalRevenue / 100
      } in total revenue.`,
      hasButton: false,
    });
    await transporter.sendMail(mailOption);
  }

  res
    .status(200)
    .json({
      success: true,
      plan,
      totalSubscribers,
      activeSubscribers,
      totalRevenue: totalRevenue / 100,
    });
});

export const sendRenewalReminders = asyncHandler(async (req, res, next) => {
  const { daysBeforeExpiry = 7 } = req.body;
  if (daysBeforeExpiry <= 0)
    throw new AppError("Days before expiry must be positive", 400);

  const subscriptions = await UserSubscriptionModel.find({
    status: "active",
    expiryDate: {
      $lte: new Date(Date.now() + daysBeforeExpiry * 24 * 60 * 60 * 1000),
    },
    lastReminderSent: { $exists: false },
  });

  for (const sub of subscriptions) {
    const user = await UserModel.findById(sub.userId);
    const plan = await SubscriptionPlanModel.findById(sub.planId);
    const mailOption = createMailOption({
      to: user.email,
      subject: "Subscription Renewal Reminder",
      name: user.fullName || "User",
      email: user.email,
      message: `Your subscription to "${
        plan.name
      }" will expire on ${sub.expiryDate.toDateString()}. Renew now to continue enjoying premium content!`,
      hasButton: true,
      buttonText: "Renew Now",
      buttonUrl: `https://yourapp.com/renew/${sub._id}`,
    });
    await transporter.sendMail(mailOption);
    sub.lastReminderSent = new Date();
    await sub.save();

    await recordActivity({
      userId: sub.userId.toString(),
      action: "SENT_RENEWAL_REMINDER",
      message: `Sent renewal reminder for subscription ${sub._id}`,
      subscriptionId: sub._id,
    });
  }

  res
    .status(200)
    .json({
      success: true,
      message: `Sent reminders to ${subscriptions.length} users`,
    });
});

export const getAllMySubscriptionPlans = asyncHandler(
  async (req, res, next) => {
    if (!req.user?._id) throw new AppError("Unauthorized", 401);
    const filter = {
      author: req.user._id,
      ...(req.query.includeDeleted !== "true" && { deletedAt: null }),
    };
    const plans = await SubscriptionPlanModel.find(filter).sort({
      createdAt: -1,
    });

    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        const subscriptions = await UserSubscriptionModel.find({
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
  }
);

export const getSubscriptionPlansByAuthor = asyncHandler(
  async (req, res, next) => {
    const { authorId } = req.params;
    if (!req.user?._id) throw new AppError("Unauthorized", 401);
    validateObjectId(authorId, "Author ID");

    const plans = await SubscriptionPlanModel.find({
      author: authorId,
      status: { $ne: "deleted" },
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: plans.length, plans });
  }
);

export const unsubscribeByAuthor = asyncHandler(async (req, res, next) => {
  const { authorId, userId } = req.body;
  if (!req.user?._id) throw new AppError("Unauthorized", 401);
  validateObjectId(authorId, "Author ID");
  validateObjectId(userId, "User ID");
  if (userId !== req.user._id.toString())
    throw new AppError("Unauthorized: User ID mismatch", 403);

  const plans = await SubscriptionPlanModel.find({ author: authorId }).select(
    "_id"
  );
  if (!plans.length)
    return res
      .status(200)
      .json({ success: true, message: "No subscriptions to cancel" });

  const updatedSubscriptions = await UserSubscriptionModel.updateMany(
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

  res
    .status(200)
    .json({
      success: true,
      message: `Cancelled ${updatedSubscriptions.modifiedCount} subscription(s)`,
      authorId,
      userId,
    });
});

export const getSubscriptionStatusByAuthor = asyncHandler(
  async (req, res, next) => {
    const userId = req.user?._id.toString();
    const { authorId } = req.body;
    if (!userId) throw new AppError("Unauthorized", 401);
    validateObjectId(authorId, "Author ID");
    if (authorId === userId)
      throw new AppError("You cannot subscribe to your own plans", 400);

    const activeSubscription = await UserSubscriptionModel.findOne({
      userId,
      status: "active",
      expiryDate: { $gt: new Date() },
      planId: {
        $in: await SubscriptionPlanModel.find({ author: authorId }).distinct(
          "_id"
        ),
      },
    }).populate({
      path: "planId",
      select:
        "_id author name price status description postIds durationDays type",
      populate: {
        path: "postIds",
        model: "Post",
        select: "title _id isSubscriberOnly category tags excerpt readingTime",
      },
    });

    const isSubscribed = !!activeSubscription;
    const subscriberCount = activeSubscription?.planId?._id
      ? await UserSubscriptionModel.countDocuments({
          planId: activeSubscription.planId._id,
          status: "active",
          expiryDate: { $gt: new Date() },
        })
      : 0;

    res.status(200).json({
      success: true,
      isSubscribed,
      subscriptionInfo: isSubscribed
        ? {
            subscriptionId: activeSubscription._id,
            planId: activeSubscription.planId._id,
            planName: activeSubscription.planId.name,
            planType: activeSubscription.planId.type || "Silver",
            price: activeSubscription.planId.price / 100,
            durationDays: activeSubscription.planId.durationDays,
            description:
              activeSubscription.planId.description ||
              "Unlock exclusive content with this plan.",
            posts:
              activeSubscription.planId.postIds?.map((post) => ({
                id: post._id,
                title: post.title || "Untitled Post",
                isSubscriberOnly: post.isSubscriberOnly || false,
                category: post.category || "General",
                tags: post.tags || [],
                excerpt: post.excerpt || "No excerpt available.",
                readingTime: post.readingTime || 0,
                 postType: (post.isPremium || post.isSubscriberOnly) ? "premium" : "free",
              })) || [],
            subscriberCount,
            paymentId: activeSubscription.paymentId,
            subscribedAt: activeSubscription.createdAt,
            expiresAt: activeSubscription.expiryDate,
          }
        : null,
    });
  }
);

export const getMySubscribedPlans = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id?.toString();
  if (!userId) throw new AppError("Unauthorized", 401);

  const query = {
    userId,
    ...(req.query.includeCancelled !== "true" && {
      status: { $ne: "cancelled" },
    }),
    ...(req.query.includeExpired !== "true" && {
      expiryDate: { $gt: new Date() },
    }),
  };
  const subscriptions = await UserSubscriptionModel.find(query)
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
});

// ✅ controllers/subscriptionController.js

// Checks if the user is eligible to create subscription plans
export const checkEligibilityForSubscription = asyncHandler(
  async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new AppError("Unauthorized", 401);

    const user = await UserModel.findById(userId).lean();
    if (!user) throw new AppError("User not found", 404);

    const followerCount = user.followers?.length || 0;
    const postCount = await PostModel.countDocuments({
      author: userId,
      isPublished: true,
    });

    const isEligible = followerCount >= 10000 && postCount >= 30;

    res.status(200).json({
      success: true,
      isEligible,
      followerCount,
      postCount,
      message: isEligible
        ? "You are eligible to create subscription plans."
        : "You need at least 10,000 followers and 30 published posts to enable subscriptions.",
    });
  }
);
