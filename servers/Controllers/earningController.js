import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { AppError } from "../../servers/Utils/AppError.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import PaymentModel from "../Models/PaymentModel.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import axiosInstance from "../Utils/axiosInstance.js";
import UserModel from "../../servers/Models/User.js";

// Checks if today matches the auto-email date
const isAutoEmailDate = () => {
  const today = new Date();
  const autoEmailDate = parseInt(process.env.AUTO_EMAIL_DATE || "1", 10);
  return today.getDate() === autoEmailDate;
};

// Sends email with retry logic
const sendEmailWithRetries = async (mailOption, userId, maxAttempts = 3) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      await transporter.sendMail(mailOption);
      await recordActivity({
        userId,
        action: "EMAIL_SENT",
        message: `Email sent to ${mailOption.to} after ${attempts} attempt(s)`,
      });
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      await recordActivity({
        userId,
        action: "EMAIL_FAILED",
        message: `Email failed for ${mailOption.to} on attempt ${attempts}: ${error.message}`,
      });
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  await recordActivity({
    userId,
    action: "EMAIL_FAILED_ALL_ATTEMPTS",
    message: `All ${attempts} email attempts failed for ${mailOption.to}: ${lastError.message}`,
  });
  // AppError with context for email retry failures
  throw new AppError(
    `Failed to send email after ${attempts} attempts: ${lastError.message}`,
    500,
    "SendEmailWithRetries",
    "Email delivery failed"
  );
};

// Gets total earnings and payment status for a user
export const getUserEarnings = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user?._id;

    // Validates user ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId))
      throw new AppError("Unauthorized or invalid user ID", 401, "GetUserEarnings", "Invalid user ID");

    // Fetches paid payments for user
    const payments = await PaymentModel.find({ userId, status: "paid" });

    // Calculates earnings
    const subscriptionEarnings = payments
      .filter((p) => p.notes?.type === "subscription")
      .reduce((sum, p) => sum + p.amount * 0.8, 0); // 80% to user

    const adsEarnings = payments
      .filter((p) => p.notes?.type === "ads")
      .reduce((sum, p) => sum + p.amount * 0.7, 0); // 70% to user

    const totalEarnings = subscriptionEarnings + adsEarnings;

    // Logs earnings view activity
    await recordActivity({
      userId: userId.toString(),
      action: "VIEWED_EARNINGS",
      message: `User viewed earnings: ₹${totalEarnings / 100} (Subscription: ₹${subscriptionEarnings / 100}, Ads: ₹${adsEarnings / 100})`,
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
    // AppError with context for fetching earnings
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetUserEarnings", "Failed to fetch user earnings")
    );
  }
});

