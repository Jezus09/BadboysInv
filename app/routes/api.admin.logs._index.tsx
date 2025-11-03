/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { getAdminLogs, isPlayerAdmin } from "~/models/rank-system.server";
import { unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.logs._index";

/**
 * GET /api/admin/logs?limit=100
 * Get admin action logs (admin only)
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const adminId = await getRequestUserId(request);
  if (!adminId || !(await isPlayerAdmin(adminId))) {
    throw unauthorized;
  }

  const url = new URL(request.url);
  const limit = z.coerce.number().min(1).max(500).default(100).parse(
    url.searchParams.get("limit") || "100"
  );

  const logs = await getAdminLogs(limit);

  return data({
    success: true,
    count: logs.length,
    logs
  });
});
