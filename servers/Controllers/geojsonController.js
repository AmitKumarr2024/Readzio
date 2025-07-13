// controllers/geojsonController.js
import path from "path";
import fs from "fs/promises"; // Use promises for async file ops
import { fileURLToPath } from "url";
import { AppError } from "../utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use specific India boundary file instead of world-countries
const INDIA_GEOJSON_PATH = path.join(__dirname, "../data/india-accurate.json");

let cachedIndiaBoundary = null;

export const getIndiaBoundaryOnly = async (req, res, next) => {
  try {
    if (cachedIndiaBoundary) {
      console.log("[GeoJSONController] Serving cached full India GeoJSON");
      return res.status(200).json(cachedIndiaBoundary);
    }

    await fs.access(INDIA_GEOJSON_PATH);
    const geoJsonData = await fs.readFile(INDIA_GEOJSON_PATH, "utf-8");
    const parsedData = JSON.parse(geoJsonData);

    if (!parsedData?.features?.length) {
      throw new AppError(
        "No features in India GeoJSON",
        400,
        "GetIndiaBoundaryOnly"
      );
    }

    // ✅ Serve all features instead of filtering one
    cachedIndiaBoundary = parsedData;

    console.log(
      "[GeoJSONController] Full India GeoJSON loaded with",
      parsedData.features.length,
      "features"
    );
    return res.status(200).json(cachedIndiaBoundary);
  } catch (error) {
    console.error("[GeoJSONController] Error:", error.message);
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetIndiaBoundaryOnly")
    );
  }
};
