// src/server/routes.ts
import { Router } from "express";
import { tokenBucketLimiter } from "./rateLimiter/index.js";
import { BUCKET_CAPACITY, BUCKET_REFILL_RATE } from "./lib/constants.js";

const router = Router();

router.post("/login",
    tokenBucketLimiter({ capacity: BUCKET_CAPACITY, refillRate: BUCKET_REFILL_RATE }), 
    (req, res) => {
  res.json({ success: true });
});

export default router;