// Admin: Gets all users' earnings
export const getAllUsersEarnings = asyncHandler(async (req, res, next) => {
  try {
    // Validates admin access
    if (!req.user?._id || req.user.role !== "admin")
      throw new AppError("Unauthorized: Admin access required", 403, "GetAllUsersEarnings", "Admin privileges required");

    // Fetches all paid payments
    const payments = await PaymentModel.find({ status: "paid" })
      .populate("userId", "username email")
      .lean();

    const userEarnings = {};
    payments.forEach((p) => {
      // Skips invalid payments
      if (!p.userId || !p.userId._id) return;

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

    // Logs admin earnings view activity
    await recordActivity({
      userId: req.user?._id.toString(),
      action: "VIEWED_ALL_EARNINGS",
      message: "Admin viewed all users' earnings",
    });

    res.status(200).json(Object.values(userEarnings));
  } catch (error) {
    // AppError with context for fetching all earnings
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetAllUsersEarnings", "Failed to fetch all users' earnings")
    );
  }
});

// Admin: Processes bulk payouts
export const processBulkPayouts = asyncHandler(async (req, res, next) => {
  let session;
  try {
    // Validates admin access
    if (!req.user?._id || req.user.role !== "admin")
      throw new AppError("Unauthorized: Admin access required", 403, "ProcessBulkPayouts", "Admin privileges required");

    const { users, sendEmail } = req.body;
    // Validates users array
    if (!users || !Array.isArray(users) || users.length === 0)
      throw new AppError("Invalid or empty users array", 400, "ProcessBulkPayouts", "Invalid users data");

    session = await mongoose.startSession();
    session.startTransaction();

    const payouts = [];
    const emailFailures = [];
    const shouldSendEmail = sendEmail === "true" || isAutoEmailDate();

    for (const userData of users) {
      const { userId, orderId, amount, name, email, contact, bankAccount } = userData;

      // Validates user ID and order ID
      if (!mongoose.Types.ObjectId.isValid(userId))
        throw new AppError(`Invalid userId: ${userId}`, 400, "ProcessBulkPayouts", "Invalid user ID");
      if (!orderId)
        throw new AppError(`Missing orderId for user ${userId}`, 400, "ProcessBulkPayouts", "Missing order ID");

      // Validates amount
      if (!amount || amount <= 0 || amount < 1 || amount > 10000)
        throw new AppError(`Invalid amount for user ${userId}: ${amount}`, 400, "ProcessBulkPayouts", "Invalid amount");

      // Validates bank details
      const payment = await PaymentModel.findOne({
        userId,
        "payoutDetails.payoutMethod": { $exists: true },
      }).session(session);
      if (!payment || !payment.payoutDetails || !payment.fundAccountId)
        throw new AppError(`Bank details not found for user ${userId}`, 400, "ProcessBulkPayouts", "Missing bank details");

      // Validates user email
      const user = await UserModel.findById(userId).select("name email").session(session);
      if (!user?.email)
        throw new AppError(`Email not found for user ${userId}`, 400, "ProcessBulkPayouts", "Missing user email");

      // Creates payout record
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

      // Prepares Razorpay payout
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
        process.env.NODE_ENV === "production" ||
        process.env.RAZORPAYX_ACCOUNT_NO === "your_virtual_account_number" ||
        !process.env.RAZORPAYX_ACCOUNT_NO;

      // Processes payout via Razorpay or mocks in development
      if (!isRazorpayXMocked) {
        if (!process.env.RAZORPAYX_ACCOUNT_NO || process.env.RAZORPAYX_ACCOUNT_NO === "your_virtual_account_number")
          throw new AppError("Invalid RAZORPAYX_ACCOUNT_NO configuration", 500, "ProcessBulkPayouts", "Invalid payment configuration");

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
        payoutResponse = {
          data: { id: `mock_payout_${Date.now()}`, status: "queued" },
        };
      }

      // Sends payout confirmation email if required
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
          await sendEmailWithRetries(mailOption, userId);
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
      }

      // Logs payout creation activity
      await recordActivity({
        userId: req.user?._id.toString(),
        action: "CREATED_PAYOUT",
        message: `Initiated payout of ₹${amount} for user ${userId}`,
        payout: { userId, amount, payoutId: payoutResponse.data.id },
      });
    }

    await session.commitTransaction();
    session.endSession();

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
    // AppError with context for processing bulk payouts
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ProcessBulkPayouts", "Failed to process bulk payouts")
    );
  }
});

