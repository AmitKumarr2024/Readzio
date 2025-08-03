import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../../servers/Utils/Logger.js";

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDb = async (retries = 5, delay = 5000) => {
  if (!MONGO_URI) {
    logger.error("[MongoDB:Config] MONGO_URI is not defined");
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  // Check if already connected or connecting
  if (mongoose.connection.readyState === 1) {
    logger.info("[MongoDB:Connect] Already connected to MongoDB");
    return;
  }
  if (mongoose.connection.readyState === 2) {
    logger.info("[MongoDB:Connect] Connection in progress, waiting...");
    await new Promise((resolve) =>
      mongoose.connection.once("connected", resolve)
    );
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 120000,
        connectTimeoutMS: 120000,
        socketTimeoutMS: 120000,
        maxPoolSize: 8,
        minPoolSize: 2,
      });

      logger.info("[MongoDB:Connect] Connected to MongoDB");

      // Event listeners (only set up once)
      mongoose.connection.on("error", (err) => {
        logger.error("[MongoDB:Event] Connection error", {
          message: err.message,
          stack: err.stack,
        });
      });

      if (process.env.NODE_ENV !== "production") {
        mongoose.connection.on("connected", () => {
          logger.info("[MongoDB:Event] Connection established");
        });
        mongoose.connection.on("disconnected", () => {
          logger.warn("[MongoDB:Event] Connection lost");
        });
      }

      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        logger.info("[MongoDB:Shutdown] Connection closed on app termination");
        process.exit(0);
      });

      return;
    } catch (error) {
      logger.error(`[MongoDB:Connect] Attempt ${attempt} failed`, {
        message: error.message,
        stack: error.stack,
      });

      if (attempt === retries) {
        logger.error("[MongoDB:Connect] Max retries reached, exiting");
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDb;
