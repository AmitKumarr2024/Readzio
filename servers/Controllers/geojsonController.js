import axios from "axios";
import { AppError } from "../../servers/Utils/AppError.js";

const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

export const getIndiaBoundaryOnly = async (req, res, next) => {
  try {
    const response = await axios.get(INDIA_GEOJSON_URL, {
      responseType: "stream",
      timeout: 25000,
      headers: { Accept: "application/json" },
    });

    res.setHeader("Content-Type", "application/json");
    response.data.pipe(res);
  } catch (error) {
    const message =
      error.code === "ECONNABORTED" ? "GeoJSON fetch timed out" : error.message;

    next(
      new AppError(
        message,
        error.response?.status || 502,
        "GetIndiaBoundaryOnly",
        "Failed to fetch India GeoJSON"
      )
    );
  }
};
