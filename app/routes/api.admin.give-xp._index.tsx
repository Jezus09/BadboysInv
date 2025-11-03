/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { givePlayerXP, isPlayerAdmin } from "~/models/rank-system.server";
import { methodNotAllowed, unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.give-xp._index";

/**
 * POST /api/admin/give-xp
 * Give XP to player (admin only)
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

  const { steamId, xpAmount } = z
    .object({
      steamId: z.string(),
      xpAmount: z.number().int()
    })
    .parse(await request.json());

  await givePlayerXP(steamId, xpAmount, adminId);

  return data({
    success: true,
    message: `Gave ${xpAmount} XP to ${steamId}`
  });
});

export { loader } from "./api.$";
