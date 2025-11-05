/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Inventory } from "@ianlucas/cs2-lib";
import { prisma, Prisma } from "~/db.server";
import { badRequest, conflict } from "~/responses.server";
import { parseInventory } from "~/utils/inventory";
import { ensureItemUuids } from "~/utils/inventory-post-process.server";
import { inventoryMaxItems, inventoryStorageUnitMaxItems } from "./rule.server";
import { getCachedInventory, setCachedInventory, invalidateCachedInventory } from "~/redis.server";
import { rarityHexToName } from "~/utils/rarity.server";

export async function getUserInventory(userId: string) {
  // Try cache first
  const cached = await getCachedInventory(userId);
  if (cached) {
    return cached;
  }

  // Cache miss - get from DB
  const inventory = (await prisma.user.findFirst({ where: { id: userId } }))?.inventory ?? null;

  // Cache the result for 5 minutes
  if (inventory) {
    await setCachedInventory(userId, inventory, 300);
  }

  return inventory;
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
        coins: 10,
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

export async function updateUserInventory(
  userId: string,
  inventory: string,
  source: "DROP" | "CASE" | "SHOP" | "TRADE" | "MARKETPLACE" | "CRAFT" | "TRADEUP" = "DROP"
) {
  const syncedAt = new Date();
  const inventoryLastUpdateTime = BigInt(Math.floor(Date.now() / 1000));

  // Add UUIDs to new items before saving
  const inventoryWithUuids = await ensureItemUuids({
    inventoryJson: inventory,
    userId,
    source
  });

  // Invalidate cache before update
  await invalidateCachedInventory(userId);

  return await prisma.user.update({
    select: {
      syncedAt: true
    },
    data: {
      inventory: inventoryWithUuids,
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
  userId,
  source = "DROP"
}: {
  manipulate:
    | ((inventory: CS2Inventory) => void)
    | ((inventory: CS2Inventory) => Promise<void>);
  rawInventory: string | null;
  syncedAt?: number;
  userId: string;
  source?: "DROP" | "CASE" | "SHOP" | "TRADE" | "MARKETPLACE" | "CRAFT" | "TRADEUP";
}) {
  // Use transaction with row-level locking to prevent race conditions and item duplication
  const result = await prisma.$transaction(async (tx) => {
    console.log(`[InventoryLock] Acquiring lock for user ${userId}`);

    // Lock the user row with FOR UPDATE to prevent concurrent modifications
    // This ensures no two operations can modify the same user's inventory simultaneously
    const lockedUser = await tx.$queryRaw<Array<{ inventory: string; syncedAt: Date }>>`
      SELECT inventory, "syncedAt"
      FROM "User"
      WHERE id = ${userId}
      FOR UPDATE
    `;

    if (!lockedUser || lockedUser.length === 0) {
      throw new Error("User not found");
    }

    const currentInventory = lockedUser[0].inventory;
    const currentSyncedAt = lockedUser[0].syncedAt;

    console.log(`[InventoryLock] Lock acquired for user ${userId}`);

    // Check syncedAt if provided (optimistic locking on top of pessimistic)
    if (syncedAt !== undefined) {
      if (syncedAt !== currentSyncedAt.getTime()) {
        console.log(`[InventoryLock] Sync conflict for user ${userId}`);
        throw conflict;
      }
    }

    // Create inventory instance with locked data
    const inventory = new CS2Inventory({
      data: parseInventory(currentInventory),
      maxItems: await inventoryMaxItems.for(userId).get(),
      storageUnitMaxItems: await inventoryStorageUnitMaxItems.for(userId).get()
    });

    // Apply the manipulation
    try {
      await manipulate(inventory);
    } catch (error) {
      console.error(`[InventoryLock] Manipulation failed for user ${userId}:`, error);
      throw badRequest;
    }

    // Update the inventory and timestamp in the same transaction
    const newSyncedAt = new Date();
    const inventoryLastUpdateTime = BigInt(Math.floor(Date.now() / 1000));
    const stringifiedInventory = inventory.stringify();

    // Add UUIDs to new items with the specified source
    const inventoryWithUuids = await ensureItemUuids({
      inventoryJson: stringifiedInventory,
      userId,
      source
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        inventory: inventoryWithUuids,
        syncedAt: newSyncedAt,
        inventoryLastUpdateTime
      }
    });

    console.log(`[InventoryLock] Inventory updated and lock released for user ${userId}`);

    return {
      syncedAt: newSyncedAt,
      inventoryWithUuids // Return the updated inventory to cache it immediately
    };
  }, {
    // Set transaction timeout to 10 seconds
    timeout: 10000,
    // Use serializable isolation level for maximum safety against race conditions
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });

  // Immediately cache the new inventory to prevent race conditions
  // This ensures that any concurrent request gets the fresh data instead of stale cache
  await setCachedInventory(userId, result.inventoryWithUuids, 300);
  console.log(`[InventoryLock] Updated inventory cached for user ${userId}`);

  return {
    syncedAt: result.syncedAt
  };
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
 * Notify CS2 plugin to refresh player inventory
 * This should be called after equip/unequip operations
 */
export async function notifyPluginRefreshInventory(steamId: string) {
  const webhookUrl = process.env.CS2_PLUGIN_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("[RefreshInventory] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    const response = await fetch(`${webhookUrl}/api/plugin/refresh-inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SteamId: steamId
      })
    });

    if (response.ok) {
      console.log(`[RefreshInventory] Successfully notified plugin to refresh inventory for SteamID: ${steamId}`);
    } else {
      console.error(`[RefreshInventory] Plugin webhook returned status ${response.status}`);
    }
  } catch (error) {
    console.error("[RefreshInventory] Failed to notify plugin:", error);
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
    // Convert hex color rarity to human-readable name for plugin
    const rarityName = rarityHexToName(data.rarity);

    const response = await fetch(`${webhookUrl}/api/plugin/case-opened`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PlayerName: data.playerName,
        ItemName: data.itemName,
        Rarity: rarityName,
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

/**
 * Notify CS2 plugin about marketplace listing
 */
export async function notifyPluginMarketplaceListing(data: {
  playerName: string;
  itemName: string;
  rarity: string;
  statTrak: boolean;
  price: number;
}) {
  const webhookUrl = process.env.CS2_PLUGIN_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("[MarketplaceListing] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    // Convert hex color rarity to human-readable name for plugin
    const rarityName = rarityHexToName(data.rarity);

    const response = await fetch(`${webhookUrl}/api/plugin/marketplace-listing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PlayerName: data.playerName,
        ItemName: data.itemName,
        Rarity: rarityName,
        StatTrak: data.statTrak,
        Price: Number(data.price)
      })
    });

    if (response.ok) {
      console.log(`[MarketplaceListing] Successfully notified plugin - ${data.playerName} listed ${data.itemName} for ${data.price}`);
    } else {
      console.error(`[MarketplaceListing] Plugin webhook returned status ${response.status}`);
    }
  } catch (error) {
    console.error("[MarketplaceListing] Failed to notify plugin:", error);
  }
}

/**
 * Notify CS2 plugin about marketplace purchase
 */
export async function notifyPluginMarketplacePurchase(data: {
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  itemName: string;
  rarity: string;
  statTrak: boolean;
  price: number;
}) {
  const webhookUrl = process.env.CS2_PLUGIN_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("[MarketplacePurchase] CS2_PLUGIN_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    // Convert hex color rarity to human-readable name for plugin
    const rarityName = rarityHexToName(data.rarity);

    const response = await fetch(`${webhookUrl}/api/plugin/marketplace-purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        BuyerId: data.buyerId,
        BuyerName: data.buyerName,
        SellerId: data.sellerId,
        SellerName: data.sellerName,
        ItemName: data.itemName,
        Rarity: rarityName,
        StatTrak: data.statTrak,
        Price: Number(data.price)
      })
    });

    if (response.ok) {
      console.log(`[MarketplacePurchase] Successfully notified plugin - ${data.buyerName} purchased ${data.itemName} from ${data.sellerName} for ${data.price}`);
    } else {
      console.error(`[MarketplacePurchase] Plugin webhook returned status ${response.status}`);
    }
  } catch (error) {
    console.error("[MarketplacePurchase] Failed to notify plugin:", error);
  }
}