// Records a new subscription payment
export const recordSubscriptionPayment = asyncHandler(async (req, res, next) => {
  try {
    const { userId, amount, orderId, paymentId, signature, sendEmail } = req.body;

    // Validates user ID
    if (!mongoose.Types.ObjectId.isValid(userId))
      throw new AppError("Invalid userId", 400, "RecordSubscriptionPayment", "Invalid user ID");

    // Validates amount
    if (!amount || amount <= 0)
      throw new AppError("Invalid amount", 400, "RecordSubscriptionPayment", "Invalid amount");

    // Validates required fields
    if (!orderId || !paymentId || !signature)
      throw new AppError("Missing required fields: orderId, paymentId, or signature", 400, "RecordSubscriptionPayment", "Missing required fields");

    // Validates user authorization
    if (userId !== req.user?._id.toString())
      throw new AppError("Unauthorized: User ID mismatch", 403, "RecordSubscriptionPayment", "User not authorized");

    // Validates user email
    const user = await UserModel.findById(userId).select("name email");
    if (!user?.email)
      throw new AppError("User email not found", 400, "RecordSubscriptionPayment", "Missing user email");

    // Creates payment record
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

    // Sends confirmation email if required
    if (sendEmail === "true" || isAutoEmailDate()) {
      const mailOption = createMailOption({
        to: user.email,
        subject: "Subscription Payment Confirmation",
        name: user.name || "User",
        email: user.email,
        message: `Your subscription payment of ₹${amount} has been successfully recorded.\nOrder ID: ${orderId}\nPayment ID: ${paymentId}\nThank you for your payment!`,
        hasButton: false,
      });

      const emailResult = await sendEmailWithRetries(mailOption, userId);
      await PaymentModel.findByIdAndUpdate(payment._id, {
        emailAttempts: emailResult.attempts,
        emailStatus: emailResult.success ? "sent" : "failed",
        emailLastError: emailResult.success ? null : emailResult.lastError,
      });

      if (!emailResult.success) {
        return res.status(200).json({
          message: "Subscription payment recorded, but email failed to send after 3 attempts",
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
    }

    // Logs payment activity
    await recordActivity({
      userId: req.user?._id.toString(),
      action: "RECORDED_PAYMENT",
      message: `Recorded subscription payment of ₹${amount} for user ${userId}`,
      payment: { orderId, paymentId, amount },
    });

    res.status(201).json({ message: "Subscription payment recorded", payment });
  } catch (error) {
    // AppError with context for recording subscription payment
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "RecordSubscriptionPayment", "Failed to record subscription payment")
    );
  }
});

// Records a new ads payment
export const recordAdsPayment = asyncHandler(async (req, res, next) => {
  try {
    const { userId, amount, orderId, paymentId, signature, sendEmail } = req.body;

    // Validates user ID
    if (!mongoose.Types.ObjectId.isValid(userId))
      throw new AppError("Invalid userId", 400, "RecordAdsPayment", "Invalid user ID");

    // Validates amount
    if (!amount || amount <= 0)
      throw new AppError("Invalid amount", 400, "RecordAdsPayment", "Invalid amount");

    // Validates required fields
    if (!orderId || !paymentId || !signature)
      throw new AppError("Missing required fields: orderId, paymentId, or signature", 400, "RecordAdsPayment", "Missing required fields");

    // Validates user authorization
    if (userId !== req.user?._id.toString())
      throw new AppError("Unauthorized: User ID mismatch", 403, "RecordAdsPayment", "User not authorized");

    // Validates user email
    const user = await UserModel.findById(userId).select("name email");
    if (!user?.email)
      throw new AppError("User email not found", 400, "RecordAdsPayment", "Missing user email");

    // Creates payment record
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

    // Sends confirmation email if required
    if (sendEmail === "true" || isAutoEmailDate()) {
      const mailOption = createMailOption({
        to: user.email,
        subject: "Ads Payment Confirmation",
        name: user.name || "User",
        email: user.email,
        message: `Your ads payment of ₹${amount} has been successfully recorded.\nOrder ID: ${orderId}\nPayment ID: ${paymentId}\nThank you for your payment!`,
        hasButton: false,
      });

      const emailResult = await sendEmailWithRetries(mailOption, userId);
      await PaymentModel.findByIdAndUpdate(payment._id, {
        emailAttempts: emailResult.attempts,
        emailStatus: emailResult.success ? "sent" : "failed",
        emailLastError: emailResult.success ? null : emailResult.lastError,
      });

      if (!emailResult.success) {
        return res.status(200).json({
          message: "Ads payment recorded, but email failed to send after 3 attempts",
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
    }

    // Logs payment activity
    await recordActivity({
      userId: req.user?._id.toString(),
      action: "RECORDED_PAYMENT",
      message: `Recorded ads payment of ₹${amount} for user ${userId}`,
      payment: { orderId, paymentId, amount },
    });

    res.status(201).json({ message: "Ads payment recorded", payment });
  } catch (error) {
    // AppError with context for recording ads payment
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "RecordAdsPayment", "Failed to record ads payment")
    );
  }
});