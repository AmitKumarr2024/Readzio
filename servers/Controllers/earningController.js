import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../helpers/activityHelper.js";
import PaymentModel from "../Models/PaymentModel.js";
import { SENDER_EMAIL } from "../config/dotenv.js";
import transporter from "../config/nodeMailer.js";
import createMailOption from "../helpers/emailHelper.js";
import axiosInstance from "../utils/axiosInstance.js";
import UserModel from "../models/User.js";

// Helper function to check if today is the auto-email date
const isAutoEmailDate = () => {
  const today = new Date();
  const autoEmailDate = parseInt(process.env.AUTO_EMAIL_DATE || "1", 10);
  return today.getDate() === autoEmailDate;
};

// Helper function to send email with retries
const sendEmailWithRetries = async (mailOption, maxAttempts = 3) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log("Attempting to send email", {
        to: mailOption.to,
        attempt: attempts,
      });
      await transporter.sendMail(mailOption);
      console.log("Email sent successfully", {
        to: mailOption.to,
        attempt: attempts,
      });
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      console.error("Email sending failed", {
        to: mailOption.to,
        attempt: attempts,
        error: error.message,
        stack: error.stack,
        smtpConfig: {
          host: transporter.options.host,
          port: transporter.options.port,
          secure: transporter.options.secure,
          auth: transporter.options.auth
            ? { user: transporter.options.auth.user }
            : null,
        },
      });
      if (attempts < maxAttempts) {
        console.log("Retrying email send", {
          to: mailOption.to,
          attempt: attempts + 1,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts)); // Exponential backoff: 1s, 2s, 3s
      }
    }
  }

  console.error("All email attempts failed", {
    to: mailOption.to,
    attempts,
    lastError: lastError.message,
  });
  return { success: false, attempts, lastError: lastError.message };
};

// Get total earnings and status for a user
export const getUserEarnings = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user?._id;
    console.log("Fetching user earnings", { userId });
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Unauthorized or invalid user ID", 401);
    }

    const payments = await PaymentModel.find({ userId, status: "paid" });

    const subscriptionEarnings = payments
      .filter((p) => p.notes?.type === "subscription")
      .reduce((sum, p) => sum + p.amount * 0.8, 0); // 80% to user

    const adsEarnings = payments
      .filter((p) => p.notes?.type === "ads")
      .reduce((sum, p) => sum + p.amount * 0.7, 0); // 70% to user

    const totalEarnings = subscriptionEarnings + adsEarnings;

    await recordActivity({
      userId: userId.toString(),
      action: "VIEWED_EARNINGS",
      message: `User viewed earnings: ₹${totalEarnings / 100} (Subscription: ₹${
        subscriptionEarnings / 100
      }, Ads: ₹${adsEarnings / 100})`,
    });
    console.log("User earnings retrieved", {
      userId,
      totalEarnings: totalEarnings / 100,
    });

    res.status(200).json({
      subscriptionEarnings: subscriptionEarnings / 100,
      adsEarnings: adsEarnings / 100,
      totalEarnings: totalEarnings / 100,
      paymentRecords: payments.map((p) => ({
        orderId: p.orderId,
        amount: p.amount / 100,
        type: p.notes?.type,
        status: p.status,
        createdAt: p.createdAt,
        emailStatus: p.emailStatus || "not_sent",
      })),
    });
  } catch (error) {
    console.error("Error fetching user earnings", {
      error: error.message,
      stack: error.stack,
    });
    next(new AppError(error.message, error.statusCode || 500));
  }
});

