/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { getAllAdmins, isPlayerAdmin, addAdmin } from "~/models/rank-system.server";
import { methodNotAllowed, unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.admins._index";

/**
 * GET /api/admin/admins
 * Get all admins (admin only)
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const adminId = await getRequestUserId(request);
  if (!adminId || !(await isPlayerAdmin(adminId))) {
    throw unauthorized;
  }

  const admins = await getAllAdmins();

  return data({
    success: true,
    count: admins.length,
    admins
  });
});

/**
 * POST /api/admin/admins
 * Add new admin (admin only)
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

  const { steamId, adminRole, flags } = z
    .object({
      steamId: z.string(),
      adminRole: z.string(),
      flags: z.string().default("")
    })
    .parse(await request.json());

  const newAdmin = await addAdmin({
    steamId,
    adminRole,
    flags
  });

  return data({
    success: true,
    message: `Added admin ${steamId}`,
    admin: newAdmin
  });
});
