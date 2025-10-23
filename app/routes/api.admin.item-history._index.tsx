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
import type { Route } from "./+types/api.admin.item-history._index";

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

  const { filterUser, filterSource, limit, offset } = z
    .object({
      filterUser: z.string().optional(),
      filterSource: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0)
    })
    .parse(await request.json());

  // Build where clause
  const where: any = {};
  if (filterUser) {
    where.currentOwner = filterUser;
  }
  if (filterSource) {
    where.source = filterSource;
  }

  // Fetch items with pagination
  const [items, totalCount] = await Promise.all([
    prisma.itemHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        transfers: {
          orderBy: { timestamp: "desc" },
          take: 5 // Only get latest 5 transfers
        }
      }
    }),
    prisma.itemHistory.count({ where })
  ]);

  // Collect all unique user IDs
  const userIds = new Set<string>();
  items.forEach((item) => {
    userIds.add(item.createdBy);
    if (item.currentOwner) userIds.add(item.currentOwner);
    item.transfers.forEach((t) => {
      if (t.fromUser) userIds.add(t.fromUser);
      userIds.add(t.toUser);
    });
  });

  // Fetch user info for all users
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true, avatar: true }
  });

  // Create user map for quick lookup
  const userMap = new Map(users.map((u) => [u.id, u]));

  return Response.json({
    success: true,
    items: items.map((item) => ({
      itemUuid: item.itemUuid,
      itemId: item.itemId,
      wear: item.wear,
      seed: item.seed,
      nameTag: item.nameTag,
      stickers: item.stickers ? JSON.parse(item.stickers) : null,
      createdAt: item.createdAt.toISOString(),
      createdBy: item.createdBy,
      createdByUser: userMap.get(item.createdBy),
      source: item.source,
      currentOwner: item.currentOwner,
      currentOwnerUser: item.currentOwner ? userMap.get(item.currentOwner) : null,
      deletedAt: item.deletedAt?.toISOString(),
      transferCount: item.transfers.length,
      recentTransfers: item.transfers.map((t) => ({
        fromUser: t.fromUser,
        fromUserInfo: t.fromUser ? userMap.get(t.fromUser) : null,
        toUser: t.toUser,
        toUserInfo: userMap.get(t.toUser),
        transferType: t.transferType,
        timestamp: t.timestamp.toISOString(),
        metadata: t.metadata ? JSON.parse(t.metadata) : null
      }))
    })),
    totalCount,
    hasMore: offset + limit < totalCount,
    users: Array.from(userMap.values())
  });
});

export { loader } from "./api.$";
