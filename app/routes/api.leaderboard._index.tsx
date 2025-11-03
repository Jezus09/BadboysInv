/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { prisma } from "~/db.server";
import { middleware } from "~/http.server";
import type { Route } from "./+types/api.leaderboard._index";

export const ApiLeaderboardUrl = "/api/leaderboard";

/**
 * Get leaderboard data from the database
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  try {
    const url = new URL(request.url);
    const sortBy = url.searchParams.get('sortBy') || 'experience';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Validate sortBy parameter
    const validSortBy = z.enum(['experience', 'kd_ratio', 'kills']).parse(sortBy);

    let orderByClause = 'ps.experience DESC';
    switch (validSortBy) {
      case 'kd_ratio':
        orderByClause = 'ps.kd_ratio DESC';
        break;
      case 'kills':
        orderByClause = 'ps.kills DESC';
        break;
      default:
        orderByClause = 'ps.experience DESC';
    }

    const players = await prisma.$queryRawUnsafe(`
      SELECT
        ps.steam_id,
        ps.player_name,
        r.rank_name,
        r.rank_tag,
        r.rank_color,
        ps.experience,
        ps.kills,
        ps.deaths,
        ps.kd_ratio,
        ps.headshot_percentage,
        ps.playtime_hours
      FROM player_stats ps
      LEFT JOIN ranks r ON ps.experience >= r.min_experience
        AND (r.max_experience IS NULL OR ps.experience <= r.max_experience)
      ORDER BY ${orderByClause}
      LIMIT $1
    `, limit);

    return data({
      success: true,
      players
    });

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return data({
      success: false,
      error: "Failed to fetch leaderboard"
    }, { status: 500 });
  }
});
