import type { Request, Response, NextFunction } from "express";
import { consume } from "./tokenBucket.js";
import { DEFAULTS, getKey } from "../lib/index.js";


// capacity:  Maximum tokens the bucket can hold
// refillRate: Tokens added per second

// "Maximum spike I'll allow?" → capacity
// "Maximum steady traffic?" → refillRate
type Options = {
  capacity?: number;
  refillRate?: number;
};


export function tokenBucketLimiter(options: Options) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req);
      const config = normalizeOptions(options);
   

    const { allowed, remaining } = await consume(key, config?.capacity, config?.refillRate);

    res.setHeader("X-RateLimit-Remaining", Math.floor(remaining).toString());

    if (!allowed) {
      const retryAfter = Math.ceil((1 - remaining) / config?.refillRate);
      res.setHeader("Retry-After", retryAfter.toString());
      return res.status(429).json({ error: "Too many requests" });
    }

    next();
  };
}



function normalizeOptions(options: Options) {
  const capacity = options.capacity ?? DEFAULTS.capacity;
  const refillPerSecond = options.refillRate ?? DEFAULTS.refillRate;

  if (capacity <= 0) {
    throw new Error("capacity must be > 0");
  }

  if (refillPerSecond <= 0) {
    throw new Error("refillRate must be > 0");
  }

  return {
    capacity,
    refillRate:refillPerSecond
  };
}