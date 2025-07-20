import axiosInstance from "../utils/axiosInstance.js";
import { AppError } from "../utils/AppError.js";

// Validates Google Ads data for earnings
export const validateGoogleAdsData = async (req, res, next) => {
  try {
    // Validates request body
    const { orderId, paymentId } = req.body;
    if (!orderId || !paymentId) {
      throw new AppError(
        "Missing required fields",
        400,
        "ValidateGoogleAdsData",
        "orderId and paymentId are required"
      );
    }

    // Fetches Google Ads data
    const adsData = await axiosInstance.get("https://api.googleads.com/earnings", {
      params: { orderId, paymentId },
    });

    // Validates response data
    if (!adsData.data) {
      throw new AppError(
        "Invalid Google Ads data",
        400,
        "ValidateGoogleAdsData",
        "No data returned from Google Ads API"
      );
    }

    // Attaches data to request
    req.googleAdsData = adsData.data;
    next();
  } catch (error) {
    // AppError with context for Google Ads validation
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to validate Google Ads data",
            500,
            "ValidateGoogleAdsData",
            "Error in validateGoogleAdsData middleware"
          )
    );
  }
};