/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Redis from "ioredis";

// Redis singleton instance
let redis: Redis | null = null;
let redisConnectionFailed = false;

export function getRedis(): Redis | null {
  // If connection previously failed, return null immediately to avoid blocking
  if (redisConnectionFailed) {
    return null;
  }

  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;

  // If no REDIS_URL configured, disable Redis caching
  if (!redisUrl) {
    console.log("[Redis] REDIS_URL not configured, caching disabled");
    redisConnectionFailed = true;
    return null;
  }

  console.log("[Redis] Connecting to Redis...");

  redis = new Redis(redisUrl, {
    connectTimeout: 1000, // 1 second connection timeout
    commandTimeout: 500,  // 500ms command timeout
    maxRetriesPerRequest: 1, // Only retry once
    retryStrategy(times) {
      if (times > 2) {
        redisConnectionFailed = true;
        return null; // Stop retrying
      }
      return 100; // Retry after 100ms
    },
    reconnectOnError(err) {
      console.error("[Redis] Connection error:", err.message);
      return false; // Don't auto-reconnect on error
    },
  });

  redis.on("connect", () => {
    console.log("[Redis] Connected successfully");
    redisConnectionFailed = false;
  });

  redis.on("error", (err) => {
    console.error("[Redis] Error:", err.message);
    redisConnectionFailed = true;
  });

  return redis;
}

// Helper functions for inventory caching
export async function getCachedInventory(userId: string): Promise<string | null> {
  try {
    const redis = getRedis();
    if (!redis) {
      return null; // Redis not available, skip cache
    }

    const cached = await redis.get(`inventory:${userId}`);

    if (cached) {
      console.log(`[Redis] Cache HIT for user ${userId}`);
      return cached;
    }

    console.log(`[Redis] Cache MISS for user ${userId}`);
    return null;
  } catch (error) {
    console.error("[Redis] Error getting cached inventory:", error);
    return null; // Fallback to DB on Redis error
  }
}

export async function setCachedInventory(
  userId: string,
  inventory: string,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      return; // Redis not available, skip cache
    }
    await redis.setex(`inventory:${userId}`, ttlSeconds, inventory);
    console.log(`[Redis] Cached inventory for user ${userId} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error("[Redis] Error setting cached inventory:", error);
    // Don't throw - caching is not critical
  }
}

export async function invalidateCachedInventory(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      return; // Redis not available, skip
    }
    await redis.del(`inventory:${userId}`);
    console.log(`[Redis] Invalidated cache for user ${userId}`);
  } catch (error) {
    console.error("[Redis] Error invalidating cached inventory:", error);
  }
}

// Helper for caching expensive queries
export async function cacheQuery<T>(
  key: string,
  ttlSeconds: number,
  queryFn: () => Promise<T>
): Promise<T> {
  try {
    const redis = getRedis();
    if (!redis) {
      return queryFn(); // Redis not available, execute query directly
    }

    const cached = await redis.get(key);

    if (cached) {
      console.log(`[Redis] Cache HIT for ${key}`);
      return JSON.parse(cached);
    }

    console.log(`[Redis] Cache MISS for ${key}, executing query...`);
    const result = await queryFn();

    await redis.setex(key, ttlSeconds, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(`[Redis] Error in cacheQuery for ${key}:`, error);
    // Fallback to direct query on error
    return queryFn();
  }
}
