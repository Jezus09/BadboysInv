/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { unbanPlayer, isPlayerAdmin } from "~/models/rank-system.server";
import { methodNotAllowed, unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.unban._index";

/**
 * POST /api/admin/unban
 * Unban a player (admin only)
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

  const { steamId } = z
    .object({
      steamId: z.string()
    })
    .parse(await request.json());

  await unbanPlayer(steamId, adminId);

  return data({
    success: true,
    message: `Unbanned ${steamId}`
  });
});

export { loader } from "./api.$";
