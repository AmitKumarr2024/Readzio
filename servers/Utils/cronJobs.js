import cron from "node-cron";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Notification from "../../servers/Models/Notification.js";
import logger from "../../servers/Utils/Logger.js";
import { MONGO_URI } from "../../servers/config/dotenv.js";

// Load environment variables
dotenv.config();

const ensureMongoConnection = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 120000,
        connectTimeoutMS: 120000,
        socketTimeoutMS: 120000,
      });
      logger.info("[Cron:NotificationDeletion] MongoDB connected");
    }
  } catch (error) {
    logger.error("[Cron:NotificationDeletion] MongoDB connection failed", {
      message: error.message,
      stack: error.stack,
    });
    throw error; // Rethrow to handle in cron job
  }
};

cron.schedule(
  "0 0 2 * *",
  async () => {
    try {
      await ensureMongoConnection();

      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info(
        `[Cron:NotificationDeletion] Deleted ${result.deletedCount} notifications`
      );
    } catch (error) {
      logger.error("[Cron:NotificationDeletion] Error", {
        message: error.message,
        stack: error.stack,
      });
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

logger.info("[Cron:Startup] Notification deletion job scheduled");
