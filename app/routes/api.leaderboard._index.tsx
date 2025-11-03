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

    // Get all player stats with ranks
    const playerStats = await prisma.playerStats.findMany({
      take: limit,
      orderBy: {
        [validSortBy]: 'desc'
      },
      include: {
        rank: true
      }
    });

    // Map to frontend format
    const players = playerStats.map(ps => ({
      steam_id: ps.steamId,
      player_name: ps.playerName,
      rank_name: ps.rank.rankName,
      rank_tag: ps.rank.rankTag,
      rank_color: ps.rank.rankColor,
      experience: ps.experience,
      kills: ps.kills,
      deaths: ps.deaths,
      kd_ratio: ps.kdRatio,
      headshot_percentage: ps.headshotPercentage,
      playtime_hours: 0 // TODO: Add playtime tracking
    }));

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
