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

  return (
    await prisma.user.upsert({
      select: {
        id: true
      },
      create: {
        id: user.steamID,
        inventory: emptyInventory,
        coins: 0,
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

// Add timestamp functions
export async function getUserInventoryLastUpdateTime(
  userId: string
): Promise<bigint> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inventoryLastUpdateTime: true }
  });

  return user?.inventoryLastUpdateTime || BigInt(Math.floor(Date.now() / 1000));
}

export async function updateUserInventoryTimestamp(
  userId: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      inventoryLastUpdateTime: BigInt(Math.floor(Date.now() / 1000))
    }
  });
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
  const inventoryLastUpdateTime = BigInt(Math.floor(Date.now() / 1000));
  return await prisma.user.update({
    select: {
      syncedAt: true
    },
    data: {
      inventory,
      syncedAt,
      inventoryLastUpdateTime
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

/**
 * Notify CS2 plugin about inventory changes via webhook
 */
export async function notifyPluginInventoryChange(steamId: string) {
  const webhookUrl = process.env.CS2_PLUGIN_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("[InventorySync] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    const response = await fetch(
      `${webhookUrl}/api/plugin/refresh-inventory`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          SteamId: steamId  // Plugin expects capital S
        })
      }
    );

    if (response.ok) {
      console.log(`[InventorySync] Successfully notified plugin for SteamId ${steamId}`);
    } else {
      console.error(`[InventorySync] Plugin webhook returned status ${response.status}`);
    }
  } catch (error) {
    console.error("[InventorySync] Failed to notify plugin:", error);
  }
}

/**
 * Notify CS2 plugin about case opening via webhook
 */
export async function notifyCaseOpeningBroadcast(data: {
  playerName: string;
  itemName: string;
  rarity: string;
  statTrak: boolean;
}) {
  const webhookUrl = process.env.CS2_PLUGIN_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(
      "[CaseOpening] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook"
    );
    return;
  }

  try {
    const response = await fetch(`${webhookUrl}/api/plugin/case-opened`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PlayerName: data.playerName,
        ItemName: data.itemName,
        Rarity: data.rarity,
        StatTrak: data.statTrak
      })
    });

    if (response.ok) {
      console.log(
        `[CaseOpening] Successfully notified plugin - ${data.playerName} opened ${data.itemName}`
      );
    } else {
      console.error(
        `[CaseOpening] Plugin webhook returned status ${response.status}`
      );
    }
  } catch (error) {
    console.error("[CaseOpening] Failed to notify plugin:", error);
  }
}
