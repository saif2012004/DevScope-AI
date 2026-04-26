import rateLimit from "express-rate-limit";

/** 100 requests per 15 minutes per IP (global default). */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

/** 20 requests per minute per IP (for AI-heavy routes). */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
