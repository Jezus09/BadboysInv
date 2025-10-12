/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Inventory } from "@ianlucas/cs2-lib";
import { prisma } from "~/db.server";
import { badRequest, conflict } from "~/responses.server";
import { parseInventory } from "~/utils/inventory";
import { inventoryMaxItems, inventoryStorageUnitMaxItems } from "./rule.server";

export async function getUserInventory(userId: string) {
  return (
    (await prisma.user.findFirst({ where: { id: userId } }))?.inventory ?? null
  );
}

export async function upsertUser(user: {
  avatar: { medium: string };
  nickname: string;
  steamID: string;
}) {
  const data = {
    avatar: user.avatar.medium,
    name: user.nickname
  };
  
  // Create an empty inventory for new users
  const emptyInventory = new CS2Inventory({
    data: { items: [], version: 1 },
    maxItems: 256, // Default max items
    storageUnitMaxItems: 256
  }).stringify();
  
  // Check if user exists and if their inventory needs initialization
  const existingUser = await prisma.user.findUnique({
    where: { id: user.steamID },
    select: { inventory: true }
  });
  
  if (existingUser && !existingUser.inventory) {
    // User exists but has no inventory - initialize it
    await prisma.user.update({
      where: { id: user.steamID },
      data: {
        inventory: emptyInventory,
        ...data
      }
    });
  }
}

// Add timestamp functions
export async function getUserInventoryLastUpdateTime(userId: string): Promise<bigint> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inventoryLastUpdateTime: true }
  });

  return user?.inventoryLastUpdateTime || BigInt(Math.floor(Date.now() / 1000));
}

export async function updateUserInventoryTimestamp(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { 
      inventoryLastUpdateTime: BigInt(Math.floor(Date.now() / 1000))
    }
  });
}
  
  return (
    await prisma.user.upsert({
      select: {
        id: true
      },
      create: {
        id: user.steamID,
        inventory: emptyInventory, // Initialize with empty inventory
        coins: 0, // Explicit default coins
        ...data
      },
      update: {
        ...data
      },
      where: {
        id: user.steamID
      }
    })
  ).id;
}

export async function findUniqueUser(userId: string) {
  return {
    ...(await prisma.user.findUniqueOrThrow({
      select: {
        avatar: true,
        createdAt: true,
        id: true,
        name: true,
        updatedAt: true,
        coins: true
      },
      where: {
        id: userId
      }
    })),
    inventory: await getUserInventory(userId),
    syncedAt: await getUserSyncedAt(userId)
  };
}

export async function existsUser(userId: string) {
  return (
    (await prisma.user.findFirst({
      select: {
        id: true
      },
      where: { id: userId }
    })) !== null
  );
}

export async function updateUserInventory(userId: string, inventory: string) {
  const syncedAt = new Date();
  return await prisma.user.update({
    select: {
      syncedAt: true
    },
    data: {
      inventory,
      syncedAt
    },
    where: {
      id: userId
    }
  });
}

export async function getUserSyncedAt(userId: string) {
  return (
    await prisma.user.findFirstOrThrow({
      select: { syncedAt: true },
      where: { id: userId }
    })
  ).syncedAt;
}

export async function manipulateUserInventory({
  manipulate,
  rawInventory,
  syncedAt,
  userId
}: {
  manipulate:
    | ((inventory: CS2Inventory) => void)
    | ((inventory: CS2Inventory) => Promise<void>);
  rawInventory: string | null;
  syncedAt?: number;
  userId: string;
}) {
  const inventory = new CS2Inventory({
    data: parseInventory(rawInventory),
    maxItems: await inventoryMaxItems.for(userId).get(),
    storageUnitMaxItems: await inventoryStorageUnitMaxItems.for(userId).get()
  });
  try {
    await manipulate(inventory);
  } catch {
    throw badRequest;
  }
  if (syncedAt !== undefined) {
    const currentSyncedAt = await getUserSyncedAt(userId);
    if (syncedAt !== currentSyncedAt.getTime()) {
      throw conflict;
    }
  }
  return await updateUserInventory(userId, inventory.stringify());
}

export async function getUserBasicData(userId: string) {
  return (
    (await prisma.user.findFirst({
      select: {
        avatar: true,
        name: true
      },
      where: {
        id: userId
      }
    })) || undefined
  );
}
