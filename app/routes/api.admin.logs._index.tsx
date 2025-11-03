/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { api } from "~/api.server";
import { prisma } from "~/db.server";
import { middleware } from "~/http.server";
import type { Route } from "./+types/api.admin.logs._index";

export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  try {
    const logs = await prisma.$queryRaw`
      SELECT
        id,
        admin_steam_id,
        admin_name,
        target_steam_id,
        target_name,
        action,
        reason,
        timestamp
      FROM admin_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `;

    return data({
      success: true,
      logs
    });

  } catch (error) {
    console.error("Error fetching admin logs:", error);
    return data({
      success: false,
      error: "Failed to fetch admin logs"
    }, { status: 500 });
  }
});
