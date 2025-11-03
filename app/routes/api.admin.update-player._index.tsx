/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { prisma } from "~/db.server";
import { middleware } from "~/http.server";
import { methodNotAllowed } from "~/responses.server";
import type { Route } from "./+types/api.admin.update-player._index";

export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  try {
    const body = await request.json();
    const { steam_id, experience } = z.object({
      steam_id: z.string(),
      experience: z.number().int().min(0)
    }).parse(body);

    await prisma.$executeRaw`
      UPDATE player_stats
      SET experience = ${experience}
      WHERE steam_id = ${steam_id}
    `;

    return data({
      success: true,
      message: "Player updated successfully"
    });

  } catch (error) {
    console.error("Error updating player:", error);
    return data({
      success: false,
      error: "Failed to update player"
    }, { status: 500 });
  }
});
