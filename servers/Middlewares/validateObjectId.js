import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";

// Validates MongoDB ObjectId in request parameters
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    try {
      const id = req.params[paramName];

      // Validates parameter presence
      if (!id) {
        throw new AppError(
          `Missing ${paramName}`,
          400,
          "ValidateObjectId",
          `${paramName} parameter is required`
        );
      }

      // Validates ObjectId format
      if (!mongoose.isValidObjectId(id)) {
        throw new AppError(
          `Invalid ${paramName}`,
          400,
          "ValidateObjectId",
          `${paramName} must be a valid MongoDB ObjectId`
        );
      }

      next();
    } catch (error) {
      // AppError with context for ObjectId validation
      next(
        error instanceof AppError
          ? error
          : new AppError(
              error.message || "Failed to validate ObjectId",
              400,
              "ValidateObjectId",
              "Error in validateObjectId middleware"
            )
      );
    }
  };
};