/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { middleware } from "~/http.server";
import { getLeaderboard } from "~/models/rank-system.server";
import type { Route } from "./+types/api.leaderboard._index";

export const ApiLeaderboardUrl = "/api/leaderboard";

/**
 * GET /api/leaderboard?type=rank&limit=100
 * Get leaderboard by type (rank, kills, kd)
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const url = new URL(request.url);
  const params = z
    .object({
      type: z.enum(["rank", "kills", "kd"]).default("rank"),
      limit: z.coerce.number().min(1).max(500).default(100)
    })
    .parse({
      type: url.searchParams.get("type") || "rank",
      limit: url.searchParams.get("limit") || "100"
    });

  const leaderboard = await getLeaderboard(params.type, params.limit);

  return data({
    success: true,
    type: params.type,
    limit: params.limit,
    count: leaderboard.length,
    leaderboard
  });
});
