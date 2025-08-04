import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../../servers/Utils/Logger.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDb = async () => {
  if (!MONGO_URI) {
    logger.error("[MongoDB] ❌ MONGO_URI not found in environment");
    throw new Error("Missing MONGO_URI in .env");
  }

  if (mongoose.connection.readyState > 0) {
    logger.info("[MongoDB] ✅ Already connected or connecting");
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    logger.info("[MongoDB] ✅ Connected successfully");

    mongoose.connection.on("error", (err) => {
      logger.error("[MongoDB] ❌ Connection error:", err.message);
    });

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("[MongoDB] 🔌 Connection closed on app termination");
      process.exit(0);
    });
  } catch (err) {
    logger.error("[MongoDB] ❌ Failed to connect:", err.message);
    throw err;
  }
};

export default connectDb;
