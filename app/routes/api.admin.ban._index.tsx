/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { banPlayer, isPlayerAdmin } from "~/models/rank-system.server";
import { methodNotAllowed, unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.ban._index";

/**
 * POST /api/admin/ban
 * Ban a player (admin only)
 */
export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  const adminId = await getRequestUserId(request);
  if (!adminId || !(await isPlayerAdmin(adminId))) {
    throw unauthorized;
  }

  const { steamId, reason, expiresAt } = z
    .object({
      steamId: z.string(),
      reason: z.string(),
      expiresAt: z.string().optional()
    })
    .parse(await request.json());

  const ban = await banPlayer({
    steamId,
    bannedBy: adminId,
    reason,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  });

  return data({
    success: true,
    message: `Banned ${steamId}`,
    ban
  });
});

export { loader } from "./api.$";
