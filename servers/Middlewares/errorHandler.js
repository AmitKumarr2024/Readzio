import { NODE_ENV } from "../config/dotenv.js";

// Handles errors and sends appropriate response
const errorHandler = (err, req, res, next) => {
  try {
    const statusCode = err.statusCode || 500;
    const response = {
      success: false,
      message: err.message || "Internal Server Error",
      ...(NODE_ENV === "development" && {
        stack: err.stack,
        context: err.context || "Unknown",
      }),
    };

    res.status(statusCode).json(response);
  } catch (error) {
    // Fallback for unexpected errors in error handler
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      ...(NODE_ENV === "development" && {
        stack: error.stack,
        context: "ErrorHandler",
      }),
    });
  }
};

export default errorHandler;