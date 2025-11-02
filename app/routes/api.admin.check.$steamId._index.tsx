/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { api } from "~/api.server";
import { middleware } from "~/http.server";
import { getAdminInfo } from "~/models/rank-system.server";
import type { Route } from "./+types/api.admin.check.$steamId._index";

/**
 * GET /api/admin/check/:steamid
 * Check if player is admin and get admin info
 */
export const loader = api(async ({ request, params }: Route.LoaderArgs) => {
  await middleware(request);

  const { steamId } = params;
  const adminInfo = await getAdminInfo(steamId);

  return data({
    success: true,
    isAdmin: !!adminInfo,
    admin: adminInfo
  });
});

export { action } from "./api.$";
