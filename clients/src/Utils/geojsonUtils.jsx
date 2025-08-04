import { openDB } from "idb";
import LZString from "lz-string";

const GEOJSON_CACHE_KEY = "india_geojson";
const DB_NAME = "GeoJSONCache";
const STORE_NAME = "geojson";

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
};

export const cacheGeoJson = async (data) => {
  try {
    const compressed = LZString.compressToUTF16(JSON.stringify(data));
    if (compressed.length / 1024 > 5000) {
      console.warn(
        "Compressed GeoJSON too large:",
        compressed.length / 1024,
        "KB"
      );
      return;
    }
    const db = await initDB();
    await db.put(STORE_NAME, compressed, GEOJSON_CACHE_KEY);
  } catch (e) {
    console.warn("Failed to cache GeoJSON:", e);
  }
};

export const getCachedGeoJson = async () => {
  try {
    const db = await initDB();
    const compressed = await db.get(STORE_NAME, GEOJSON_CACHE_KEY);
    if (!compressed) return null;
    const decompressed = LZString.decompressFromUTF16(compressed);
    return JSON.parse(decompressed);
  } catch (e) {
    console.warn("Failed to retrieve cached GeoJSON:", e);
    return null;
  }
};
