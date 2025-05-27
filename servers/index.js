import express from "express";
import cors from "cors"; // 👈 Add this
import cookieParser from "cookie-parser";
import { CLIENT_URL, PORT } from "./config/dotenv.js";
import connectDb from "./config/mongodb.js";
import errorHandler from "./Middlewares/errorHandler.js";
import AuthRoutes from "../servers/Routes/authRoutes.js";
import UserRoutes from "../servers/Routes/userRoutes.js";

const app = express();

// ✅ Allow requests from frontend
app.use(
  cors({
    origin: CLIENT_URL, // Replace with your frontend URL
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);

// Error Handler
app.use(errorHandler);

// DB Connection + Server Start
connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started successfully at port: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
