# 🧠 Rate Limiter Lua Script — Why It Exists

## 📌 Context

This project implements a **rate limiter using Redis**.

The goal is simple:

* Allow a limited number of requests
* Prevent abuse and overload

But the implementation is not trivial.

---

## ⚠️ The Real Problem

At first glance, rate limiting looks easy:

1. Read current tokens from Redis
2. Calculate refill based on time
3. Decrease tokens if request is allowed
4. Save updated tokens

But this breaks in real systems.

---

## 🚨 The Core Issue: Race Conditions

In production, multiple requests can hit the system **at the same time**.

### Example Scenario

Two requests arrive simultaneously:

* Request A reads tokens = 1
* Request B reads tokens = 1

Both think:

> "I can proceed"

Both consume a token.

### Result:

```txt
Expected: only 1 request allowed
Actual:   2 requests allowed ❌
```

👉 The rate limiter fails.

---

## ❌ Why Normal Redis Calls Are Not Enough

If we implement logic like this:

```txt
GET tokens
CALCULATE new tokens
SET tokens
```

These are **separate operations**.

Between them:

* Another request can modify the data
* State becomes inconsistent

👉 This leads to incorrect rate limiting.

---

## 🎯 The Solution: Lua Script in Redis

Instead of handling logic in Node.js, we move it **inside Redis**.

We use a **Lua script**, which Redis can execute.

---

## 🔒 Key Concept: Atomic Execution

> A Lua script in Redis runs **atomically**

This means:

* No other request can interrupt execution
* All steps run as a single unit
* State is always consistent

---

## ⚙️ What the Lua Script Does

In one execution, the script:

1. Reads current state:

   * tokens
   * last refill timestamp

2. Calculates elapsed time

3. Refills tokens based on time passed

4. Checks if request can be allowed:

   * If tokens ≥ 1 → allow
   * Else → block

5. Deducts one token if allowed

6. Updates Redis:

   * new token count
   * updated timestamp

7. Sets TTL (auto cleanup)

8. Returns:

   * allowed (1 or 0)
   * remaining tokens

---

## 🔁 Why This Works

Because everything happens:

* In **one Redis execution**
* Without interruption
* Without multiple network calls

---

## 📊 Before vs After

| Approach             | Result                  |
| -------------------- | ----------------------- |
| Multiple Redis calls | ❌ Race conditions       |
| Lua script           | ✅ Atomic and consistent |

---

## 🧠 Why This Is Critical

Without Lua:

* System breaks under concurrency
* Limits become unreliable
* Users can bypass restrictions

With Lua:

* Accurate rate limiting
* Safe under heavy load
* Production-ready behavior

---

## 🎯 Final Understanding

> The Lua script ensures that all rate limiting logic is executed safely, consistently, and atomically inside Redis.

---

## 🧭 One-line takeaway

> "Lua script = run all rate limiting logic in one safe, uninterrupted step inside Redis"

