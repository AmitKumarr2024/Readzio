import axiosInstance from "../utils/axiosInstance.js";
import { AppError } from "../utils/AppError.js";

export const validateGoogleAdsData = async (req, res, next) => {
  const { orderId, paymentId } = req.body;
  try {
    // Replace with actual Google Ads API call
    const adsData = await axiosInstance.get("https://api.googleads.com/earnings", { params: { orderId, paymentId } });
    req.googleAdsData = adsData.data;
    next();
  } catch (error) {
    console.error('[Server:GoogleAds] Validation failed:', error.message);
    next(new AppError("Invalid Google Ads data", 400));
  }
};