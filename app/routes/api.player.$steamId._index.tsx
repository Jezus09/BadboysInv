/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { api } from "~/api.server";
import { middleware } from "~/http.server";
import { getPlayerStats } from "~/models/rank-system.server";
import { notFound } from "~/responses.server";
import type { Route } from "./+types/api.player.$steamId._index";

/**
 * GET /api/player/:steamid
 * Get player stats by Steam ID
 */
export const loader = api(async ({ request, params }: Route.LoaderArgs) => {
  await middleware(request);

  const { steamId } = params;

  const stats = await getPlayerStats(steamId);

  if (!stats) {
    throw notFound;
  }

  return data({
    success: true,
    player: stats
  });
});

export { action } from "./api.$";
