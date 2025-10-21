/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2BaseInventoryItem } from "@ianlucas/cs2-lib";
import { prisma } from "~/db.server";
import { parseInventory } from "~/utils/inventory";
import { manipulateUserInventory } from "./user.server";
import { ApiActionSyncUrl, SyncAction } from "~/data/sync";
import { getUserCoins, addCoins, subtractCoins } from "./currency.server";
import { Decimal } from "@prisma/client/runtime/library";

export interface TradeItem {
  uid: number;
  id: number;
  stickers?: Record<string, any>;
  wear?: number;
  seed?: number;
  nameTag?: string;
}

export async function createTrade({
  senderUserId,
  receiverUserId,
  senderItems,
  receiverItems = [],
  senderCoins = 0,
  receiverCoins = 0,
  message
}: {
  senderUserId: string;
  receiverUserId: string;
  senderItems: TradeItem[];
  receiverItems?: TradeItem[];
  senderCoins?: number;
  receiverCoins?: number;
  message?: string;
}) {
  // Trade expires in 24 hours
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return await prisma.trade.create({
    data: {
      senderUserId,
      receiverUserId,
      senderItems: JSON.stringify(senderItems),
      receiverItems: JSON.stringify(receiverItems),
      senderCoins,
      receiverCoins,
      message,
      expiresAt,
      status: "PENDING"
    },
    include: {
      senderUser: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      },
      receiverUser: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });
}

export async function getTrade(tradeId: string) {
  return await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      senderUser: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      },
      receiverUser: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });
}

export async function getUserTrades(userId: string) {
  return await prisma.trade.findMany({
    where: {
      OR: [{ senderUserId: userId }, { receiverUserId: userId }],
      status: {
        in: ["PENDING", "ACCEPTED"]
      }
    },
    include: {
      senderUser: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      },
      receiverUser: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function updateTradeStatus(
  tradeId: string,
  status: "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED" | "EXPIRED"
) {
  return await prisma.trade.update({
    where: { id: tradeId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
      updatedAt: new Date()
    }
  });
}

export async function searchUsers(query: string, currentUserId: string) {
  return await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { id: { contains: query } }
          ]
        }
      ]
    },
    select: {
      id: true,
      name: true,
      avatar: true
    },
    take: 10
  });
}

