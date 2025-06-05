import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { CLIENT_URL, PORT } from "./config/dotenv.js";
import connectDb from "./config/mongodb.js";
import errorHandler from "./Middlewares/errorHandler.js";

// Routes
import AuthRoutes from "./Routes/authRoutes.js";
import UserRoutes from "./Routes/userRoutes.js";
import PostRoutes from "./Routes/postRoutes.js";
import CategoryRoutes from "./Routes/categoryRoutes.js";
import BlockRoutes from "./Routes/blockRoutes.js";
import SubscribeRoutes from "./Routes/subscribeRoutes.js";
import NotificationRoutes from "./Routes/notificationRoutes.js";
import AdminRoutes from "./Routes/adminRoutes.js";
import RazorpayRoutes from "./Routes/paymentRoutes.js";
import SubscriptionRoutes from "./Routes/subscriptionPlan.js";


const app = express();

// ✅ Middleware
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// ✅ API Routes
app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/post", PostRoutes);
app.use("/api/category", CategoryRoutes);
app.use("/api/block", BlockRoutes);
app.use("/api/subscribe", SubscribeRoutes);
app.use("/api/notification", NotificationRoutes);
app.use("/api/payment", RazorpayRoutes);
app.use("/api/subscriptionPlan", SubscriptionRoutes);

// --------------------------------------------
app.use("/api/admin", AdminRoutes);
// ---------------------------------------
// ✅ Error Handler (after all routes)
app.use(errorHandler);

// ✅ Start Server
const startServer = async () => {
  try {
    await connectDb();
 
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