// Admin: Get all users' earnings
export const getAllUsersEarnings = asyncHandler(async (req, res, next) => {
  try {
    console.log("Fetching all users earnings", { adminId: req.user?._id });
    if (!req.user?._id || req.user.role !== "admin") {
      throw new AppError("Unauthorized: Admin access required", 403);
    }

    const payments = await PaymentModel.find({ status: "paid" })
      .populate("userId", "username email")
      .lean();

    const userEarnings = {};
    payments.forEach((p) => {
      if (!p.userId || !p.userId._id) {
        console.warn("Skipping payment with invalid userId:", p);
        return;
      }
      const userId = p.userId._id.toString();
      if (!userEarnings[userId]) {
        userEarnings[userId] = {
          user: p.userId,
          subscription: 0,
          ads: 0,
          total: 0,
          payments: [],
        };
      }

      const amount = p.amount;
      const type = p.notes?.type;
      const share = type === "subscription" ? amount * 0.8 : amount * 0.7;

      userEarnings[userId].payments.push({
        orderId: p.orderId,
        amount: amount / 100,
        userShare: share / 100,
        appShare: (amount - share) / 100,
        type,
        createdAt: p.createdAt,
        emailStatus: p.emailStatus || "not_sent",
      });

      if (type === "subscription") {
        userEarnings[userId].subscription += share;
      } else if (type === "ads") {
        userEarnings[userId].ads += share;
      }
      userEarnings[userId].total += share;
    });

    await recordActivity({
      userId: req.user?._id.toString(),
      action: "VIEWED_ALL_EARNINGS",
      message: "Admin viewed all users' earnings",
    });
    console.log("All users earnings retrieved", { adminId: req.user._id });

    res.status(200).json(Object.values(userEarnings));
  } catch (error) {
    console.error("Error fetching all users earnings", {
      error: error.message,
      stack: error.stack,
    });
    next(new AppError(error.message, error.statusCode || 500));
  }
});

