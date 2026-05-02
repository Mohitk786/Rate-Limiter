# token-bucket-limiter

A distributed, Redis-backed token bucket rate limiter for Express. Atomic per-request decisions are made inside Redis via a Lua script, so it stays correct across multiple Node processes and machines.

## Install

```bash
npm install token-bucket-limiter
```

Peer requirements:

- Node.js 18+
- Express 5
- A reachable Redis instance (currently `redis://127.0.0.1:6379`)

## Quick start

```ts
import express from "express";
import { tokenBucketLimiter } from "token-bucket-limiter";

const app = express();

app.post(
  "/login",
  tokenBucketLimiter({ capacity: 10, refillRate: 5 }),
  (req, res) => {
    res.json({ success: true });
  }
);

app.listen(3000);
```

That route now allows bursts of up to 10 requests and sustains 5 requests/second per caller.

## Options

| Option       | Type     | Default | Description                                                                |
| ------------ | -------- | ------- | -------------------------------------------------------------------------- |
| `capacity`   | `number` | `10`    | Maximum tokens the bucket can hold. Controls the largest burst you allow.  |
| `refillRate` | `number` | `5`     | Tokens added per second. Controls the long-term steady-state request rate. |

Rule of thumb:

- **"Maximum spike I'll allow?"** → `capacity`
- **"Maximum steady traffic?"** → `refillRate`

Both values must be `> 0` or the middleware throws on first use.

## How callers are identified

The limiter picks a key from the request, in this order:

1. `x-api-key` header → `tb:api:<value>`
2. `x-user-id` header → `tb:user:<value>`
3. Express `req.ip` fallback → `tb:ip:<ip>`

If you rely on the IP fallback behind a proxy, enable Express's trust proxy setting so `req.ip` reflects the real client:

```ts
app.set("trust proxy", true);
```

## Response behavior

Every response carries:

- `X-RateLimit-Remaining` — floor of remaining tokens in the bucket.

When the bucket is empty, the middleware short-circuits with:

- HTTP `429 Too Many Requests`
- `Retry-After` header (seconds until at least one token is available)
- JSON body: `{ "error": "Too many requests" }`

## How it works

Each key maps to a Redis hash storing `tokens` and `last` (timestamp of last refill). On every request the Lua script:

1. Loads the current state (or seeds a full bucket on first use).
2. Refills `elapsed_ms * (refillRate / 1000)` tokens, capped at `capacity`.
3. If at least one token is available, decrements by one and marks the request `allowed`.
4. Persists `tokens` + `last` and sets a TTL of `2 × (capacity / refillRate)` seconds so idle buckets are eventually evicted.

Because the read-modify-write happens inside a single Lua call, the decision is atomic — no race between concurrent Node workers.

## License

ISC
