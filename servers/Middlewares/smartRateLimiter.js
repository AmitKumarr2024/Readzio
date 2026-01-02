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

      let record = await RateLimitLog.findOne({ key, route });

      if (!record || record.resetAt < now) {
        record = await RateLimitLog.findOneAndUpdate(
          { key, route },
          {
            key,
            route,
            count: 1,
            resetAt: new Date(now.getTime() + windowMs),
          },
          { upsert: true, new: true }
        );
      } else {
        record.count += 1;
        await record.save();
      }

      const remaining = Math.max(max - record.count, 0);
      const retryAfter = Math.ceil(
        (record.resetAt.getTime() - now.getTime()) / 1000
      );

      // 🔑 Headers for frontend
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
      next(err);
    }
  };
};
