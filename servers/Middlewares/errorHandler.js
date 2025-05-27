import { NODE_ENV } from "../config/dotenv.js";

const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error Context:", err.context || "Unknown");
  console.error(err.stack);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(NODE_ENV === "development" && {
      stack: err.stack,
      context: err.context || "Unknown",
    }),
  });
};

export default errorHandler;
