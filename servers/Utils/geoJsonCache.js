import axios from "axios";

const INDIA_GEOJSON_URL = "https://demoapp-f7d71.web.app/india-accurate.json";

let cachedGeoJSON = null;

export async function loadIndiaGeoJSON() {
  if (cachedGeoJSON) return cachedGeoJSON;

  try {
    const response = await axios.get(INDIA_GEOJSON_URL, { timeout: 20000 });
    cachedGeoJSON = response.data;
    return cachedGeoJSON;
  } catch (err) {
    console.error("[GeoJSON Cache Load Error]", err.message);
    return null;
  }
}
