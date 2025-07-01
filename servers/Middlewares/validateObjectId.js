import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";

export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    console.log(`[validateObjectId] Checking ${paramName}:`, id);

    if (!id) {
      console.error(`[validateObjectId] Missing ${paramName}`);
      return next(new AppError(`Missing ${paramName}`, 400, "validateObjectId"));
    }

   if (!mongoose.isValidObjectId(id)) {
  console.error(`[validateObjectId] Invalid ${paramName}:`, id);
  return next(new AppError(`Invalid ${paramName}`, 400, "validateObjectId"));
}

    console.log(`[validateObjectId] Valid ${paramName}:`, id);
    next();
  };
};