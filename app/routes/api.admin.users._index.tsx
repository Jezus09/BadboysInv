/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from "zod";
import { api } from "~/api.server";
import { requireUser } from "~/auth.server";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import { prisma } from "~/db.server";
import { methodNotAllowed, unauthorized } from "~/responses.server";
import type { Route } from "./+types/api.admin.users._index";

export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  const user = await requireUser(request);

  // Only owner can access admin panel
  const ownerCheck = await isUserOwner(user.id);
  if (!ownerCheck) {
    throw unauthorized;
  }

  const { searchQuery } = z
    .object({
      searchQuery: z.string().optional()
    })
    .parse(await request.json());

  // Build where clause
  const where: any = {};
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { id: { contains: searchQuery } }
    ];
  }

  // Fetch users
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      avatar: true,
      coins: true,
      createdAt: true,
      inventory: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Count items for each user
  const usersWithItemCount = await Promise.all(
    users.map(async (u) => {
      const inventory = JSON.parse(u.inventory);
      const itemCount = Object.keys(inventory.items || {}).length;

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        coins: u.coins.toString(),
        createdAt: u.createdAt.toISOString(),
        itemCount
      };
    })
  );

  return Response.json({
    success: true,
    users: usersWithItemCount
  });
});

export { loader } from "./api.$";
