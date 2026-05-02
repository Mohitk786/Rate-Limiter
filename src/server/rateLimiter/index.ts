import type { Request, Response, NextFunction } from "express";
import { consume } from "./tokenBucket.js";


// capacity:  Maximum tokens the bucket can hold
// refillRate: Tokens added per second

// "Maximum spike I'll allow?" → capacity
// "Maximum steady traffic?" → refillRate


export function tokenBucketLimiter(options: { capacity: number; refillRate: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `tb:${req.ip}`;
    const { allowed, remaining } = await consume(key, options.capacity, options.refillRate);

    res.setHeader("X-RateLimit-Remaining", Math.floor(remaining).toString());

    if (!allowed) {
      return res.status(429).json({ error: "Too many requests" });
    }

    next();
  };
}
