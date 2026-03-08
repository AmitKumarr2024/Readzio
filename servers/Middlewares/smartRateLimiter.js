import RateLimitLog from "../Models/RateLimitLog.js";

export const smartRateLimiter = ({
  windowMs,
  max,
  keyGenerator = (req) => req.ip,
}) => {
  return async (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const route = req.baseUrl + req.path;
      const now = new Date();
      const resetAt = new Date(now.getTime() + windowMs);

      // ✅ Single atomic DB call — no race condition
      const record = await RateLimitLog.findOneAndUpdate(
        {
          key,
          route,
          resetAt: { $gt: now }, // only match non-expired records
        },
        {
          $inc: { count: 1 },
          $setOnInsert: { resetAt },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      const remaining = Math.max(max - record.count, 0);
      const retryAfter = Math.ceil(
        (record.resetAt.getTime() - now.getTime()) / 1000,
      );

      res.set({
        "X-RateLimit-Limit": max,
        "X-RateLimit-Remaining": remaining,
        "X-RateLimit-Reset": record.resetAt.getTime(),
        "Retry-After": retryAfter,
      });

      if (record.count > max) {
        return res.status(429).json({
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please wait.",
          retryAfter,
          resetAt: record.resetAt,
        });
      }

      next();
    } catch (err) {
      // ✅ Fail open — rate limiter error se server down nahi hoga
      console.warn("[RateLimiter] Error:", err.message);
      next();
    }
  };
};
