/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { getActiveBans, isPlayerAdmin } from "~/models/rank-system.server";
import { unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.bans._index";

/**
 * GET /api/admin/bans
 * Get all active bans (admin only)
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const adminId = await getRequestUserId(request);
  if (!adminId || !(await isPlayerAdmin(adminId))) {
    throw unauthorized;
  }

  const bans = await getActiveBans();

  return data({
    success: true,
    count: bans.length,
    bans
  });
});
