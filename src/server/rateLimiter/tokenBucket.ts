import type { Redis } from "ioredis";
import { redis } from "./redisClient.js";

const SCRIPT = `
local key            = KEYS[1]
local capacity       = tonumber(ARGV[1])
local refill_per_ms  = tonumber(ARGV[2])
local now_ms         = tonumber(ARGV[3])
local ttl_ms         = tonumber(ARGV[4])

local data   = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(data[1])
local last   = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  last   = now_ms
end

local elapsed = now_ms - last
if elapsed < 0 then elapsed = 0 end
tokens = math.min(capacity, tokens + elapsed * refill_per_ms)

local allowed = 0
if tokens >= 1 then
  tokens  = tokens - 1
  allowed = 1
end

redis.call('HSET', key, 'tokens', tokens, 'last', now_ms)
redis.call('PEXPIRE', key, ttl_ms)

return { allowed, tostring(tokens) }
`;

interface CustomCommands {
  tokenBucketConsume(
    key: string,
    capacity: number,
    refillPerMs: number,
    nowMs: number,
    ttlMs: number,
  ): Promise<[number, string]>;
}

redis.defineCommand("tokenBucketConsume", { numberOfKeys: 1, lua: SCRIPT });

const client = redis as Redis & CustomCommands;

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
}

export async function consume(
  key: string,
  capacity: number,
  refillPerSec: number,
): Promise<ConsumeResult> {
  const refillPerMs = refillPerSec / 1000;
  const nowMs = Date.now();
  // Drop state once the bucket would be fully refilled twice over — safe to forget.
  const ttlMs = Math.ceil((capacity / refillPerSec) * 2 * 1000);

  const [allowed, remaining] = await client.tokenBucketConsume(
    key,
    capacity,
    refillPerMs,
    nowMs,
    ttlMs,
  );

  return { allowed: allowed === 1, remaining: parseFloat(remaining) };
}
