import Redis from "ioredis";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisTls = process.env.REDIS_TLS === "true" ? { rejectUnauthorized: false } : undefined;

if (!redisHost || !redisPort) {
  console.error("[Redis:Config] REDIS_HOST or REDIS_PORT missing");
  process.exit(1);
}

// ✅ Standard Redis config
const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  tls: redisTls,
  maxRetriesPerRequest: 10,
  reconnectOnError: (err) => {
    console.error("[Redis:Reconnect] Error:", err.message);
    return true; // Always try to reconnect
  },
});

// ✅ Event listeners
redis.on("connect", () => {
  console.log("[Redis:Connect] Connected to Redis", { host: redisHost, port: redisPort });
});

redis.on("error", (err) => {
  console.error("[Redis:Error]", {
    message: err.message,
    stack: err.stack,
    host: redisHost,
    port: redisPort,
  });
});

redis.on("reconnecting", (delay) => {
  console.log("[Redis:Reconnecting] Attempting reconnect in", delay, "ms");
});

// ✅ Export standard Redis instance for Socket.IO pub/sub adapter
export default redis;

// 🔄 OPTIONAL: For Redis Cluster (Uncomment to use)
/*
const cluster = new Redis.Cluster(
  [{ host: redisHost, port: redisPort }],
  {
    redisOptions: {
      password: redisPassword,
      tls: redisTls,
      maxRetriesPerRequest: 10,
    },
  }
);
export default cluster;
*/
