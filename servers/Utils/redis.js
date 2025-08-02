import Redis from "ioredis";
import logger from "../../servers/Utils/Logger.js";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisTls =
  process.env.REDIS_TLS === "true" ? { rejectUnauthorized: false } : undefined;

if (!redisHost || !redisPort) {
  logger.error("[Redis:Config] REDIS_HOST or REDIS_PORT missing");
  throw new Error("Redis configuration incomplete");
}

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  tls: redisTls,
  maxRetriesPerRequest: 10,
  retryStrategy: (times) => Math.min(times * 50, 2000), // Exponential backoff
});

redis.on("connect", () => {
  logger.info("[Redis:Connect] Connected to Redis");
});

redis.on("error", (err) => {
  logger.error("[Redis:Error]", {
    message: err.message,
    stack: err.stack,
    host: redisHost,
    port: redisPort,
  });
});

redis.on("reconnecting", (delay) => {
  logger.info("[Redis:Reconnect] Reconnecting", { delay });
});

export default redis;