export async function acceptTrade(tradeId: string) {
  console.log("=== ACCEPT TRADE START - NEW MANUAL APPROACH ===");
  console.log("Trade ID:", tradeId);

  // Get the trade details
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      senderUser: true,
      receiverUser: true
    }
  });

  if (!trade) {
    throw new Error("Trade not found");
  }

  if (trade.status !== "PENDING") {
    throw new Error("Trade is not pending");
  }

  console.log("Sender:", trade.senderUser.name, "ID:", trade.senderUserId);
  console.log(
    "Receiver:",
    trade.receiverUser.name,
    "ID:",
    trade.receiverUserId
  );

  // Parse items from JSON
  const senderItems: TradeItem[] = JSON.parse(trade.senderItems);
  const receiverItems: TradeItem[] = JSON.parse(trade.receiverItems);

  console.log(
    "Sender items to trade:",
    senderItems.length,
    senderItems.map((i) => `${i.id}(uid:${i.uid})`)
  );
  console.log(
    "Receiver items to trade:",
    receiverItems.length,
    receiverItems.map((i) => `${i.id}(uid:${i.uid})`)
  );

  try {
    // Manual JSON manipulation approach
    console.log("=== MANUAL INVENTORY MANIPULATION ===");

    // Parse both inventories
    const senderInventoryData = parseInventory(trade.senderUser.inventory);
    const receiverInventoryData = parseInventory(trade.receiverUser.inventory);

    if (!senderInventoryData?.items || !receiverInventoryData?.items) {
      throw new Error("Could not parse inventories");
    }

    console.log(
      "Original sender inventory UIDs:",
      Object.keys(senderInventoryData.items)
    );
    console.log(
      "Original receiver inventory UIDs:",
      Object.keys(receiverInventoryData.items)
    );

    // Create new inventory objects
    const newSenderInventory = { ...senderInventoryData };
    const newReceiverInventory = { ...receiverInventoryData };

    // Copy items objects
    newSenderInventory.items = { ...senderInventoryData.items };
    newReceiverInventory.items = { ...receiverInventoryData.items };

    // First validate that all items exist before proceeding with the trade
    console.log("=== VALIDATING ITEM EXISTENCE ===");

    // Check sender items exist
    for (const item of senderItems) {
      let found = false;
      for (const [uid, invItem] of Object.entries(newSenderInventory.items)) {
        const match =
          invItem.id === item.id &&
          Math.abs((invItem.wear || 0) - (item.wear || 0)) < 0.0001 &&
          (invItem.nameTag || "") === (item.nameTag || "");
        if (match) {
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(
          `Trade failed: Sender no longer has item ID=${item.id} (wear=${item.wear}, nameTag=${item.nameTag})`
        );
      }
    }

    // Check receiver items exist
    for (const item of receiverItems) {
      let found = false;
      for (const [uid, invItem] of Object.entries(newReceiverInventory.items)) {
        const match =
          invItem.id === item.id &&
          Math.abs((invItem.wear || 0) - (item.wear || 0)) < 0.0001 &&
          (invItem.nameTag || "") === (item.nameTag || "");
        if (match) {
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(
          `Trade failed: Receiver no longer has item ID=${item.id} (wear=${item.wear}, nameTag=${item.nameTag})`
        );
      }
    }

    console.log("All items validated successfully - proceeding with trade");

    // Remove sender items from sender inventory (by item properties, not UID)
    for (const item of senderItems) {
      console.log(
        `Looking for sender item to remove: ID=${item.id}, wear=${item.wear}, nameTag=${item.nameTag}`
      );
      let found = false;

      // Find item by properties instead of UID
      for (const [uid, invItem] of Object.entries(newSenderInventory.items)) {
        const match =
          invItem.id === item.id &&
          Math.abs((invItem.wear || 0) - (item.wear || 0)) < 0.0001 &&
          (invItem.nameTag || "") === (item.nameTag || "");

        if (match) {
          console.log(`Found matching sender item at UID ${uid}, removing it`);
          delete newSenderInventory.items[uid];
          found = true;
          break;
        }
      }

      if (!found) {
        // This should never happen now since we validated above
        throw new Error(
          `CRITICAL ERROR: Could not find sender item ID=${item.id} after validation`
        );
      }
    }

    // Remove receiver items from receiver inventory (by item properties, not UID)
    for (const item of receiverItems) {
      console.log(
        `Looking for receiver item to remove: ID=${item.id}, wear=${item.wear}, nameTag=${item.nameTag}`
      );
      let found = false;

      // Find item by properties instead of UID
      for (const [uid, invItem] of Object.entries(newReceiverInventory.items)) {
        const match =
          invItem.id === item.id &&
          Math.abs((invItem.wear || 0) - (item.wear || 0)) < 0.0001 &&
          (invItem.nameTag || "") === (item.nameTag || "");

        if (match) {
          console.log(
            `Found matching receiver item at UID ${uid}, removing it`
          );
          delete newReceiverInventory.items[uid];
          found = true;
          break;
        }
      }

      if (!found) {
        // This should never happen now since we validated above
        throw new Error(
          `CRITICAL ERROR: Could not find receiver item ID=${item.id} after validation`
        );
      }
    }

    // Find next available UIDs
    const getNextUID = (inventory: any) => {
      const existingUIDs = Object.keys(inventory.items)
        .map((k) => parseInt(k))
        .filter((n) => !isNaN(n));
      let nextUID = Math.max(0, ...existingUIDs) + 1;
      while (inventory.items[nextUID]) {
        nextUID++;
      }
      return nextUID;
    };

    // Add receiver items to sender inventory with new UIDs
    for (const item of receiverItems) {
      const newUID = getNextUID(newSenderInventory);
      const { uid, equippedCT, equippedT, ...itemWithoutUidAndEquipped } = item as any;
      newSenderInventory.items[newUID] = itemWithoutUidAndEquipped;
      console.log(`Added item ${item.id} to sender with new UID ${newUID} (unequipped)`);
    }

    // Add sender items to receiver inventory with new UIDs
    for (const item of senderItems) {
      const newUID = getNextUID(newReceiverInventory);
      const { uid, equippedCT, equippedT, ...itemWithoutUidAndEquipped } = item as any;
      newReceiverInventory.items[newUID] = itemWithoutUidAndEquipped;
      console.log(`Added item ${item.id} to receiver with new UID ${newUID} (unequipped)`);
    }

    console.log(
      "New sender inventory UIDs:",
      Object.keys(newSenderInventory.items)
    );
    console.log(
      "New receiver inventory UIDs:",
      Object.keys(newReceiverInventory.items)
    );

    // Handle coins transfer if any
    const senderCoins = new Decimal(trade.senderCoins || 0);
    const receiverCoins = new Decimal(trade.receiverCoins || 0);

    console.log(`=== HANDLING COINS TRANSFER ===`);
    console.log(`Sender offers: ${senderCoins} coins`);
    console.log(`Receiver offers: ${receiverCoins} coins`);

    // Validate coin balances before proceeding
    if (senderCoins.gt(0)) {
      const senderBalance = await getUserCoins(trade.senderUserId);
      if (senderBalance.lt(senderCoins)) {
        throw new Error(
          `Trade failed: Sender has insufficient coins. Required: ${senderCoins}, Available: ${senderBalance}`
        );
      }
    }

    if (receiverCoins.gt(0)) {
      const receiverBalance = await getUserCoins(trade.receiverUserId);
      if (receiverBalance.lt(receiverCoins)) {
        throw new Error(
          `Trade failed: Receiver has insufficient coins. Required: ${receiverCoins}, Available: ${receiverBalance}`
        );
      }
    }

    // Transfer coins if any
    if (senderCoins.gt(0)) {
      console.log(`Transferring ${senderCoins} coins from sender to receiver`);
      const subtractResult = await subtractCoins(
        trade.senderUserId,
        senderCoins,
        "trade_out",
        `Trade ${tradeId} - coins sent`
      );
      if (!subtractResult.success) {
        throw new Error(`Coin transfer failed: ${subtractResult.error}`);
      }
      await addCoins(
        trade.receiverUserId,
        senderCoins,
        "trade_in",
        `Trade ${tradeId} - coins received`
      );
    }

    if (receiverCoins.gt(0)) {
      console.log(
        `Transferring ${receiverCoins} coins from receiver to sender`
      );
      const subtractResult = await subtractCoins(
        trade.receiverUserId,
        receiverCoins,
        "trade_out",
        `Trade ${tradeId} - coins sent`
      );
      if (!subtractResult.success) {
        throw new Error(`Coin transfer failed: ${subtractResult.error}`);
      }
      await addCoins(
        trade.senderUserId,
        receiverCoins,
        "trade_in",
        `Trade ${tradeId} - coins received`
      );
    }

    console.log("Coin transfers completed successfully");

    // Update inventories in database
    const promises = [
      prisma.user.update({
        where: { id: trade.senderUserId },
        data: { inventory: JSON.stringify(newSenderInventory) }
      }),
      prisma.user.update({
        where: { id: trade.receiverUserId },
        data: { inventory: JSON.stringify(newReceiverInventory) }
      }),
      updateTradeStatus(tradeId, "COMPLETED")
    ];

    await Promise.all(promises);

    console.log("=== TRIGGERING INVENTORY SYNC FOR BOTH USERS ===");

    // Trigger sync for both users to refresh their inventory in the frontend
    try {
      await Promise.all([
        // Sync sender inventory
        manipulateUserInventory({
          rawInventory: JSON.stringify(newSenderInventory),
          userId: trade.senderUserId,
          async manipulate(inventory) {
            // Just sync, no changes needed - the inventory was already updated in DB
            console.log(`Synced sender inventory - ${inventory.size()} items`);
          }
        }),
        // Sync receiver inventory
        manipulateUserInventory({
          rawInventory: JSON.stringify(newReceiverInventory),
          userId: trade.receiverUserId,
          async manipulate(inventory) {
            // Just sync, no changes needed - the inventory was already updated in DB
            console.log(
              `Synced receiver inventory - ${inventory.size()} items`
            );
          }
        })
      ]);
      console.log("Both inventories synced successfully");
    } catch (syncError) {
      console.error("Error syncing inventories:", syncError);
      // Don't fail the trade if sync fails
    }

    console.log("=== TRADE COMPLETED SUCCESSFULLY ===");
    return true;
  } catch (error) {
    console.error("=== ACCEPT TRADE ERROR ===");
    console.error("Error accepting trade:", error);
    throw error;
  }
}

export async function getTradeHistory(
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;

  const [trades, totalCount] = await Promise.all([
    prisma.trade.findMany({
      where: {
        OR: [{ senderUserId: userId }, { receiverUserId: userId }]
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        receiverUser: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit
    }),
    prisma.trade.count({
      where: {
        OR: [{ senderUserId: userId }, { receiverUserId: userId }]
      }
    })
  ]);

  return { trades, totalCount };
}
