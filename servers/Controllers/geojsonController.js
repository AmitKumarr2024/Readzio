import axios from "axios";
import { AppError } from "../../servers/Utils/AppError.js";

// Hosted on Firebase (public)
const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

// Controller: Serve GeoJSON without memory caching
export const getIndiaBoundaryOnly = async (req, res, next) => {
  try {
    const response = await axios({
      method: "get",
      url: INDIA_GEOJSON_URL,
      responseType: "stream", // ✅ Stream large data
    });

    // Set content type
    res.setHeader("Content-Type", "application/json");

    // Pipe stream directly to response
    response.data.pipe(res);
  } catch (error) {
    console.error("[GeoJSON Fetch Error]", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            502,
            "GetIndiaBoundaryOnly",
            "Failed to stream India GeoJSON"
          )
    );
  }
};
