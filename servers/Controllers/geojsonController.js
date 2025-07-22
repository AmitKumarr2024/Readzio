import axios from "axios";
import { AppError } from "../../servers/Utils/AppError.js";

// ✅ Replace with your actual hosted Firebase URL
const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

let cachedIndiaBoundary = null;

// Serves India boundary GeoJSON data
export const getIndiaBoundaryOnly = async (req, res, next) => {
  try {
    // Return cached if already fetched
    if (cachedIndiaBoundary) {
      return res.status(200).json(cachedIndiaBoundary);
    }

    // Fetch from Firebase Hosting
    const response = await axios.get(INDIA_GEOJSON_URL);
    const data = response.data;

    // Validate GeoJSON format
    if (!data?.features?.length) {
      throw new AppError(
        "No features in India GeoJSON",
        400,
        "GetIndiaBoundaryOnly",
        "Invalid GeoJSON data"
      );
    }

    // Cache the response
    cachedIndiaBoundary = data;
    res.status(200).json(cachedIndiaBoundary);
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "GetIndiaBoundaryOnly",
            "Failed to fetch India GeoJSON"
          )
    );
  }
};
