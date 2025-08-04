import axiosInstance from "../../servers/Utils/axiosInstance.js";

const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

let cachedGeoJSON = null;

export async function loadIndiaGeoJSON() {
  if (cachedGeoJSON) return cachedGeoJSON;

  try {
    const response = await axiosInstance.get(INDIA_GEOJSON_URL, {
      timeout: 20000,
      headers: { Accept: "application/json" },
    });
    if (!response.data?.type || response.data.type !== "FeatureCollection") {
      throw new Error("Invalid GeoJSON format");
    }
    cachedGeoJSON = response.data;
    return cachedGeoJSON;
  } catch (err) {
    console.error("[GeoJSON Cache Load Error]", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      stack: err.stack,
    });
    return null;
  }
}