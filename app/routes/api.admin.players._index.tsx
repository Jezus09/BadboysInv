/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { api } from "~/api.server";
import { prisma } from "~/db.server";
import { middleware } from "~/http.server";
import type { Route } from "./+types/api.admin.players._index";

export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    let whereClause = '';
    if (search) {
      whereClause = `WHERE ps.player_name ILIKE '%${search}%' OR ps.steam_id LIKE '%${search}%'`;
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
        ps.playtime_hours,
        ps.last_seen
      FROM player_stats ps
      LEFT JOIN ranks r ON ps.experience >= r.min_experience
        AND (r.max_experience IS NULL OR ps.experience <= r.max_experience)
      ${whereClause}
      ORDER BY ps.last_seen DESC
      LIMIT 100
    `);

    return data({
      success: true,
      players
    });

  } catch (error) {
    console.error("Error fetching players:", error);
    return data({
      success: false,
      error: "Failed to fetch players"
    }, { status: 500 });
  }
});
