import mongoose from "mongoose";
import { MONGO_URI } from "./dotenv.js";

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 120000,
      connectTimeoutMS: 120000,
      socketTimeoutMS: 120000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    // ✅ Only listen to errors
    mongoose.connection.on("error", (err) =>
      console.error("🔴 Mongoose event: error", err)
    );

    // Optional: remove these if you want ZERO logs unless it's an error
    // mongoose.connection.on("connected", () =>
    //   console.log("🟢 Mongoose event: connected")
    // );
    // mongoose.connection.on("disconnected", () =>
    //   console.warn("🟡 Mongoose event: disconnected")
    // );

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      // You may also remove this if not needed
      // console.log("🔌 Mongoose connection closed on app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("🔍 Full error:", error);
    process.exit(1);
  }
};

export default connectDb;
