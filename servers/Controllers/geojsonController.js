import axios from "axios";
import { AppError } from "../../servers/Utils/AppError.js";

const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

// ✅ Memory cache variables
let cachedGeoJson = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// ✅ Controller
export const getIndiaBoundaryOnly = async (req, res, next) => {
  try {
    const now = Date.now();

    // If cache is fresh, use it
    if (cachedGeoJson && now - lastFetchTime < CACHE_DURATION) {
      return res.status(200).json(cachedGeoJson);
    }

    // Fetch fresh GeoJSON from Firebase
    const { data } = await axios.get(INDIA_GEOJSON_URL);

    // Cache it
    cachedGeoJson = data;
    lastFetchTime = now;

    res.status(200).json(data);
  } catch (error) {
    console.error("[IndiaBoundaryOnly] Fetch Error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            502,
            "IndiaBoundaryFetch",
            "Failed to fetch or cache India GeoJSON"
          )
    );
  }
};
