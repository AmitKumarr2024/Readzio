import NodeCache from "node-cache";
import logger from "./logger.js";
import { schedule } from "node-cron";

// Initialize cache
const cache = new NodeCache({
  stdTTL: 3600,        // default TTL in seconds (1 hour)
  checkperiod: 120,    // check expired keys every 2 mins
  maxKeys: 10000,
  useClones: false,    // avoid deep cloning for performance
});

// Get value from cache
export const get = (key) => {
  try {
    logger.debug("[Cache:Get] Fetching key", { key });
    const value = cache.get(key);
    if (value === undefined) {
      logger.info("[Cache:Get] Cache miss", { key });
      return null;
    }
    logger.debug("[Cache:Get] Cache hit", { key });
    return value;
  } catch (err) {
    logger.error("[Cache:Get] Error", { key, error: err.message });
    return null;
  }
};

// Set value in cache
export const set = (key, value, options = {}) => {
  try {
    const ttl = Number.isFinite(options.ttl) && options.ttl > 0 ? options.ttl : 3600;
    logger.debug("[Cache:Set] Setting key", { key, ttl });
    const success = cache.set(key, value, ttl);
    if (success) {
      logger.info("[Cache:Set] Successfully set", { key });
    } else {
      logger.warn("[Cache:Set] Failed to set", { key });
    }
    return success;
  } catch (err) {
    logger.error("[Cache:Set] Error", { key, error: err.message });
    return false;
  }
};

// Delete cache key
export const del = (key) => {
  try {
    logger.debug("[Cache:Del] Deleting key", { key });
    const deleted = cache.del(key);
    logger.info("[Cache:Del] Deleted", { key, success: deleted > 0 });
    return deleted > 0;
  } catch (err) {
    logger.error("[Cache:Del] Error", { key, error: err.message });
    return false;
  }
};

// Clear entire cache
export const flush = () => {
  try {
    logger.info("[Cache:Flush] Clearing entire cache");
    cache.flushAll();
    return true;
  } catch (err) {
    logger.error("[Cache:Flush] Error", { error: err.message });
    return false;
  }
};

// Get cache stats
export const getStats = () => {
  try {
    const stats = cache.getStats();
    logger.debug("[Cache:Stats]", stats);
    return stats;
  } catch (err) {
    logger.error("[Cache:Stats] Error", { error: err.message });
    return null;
  }
};

// Schedule auto-flush every 6 hours if cache is large
schedule("0 */6 * * *", () => {
  const stats = cache.getStats();
  if (stats.keys > 8000) {
    logger.warn("[Cache:AutoFlush] Cache nearing limit, flushing", { stats });
    cache.flushAll();
  } else {
    logger.debug("[Cache:AutoFlush] Cache stats checked", { stats });
  }
});

// Export main cache object too (for direct .keys(), .has() etc.)
export default cache;