// Admin: Process bulk payouts
export const processBulkPayouts = asyncHandler(async (req, res, next) => {
  let session;
  try {
    console.log("Processing bulk payouts", {
      adminId: req.user?._id,
      users: req.body.users,
    });
    if (!req.user?._id || req.user.role !== "admin") {
      throw new AppError("Unauthorized: Admin access required", 403);
    }

    const { users, sendEmail } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      throw new AppError("Invalid or empty users array", 400);
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const payouts = [];
    const emailFailures = [];

    const shouldSendEmail = sendEmail === "true" || isAutoEmailDate();

    for (const userData of users) {
      const { userId, orderId, amount, name, email, contact, bankAccount } =
        userData;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError(`Invalid userId: ${userId}`, 400);
      }
      if (!orderId) {
        throw new AppError(`Missing orderId for user ${userId}`, 400);
      }
      if (!amount || amount <= 0 || amount < 1 || amount > 10000) {
        throw new AppError(`Invalid amount for user ${userId}: ${amount}`, 400);
      }

      const payment = await PaymentModel.findOne({
        userId,
        "payoutDetails.payoutMethod": { $exists: true },
      }).session(session);

      if (!payment || !payment.payoutDetails || !payment.fundAccountId) {
        throw new AppError(`Bank details not found for user ${userId}`, 400);
      }

      const user = await UserModel.findById(userId)
        .select("name email")
        .session(session);
      if (!user?.email) {
        throw new AppError(`Email not found for user ${userId}`, 400);
      }

      const payout = new PaymentModel({
        userId,
        orderId,
        amount: amount * 100,
        status: "payout_created",
        notes: { type: "payout" },
        payoutId: `pout_${Date.now()}_${userId}`,
        currency: "INR",
        contactId: payment.contactId,
        fundAccountId: payment.fundAccountId,
        emailAttempts: 0,
        emailStatus: "not_sent",
      });

      await payout.save({ session });
      payouts.push(payout);

      const razorpayPayout = {
        account_number: process.env.RAZORPAYX_ACCOUNT_NO || "mock_account",
        fund_account_id: payment.fundAccountId,
        amount: amount * 100,
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        notes: { reason: "Payout for earnings" },
      };

      let payoutResponse;
      const isRazorpayXMocked =
        process.env.NODE_ENV === "development" ||
        process.env.RAZORPAYX_ACCOUNT_NO === "your_virtual_account_number" ||
        !process.env.RAZORPAYX_ACCOUNT_NO;
      if (!isRazorpayXMocked) {
        if (
          !process.env.RAZORPAYX_ACCOUNT_NO ||
          process.env.RAZORPAYX_ACCOUNT_NO === "your_virtual_account_number"
        ) {
          throw new AppError("Invalid RAZORPAYX_ACCOUNT_NO configuration", 500);
        }
        payoutResponse = await axiosInstance.post("/payouts", razorpayPayout, {
          headers: { "X-Api-Type": "razorpayX" },
        });
        await PaymentModel.findByIdAndUpdate(
          payout._id,
          {
            payoutId: payoutResponse.data.id,
            status: payoutResponse.data.status,
          },
          { session }
        );
      } else {
        console.warn("Mocking RazorpayX payout");
        payoutResponse = {
          data: { id: `mock_payout_${Date.now()}`, status: "queued" },
        };
      }

      if (shouldSendEmail) {
        const mailOption = createMailOption({
          to: user.email,
          subject: "Payout Processed Successfully",
          name: user.name || "User",
          email: user.email,
          message: `We have processed a payout of ₹${amount} to your account. Payout ID: ${payoutResponse.data.id}.`,
          hasButton: false,
        });
        try {
          await sendEmailWithRetries(mailOption, userId, "payout");
          await recordActivity({
            userId: req.user?._id.toString(),
            action: "EMAIL_SENT",
            message: `Payout email sent to ${user.email} for payout ${payoutResponse.data.id}`,
          });
        } catch (error) {
          emailFailures.push({
            userId,
            email: user.email,
            payoutId: payoutResponse.data.id,
            error: error.message,
            attempts: error.attempts || 3,
          });
          await recordActivity({
            userId: req.user?._id.toString(),
            action: "EMAIL_FAILED",
            message: `Failed to send payout email to ${user.email}: ${error.message}`,
          });
        }
      } else {
        console.log("Payout email not sent", {
          reason: `sendEmail not true and not auto-email date (day ${new Date().getDate()})`,
          sendEmail,
        });
      }

      await recordActivity({
        userId: req.user?._id.toString(),
        action: "CREATED_PAYOUT",
        message: `Initiated payout of ₹${amount} for user ${userId}`,
        payout: { userId, amount, payoutId: payoutResponse.data.id },
      });
    }

    await session.commitTransaction();
    session.endSession();
    console.log("Bulk payouts processed", {
      count: payouts.length,
      emailFailures,
    });

    res.status(200).json({
      message: "Payouts created",
      payouts,
      emailFailures: emailFailures.length > 0 ? emailFailures : undefined,
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error("Error processing bulk payouts", {
      error: error.message,
      stack: error.stack,
    });
    next(new AppError(error.message, error.statusCode || 500));
  }
});

// Record new subscription payment
export const recordSubscriptionPayment = asyncHandler(
  async (req, res, next) => {
    try {
      const { userId, amount, orderId, paymentId, signature, sendEmail } =
        req.body;
      console.log("Recording subscription payment", {
        userId,
        orderId,
        amount,
        sendEmail,
      });

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Invalid userId", 400);
      }
      if (!amount || amount <= 0) {
        throw new AppError("Invalid amount", 400);
      }
      if (!orderId || !paymentId || !signature) {
        throw new AppError(
          "Missing required fields: orderId, paymentId, or signature",
          400
        );
      }
      if (userId !== req.user?._id.toString()) {
        throw new AppError("Unauthorized: User ID mismatch", 403);
      }

      const user = await UserModel.findById(userId).select("name email");
      if (!user?.email) {
        throw new AppError("User email not found", 400);
      }

      const payment = new PaymentModel({
        userId,
        orderId,
        paymentId,
        signature,
        amount: amount * 100,
        status: "paid",
        notes: { type: "subscription" },
        emailAttempts: 0,
        emailStatus: "not_sent",
      });

      await payment.save();

      if (sendEmail === "true" || isAutoEmailDate()) {
        const mailOption = createMailOption({
          to: user.email,
          subject: "Subscription Payment Confirmation",
          name: user.name || "User",
          email: user.email,
          message: `Your subscription payment of ₹${amount} has been successfully recorded.\nOrder ID: ${orderId}\nPayment ID: ${paymentId}\nThank you for your payment!`,
          hasButton: false,
        });
        console.log("Preparing to send subscription payment email", {
          mailOption,
          autoEmail: isAutoEmailDate(),
        });

        const emailResult = await sendEmailWithRetries(mailOption);
        await PaymentModel.findByIdAndUpdate(payment._id, {
          emailAttempts: emailResult.attempts,
          emailStatus: emailResult.success ? "sent" : "failed",
          emailLastError: emailResult.success ? null : emailResult.lastError,
        });

        if (!emailResult.success) {
          return res.status(200).json({
            message:
              "Subscription payment recorded, but email failed to send after 3 attempts",
            payment,
            emailError: {
              userId,
              email: user.email,
              paymentId,
              error: emailResult.lastError,
              attempts: emailResult.attempts,
            },
          });
        }
      } else {
        console.log("Subscription payment email not sent", {
          reason: `sendEmail not true and not auto-email date (day ${new Date().getDate()})`,
          sendEmail,
        });
      }

      await recordActivity({
        userId: req.user?._id.toString(),
        action: "RECORDED_PAYMENT",
        message: `Recorded subscription payment of ₹${amount} for user ${userId}`,
        payment: { orderId, paymentId, amount },
      });

      res
        .status(201)
        .json({ message: "Subscription payment recorded", payment });
    } catch (error) {
      console.error("Error recording subscription payment", {
        error: error.message,
        stack: error.stack,
      });
      next(new AppError(error.message, error.statusCode || 500));
    }
  }
);

