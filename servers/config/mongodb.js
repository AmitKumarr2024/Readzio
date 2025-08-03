import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../../servers/Utils/Logger.js";

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
let listenersBound = false;

const connectDb = async (retries = 3, delay = 2000) => {
  if (!MONGO_URI) {
    logger.error("[MongoDB:Config] ❌ MONGO_URI is not defined");
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  const state = mongoose.connection.readyState;

  if (state === 1) {
    logger.info("[MongoDB:Connect] ✅ Already connected to MongoDB");
    return;
  }

  if (state === 2) {
    logger.info("[MongoDB:Connect] ⏳ Connection in progress...");
    await new Promise((resolve) =>
      mongoose.connection.once("connected", resolve)
    );
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Close any stale connections before retrying
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        logger.info("[MongoDB:Connect] 🔌 Closed stale connection");
      }

      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
        minPoolSize: 1,
        maxIdleTimeMS: 10000,
        keepAlive: true,
        keepAliveInitialDelay: 300000,
      });

      logger.info("[MongoDB:Connect] ✅ Connected to MongoDB");

      if (!listenersBound) {
        mongoose.connection.on("error", (err) => {
          logger.error("[MongoDB:Event] ❌ Connection error", {
            message: err.message,
            stack: err.stack,
          });
        });

        if (process.env.NODE_ENV !== "production") {
          mongoose.connection.on("connected", () => {
            logger.info("[MongoDB:Event] 🔌 Connection established");
          });

          mongoose.connection.on("disconnected", () => {
            logger.warn("[MongoDB:Event] ⚠️ Connection lost");
          });
        }

        process.on("SIGINT", async () => {
          await mongoose.connection.close();
          logger.info("[MongoDB:Shutdown] 💡 Connection closed on SIGINT");
          process.exit(0);
        });

        process.on("SIGTERM", async () => {
          await mongoose.connection.close();
          logger.info("[MongoDB:Shutdown] 💡 Connection closed on SIGTERM");
          process.exit(0);
        });

        listenersBound = true;
      }

      return;
    } catch (error) {
      logger.error(`[MongoDB:Connect] ❌ Attempt ${attempt} failed`, {
        message: error.message,
        stack: error.stack,
      });

      if (attempt === retries) {
        logger.error("[MongoDB:Connect] ❌ Max retries reached, exiting");
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDb;
