/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { getAllPlayers, isPlayerAdmin } from "~/models/rank-system.server";
import { unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.rank-players._index";

/**
 * GET /api/admin/rank-players?limit=1000
 * Get all players (admin only)
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const userId = await getRequestUserId(request);
  if (!userId || !(await isPlayerAdmin(userId))) {
    throw unauthorized;
  }

  const url = new URL(request.url);
  const limit = z.coerce.number().min(1).max(5000).default(1000).parse(
    url.searchParams.get("limit") || "1000"
  );

  const players = await getAllPlayers(limit);

  return data({
    success: true,
    count: players.length,
    players
  });
});
