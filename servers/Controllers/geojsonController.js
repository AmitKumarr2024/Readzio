import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { AppError } from "../../servers/Utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to India-specific GeoJSON file
const INDIA_GEOJSON_PATH = path.join(__dirname, "../data/india-accurate.json");



console.log("INDIA_GEOJSON_PATH", INDIA_GEOJSON_PATH);

let cachedIndiaBoundary = null;

// Serves India boundary GeoJSON data
export const getIndiaBoundaryOnly = async (req, res, next) => {
  try {
    // Returns cached data if available
    if (cachedIndiaBoundary) {
      return res.status(200).json(cachedIndiaBoundary);
    }

    // Verifies file existence
    await fs.access(INDIA_GEOJSON_PATH);
    const geoJsonData = await fs.readFile(INDIA_GEOJSON_PATH, "utf-8");
    const parsedData = JSON.parse(geoJsonData);

    // Validates GeoJSON features
    if (!parsedData?.features?.length)
      throw new AppError(
        "No features in India GeoJSON",
        400,
        "GetIndiaBoundaryOnly",
        "Invalid GeoJSON data"
      );

    cachedIndiaBoundary = parsedData;

    res.status(200).json(cachedIndiaBoundary);
  } catch (error) {
    // AppError with context for fetching GeoJSON
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
