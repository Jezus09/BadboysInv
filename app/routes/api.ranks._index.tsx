/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { api } from "~/api.server";
import { middleware } from "~/http.server";
import { getAllRanks } from "~/models/rank-system.server";
import type { Route } from "./+types/api.ranks._index";

export const ApiRanksUrl = "/api/ranks";

/**
 * GET /api/ranks
 * Get all ranks with player counts
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const ranks = await getAllRanks();

  return data({
    success: true,
    count: ranks.length,
    ranks
  });
});
