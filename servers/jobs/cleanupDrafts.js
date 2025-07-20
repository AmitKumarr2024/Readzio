import cron from "node-cron";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { AppError } from "../utils/AppError.js";
import PostModel from "../Models/Post.js";

// Loads environment variables
dotenv.config();

// Ensures MongoDB connection if not already established
if (mongoose.connection.readyState === 0) {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((error) => {
      throw new AppError(
        "Failed to connect to MongoDB",
        500,
        "CleanupDrafts",
        `MongoDB connection error: ${error.message}`
      );
    });
}

// Schedules daily cleanup of blog post drafts older than 7 days
cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      // Validates MONGO_URI
      if (!process.env.MONGO_URI) {
        throw new AppError(
          "Missing MongoDB URI",
          500,
          "CleanupDrafts",
          "MONGO_URI environment variable is not defined"
        );
      }

      // Calculates cutoff date (7 days ago)
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Deletes drafts older than cutoff date
      const result = await PostModel.deleteMany({
        isDraft: true,
        createdAt: { $lt: cutoffDate },
      });

      // Logs success (replace with proper logging in production)
      // Note: Consider using a logging library (e.g., Winston) instead
      console.log(
        `Draft cleanup complete: ${result.deletedCount} drafts removed`
      );
    } catch (error) {
      // AppError with context for draft cleanup
      throw error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to clean up drafts",
            500,
            "CleanupDrafts",
            "Error in cron job for draft cleanup"
          );
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);