// Record new ads payment
export const recordAdsPayment = asyncHandler(async (req, res, next) => {
  try {
    const { userId, amount, orderId, paymentId, signature, sendEmail } =
      req.body;
    console.log("Recording ads payment", {
      userId,
      orderId,
      amount,
      sendEmail,
    });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid userId", 400);
    }
    if (!amount || amount <= 0) {
      throw new AppError("Invalid amount", 400);
    }
    if (!orderId || !paymentId || !signature) {
      throw new AppError(
        "Missing required fields: orderId, paymentId, or signature",
        400
      );
    }
    if (userId !== req.user?._id.toString()) {
      throw new AppError("Unauthorized: User ID mismatch", 403);
    }

    const user = await UserModel.findById(userId).select("name email");
    if (!user?.email) {
      throw new AppError("User email not found", 400);
    }

    const payment = new PaymentModel({
      userId,
      orderId,
      paymentId,
      signature,
      amount: amount * 100,
      status: "paid",
      notes: { type: "ads" },
      emailAttempts: 0,
      emailStatus: "not_sent",
    });

    await payment.save();

    if (sendEmail === "true" || isAutoEmailDate()) {
      const mailOption = createMailOption({
        to: user.email,
        subject: "Ads Payment Confirmation",
        name: user.name || "User",
        email: user.email,
        message: `Your ads payment of ₹${amount} has been successfully recorded.\nOrder ID: ${orderId}\nPayment ID: ${paymentId}\nThank you for your payment!`,
        hasButton: false,
      });
      console.log("Preparing to send ads payment email", {
        mailOption,
        autoEmail: isAutoEmailDate(),
      });

      const emailResult = await sendEmailWithRetries(mailOption);
      await PaymentModel.findByIdAndUpdate(payment._id, {
        emailAttempts: emailResult.attempts,
        emailStatus: emailResult.success ? "sent" : "failed",
        emailLastError: emailResult.success ? null : emailResult.lastError,
      });

      if (!emailResult.success) {
        return res.status(200).json({
          message:
            "Ads payment recorded, but email failed to send after 3 attempts",
          payment,
          emailError: {
            userId,
            email: user.email,
            paymentId,
            error: emailResult.lastError,
            attempts: emailResult.attempts,
          },
        });
      }
    } else {
      console.log("Ads payment email not sent", {
        reason: `sendEmail not true and not auto-email date (day ${new Date().getDate()})`,
        sendEmail,
      });
    }

    await recordActivity({
      userId: req.user?._id.toString(),
      action: "RECORDED_PAYMENT",
      message: `Recorded ads payment of ₹${amount} for user ${userId}`,
      payment: { orderId, paymentId, amount },
    });

    res.status(201).json({ message: "Ads payment recorded", payment });
  } catch (error) {
    console.error("Error recording ads payment", {
      error: error.message,
      stack: error.stack,
    });
    next(new AppError(error.message, error.statusCode || 500));
  }
});
