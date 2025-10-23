/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { api } from "~/api.server";
import { getRedis } from "~/redis.server";
import type { Route } from "./+types/api.test.redis._index";

export const loader = api(async ({ request }: Route.LoaderArgs) => {
  const startTime = Date.now();
  const results: any = {
    redisUrl: process.env.REDIS_URL || "NOT SET",
    timestamp: new Date().toISOString()
  };

  try {
    // Test Redis connection
    const redis = getRedis();

    if (!redis) {
      results.status = "DISABLED";
      results.message = "Redis not configured or connection failed";
    } else {
      // Try to ping Redis
      const pingStart = Date.now();
      await redis.ping();
      const pingTime = Date.now() - pingStart;

      // Try to set/get a test value
      const testKey = "test:health-check";
      const testValue = "OK";

      const setStart = Date.now();
      await redis.set(testKey, testValue, "EX", 10);
      const setTime = Date.now() - setStart;

      const getStart = Date.now();
      const getValue = await redis.get(testKey);
      const getTime = Date.now() - getStart;

      results.status = "CONNECTED";
      results.ping = `${pingTime}ms`;
      results.set = `${setTime}ms`;
      results.get = `${getTime}ms`;
      results.testPassed = getValue === testValue;
    }
  } catch (error: any) {
    results.status = "ERROR";
    results.error = error.message;
  }

  results.totalTime = `${Date.now() - startTime}ms`;

  return Response.json(results, {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
