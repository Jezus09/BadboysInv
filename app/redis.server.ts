/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Redis from "ioredis";

// Redis singleton instance
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  console.log("[Redis] Connecting to Redis...");

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      console.error("[Redis] Connection error:", err.message);
      return true;
    },
  });

  redis.on("connect", () => {
    console.log("[Redis] Connected successfully");
  });

  redis.on("error", (err) => {
    console.error("[Redis] Error:", err);
  });

  return redis;
}

// Helper functions for inventory caching
export async function getCachedInventory(userId: string): Promise<string | null> {
  try {
    const redis = getRedis();
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
