import axios from "axios";
import { AppError } from "../../servers/Utils/AppError.js";

// Hosted on Firebase (public)
const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

// Controller: Serve GeoJSON without memory caching
export const getIndiaBoundaryOnly = async (req, res, next) => {
  console.log("[GeoJSON Fetch] Start fetching India boundary...");
  console.log("[GeoJSON URL]", INDIA_GEOJSON_URL);

  try {
    const response = await axios({
      method: "get",
      url: INDIA_GEOJSON_URL,
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Node.js)", // mimic browser
        Accept: "application/json",
      },
      timeout: 10000, // optional: timeout in ms
    });

    console.log("[GeoJSON Fetch] Status Code:", response.status);
    console.log("[GeoJSON Fetch] Headers:", response.headers);

    if (response.status !== 200) {
      throw new Error(`Non-200 status code: ${response.status}`);
    }

    res.setHeader("Content-Type", "application/json");

    response.data.on("error", (streamErr) => {
      console.error("[GeoJSON Stream Error]", streamErr.message);
      next(
        new AppError(
          streamErr.message,
          502,
          "GeoJSONStreamError",
          "Error while streaming GeoJSON"
        )
      );
    });

    console.log("[GeoJSON Fetch] Streaming data...");
    response.data.pipe(res);
  } catch (error) {
    console.error("[GeoJSON Fetch Error]", error.message);
    if (error.response) {
      console.error("[Axios Error] Status:", error.response.status);
      console.error("[Axios Error] Data:", error.response.data);
    } else if (error.request) {
      console.error("[Axios Error] No response received");
    }

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
