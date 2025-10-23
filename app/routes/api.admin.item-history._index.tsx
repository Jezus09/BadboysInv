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

  return Response.json({
    success: true,
    items: items.map(item => ({
      itemUuid: item.itemUuid,
      itemId: item.itemId,
      wear: item.wear,
      seed: item.seed,
      nameTag: item.nameTag,
      stickers: item.stickers ? JSON.parse(item.stickers) : null,
      createdAt: item.createdAt.toISOString(),
      createdBy: item.createdBy,
      source: item.source,
      currentOwner: item.currentOwner,
      deletedAt: item.deletedAt?.toISOString(),
      transferCount: item.transfers.length,
      recentTransfers: item.transfers.map(t => ({
        fromUser: t.fromUser,
        toUser: t.toUser,
        transferType: t.transferType,
        timestamp: t.timestamp.toISOString(),
        metadata: t.metadata ? JSON.parse(t.metadata) : null
      }))
    })),
    totalCount,
    hasMore: offset + limit < totalCount
  });
});

export { loader } from "./api.$";
