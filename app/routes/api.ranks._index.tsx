/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { api } from "~/api.server";
import { prisma } from "~/db.server";
import { middleware } from "~/http.server";
import type { Route } from "./+types/api.ranks._index";

export const ApiRanksUrl = "/api/ranks";

/**
 * Get all ranks from the database
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  try {
    const ranks = await prisma.$queryRaw`
      SELECT
        id as rank_order,
        rank_name,
        rank_tag,
        rank_color,
        min_experience,
        max_experience
      FROM ranks
      ORDER BY id ASC
    `;

    return data({
      success: true,
      ranks
    });

  } catch (error) {
    console.error("Error fetching ranks:", error);
    return data({
      success: false,
      error: "Failed to fetch ranks"
    }, { status: 500 });
  }
});
