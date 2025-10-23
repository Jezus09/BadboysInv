/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * UUID-based trade system implementation
 * This will replace the old UID-based trade.server.ts
 */

import { prisma, Prisma } from "~/db.server";
import { transferItem } from "~/utils/inventory-uuid.server";
import { Decimal } from "@prisma/client/runtime/library";

export interface TradeItemWithUuid {
  uuid: string;  // Global UUID
  id: number;
  stickers?: Record<string, any>;
  wear?: number;
  seed?: number;
  nameTag?: string;
}

export async function acceptTradeWithUuid(tradeId: string) {
  console.log("=== ACCEPT TRADE (UUID) START ===");
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
  console.log("Receiver:", trade.receiverUser.name, "ID:", trade.receiverUserId);

  // Parse items from JSON
  const senderItems: TradeItemWithUuid[] = JSON.parse(trade.senderItems);
  const receiverItems: TradeItemWithUuid[] = JSON.parse(trade.receiverItems);

  console.log(
    "Sender items to trade:",
    senderItems.length,
    senderItems.map((i) => `${i.id}(uuid:${i.uuid})`)
  );
  console.log(
    "Receiver items to trade:",
    receiverItems.length,
    receiverItems.map((i) => `${i.id}(uuid:${i.uuid})`)
  );

  try {
    return await prisma.$transaction(async (tx) => {
      console.log("=== ACQUIRING LOCKS FOR BOTH USERS ===");

      // Lock both user rows with FOR UPDATE
      const userIdsToLock = [trade.senderUserId, trade.receiverUserId].sort();

      const lockedUsers = await tx.$queryRaw<Array<{ id: string; inventory: string; coins: any }>>`
        SELECT id, inventory, coins
        FROM "User"
        WHERE id IN (${userIdsToLock[0]}, ${userIdsToLock[1]})
        FOR UPDATE
      `;

      if (!lockedUsers || lockedUsers.length !== 2) {
        throw new Error("Could not lock both users");
      }

      console.log("=== LOCKS ACQUIRED FOR BOTH USERS ===");

      const lockedSender = lockedUsers.find(u => u.id === trade.senderUserId);
      const lockedReceiver = lockedUsers.find(u => u.id === trade.receiverUserId);

      if (!lockedSender || !lockedReceiver) {
        throw new Error("Could not find locked user data");
      }

      // Parse inventories
      const senderInventoryData = JSON.parse(lockedSender.inventory || '{"items":{}}');
      const receiverInventoryData = JSON.parse(lockedReceiver.inventory || '{"items":{}}');

      if (!senderInventoryData?.items || !receiverInventoryData?.items) {
        throw new Error("Could not parse inventories");
      }

      console.log("=== UUID-BASED ITEM TRANSFER ===");
      console.log(
        "Original sender inventory UUIDs:",
        Object.keys(senderInventoryData.items).slice(0, 5), "..."
      );
      console.log(
        "Original receiver inventory UUIDs:",
        Object.keys(receiverInventoryData.items).slice(0, 5), "..."
      );

      // Create new inventory objects
      const newSenderInventory = { ...senderInventoryData };
      const newReceiverInventory = { ...receiverInventoryData };

      // Copy items objects
      newSenderInventory.items = { ...senderInventoryData.items };
      newReceiverInventory.items = { ...receiverInventoryData.items };

      // Validate all items exist
      console.log("=== VALIDATING ITEM EXISTENCE (UUID LOOKUP) ===");

      // Check sender items
      for (const item of senderItems) {
        if (!newSenderInventory.items[item.uuid]) {
          throw new Error(
            `Trade failed: Sender no longer has item UUID=${item.uuid}`
          );
        }
      }

      // Check receiver items
      for (const item of receiverItems) {
        if (!newReceiverInventory.items[item.uuid]) {
          throw new Error(
            `Trade failed: Receiver no longer has item UUID=${item.uuid}`
          );
        }
      }

      console.log("All items validated successfully");

      // Transfer sender items to receiver (KEEP SAME UUID!)
      for (const item of senderItems) {
        console.log(`Transferring sender item UUID ${item.uuid} to receiver`);

        const itemData = newSenderInventory.items[item.uuid];

        // Remove from sender
        delete newSenderInventory.items[item.uuid];

        // Add to receiver with SAME UUID
        newReceiverInventory.items[item.uuid] = {
          ...itemData,
          // Remove equipped status when transferring
          equippedCT: undefined,
          equippedT: undefined
        };
      }

      // Transfer receiver items to sender (KEEP SAME UUID!)
      for (const item of receiverItems) {
        console.log(`Transferring receiver item UUID ${item.uuid} to sender`);

        const itemData = newReceiverInventory.items[item.uuid];

        // Remove from receiver
        delete newReceiverInventory.items[item.uuid];

        // Add to sender with SAME UUID
        newSenderInventory.items[item.uuid] = {
          ...itemData,
          // Remove equipped status when transferring
          equippedCT: undefined,
          equippedT: undefined
        };
      }

      console.log(
        "New sender inventory count:",
        Object.keys(newSenderInventory.items).length
      );
      console.log(
        "New receiver inventory count:",
        Object.keys(newReceiverInventory.items).length
      );

      // Handle coins transfer
      const senderCoins = new Decimal(trade.senderCoins || 0);
      const receiverCoins = new Decimal(trade.receiverCoins || 0);

      console.log(`=== HANDLING COINS TRANSFER ===`);
      console.log(`Sender offers: ${senderCoins} coins`);
      console.log(`Receiver offers: ${receiverCoins} coins`);

      // Validate coin balances
      const senderBalance = new Decimal(lockedSender.coins || 0);
      const receiverBalance = new Decimal(lockedReceiver.coins || 0);

      if (senderCoins.gt(0) && senderBalance.lt(senderCoins)) {
        throw new Error(
          `Trade failed: Sender has insufficient coins. Required: ${senderCoins}, Available: ${senderBalance}`
        );
      }

      if (receiverCoins.gt(0) && receiverBalance.lt(receiverCoins)) {
        throw new Error(
          `Trade failed: Receiver has insufficient coins. Required: ${receiverCoins}, Available: ${receiverBalance}`
        );
      }

      // Calculate new coin balances
      const newSenderCoins = senderBalance.minus(senderCoins).plus(receiverCoins);
      const newReceiverCoins = receiverBalance.minus(receiverCoins).plus(senderCoins);

      console.log(`New sender balance: ${newSenderCoins}`);
      console.log(`New receiver balance: ${newReceiverCoins}`);

      // Update inventories and coins in database
      await tx.user.update({
        where: { id: trade.senderUserId },
        data: {
          inventory: JSON.stringify(newSenderInventory),
          coins: newSenderCoins
        }
      });

      await tx.user.update({
        where: { id: trade.receiverUserId },
        data: {
          inventory: JSON.stringify(newReceiverInventory),
          coins: newReceiverCoins
        }
      });

      // Update trade status
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create currency transaction records
      if (senderCoins.gt(0)) {
        await tx.currencyTransaction.create({
          data: {
            userId: trade.senderUserId,
            amount: senderCoins.neg(),
            type: "trade_out",
            description: `Trade ${tradeId} - coins sent`,
            relatedUserId: trade.receiverUserId
          }
        });

        await tx.currencyTransaction.create({
          data: {
            userId: trade.receiverUserId,
            amount: senderCoins,
            type: "trade_in",
            description: `Trade ${tradeId} - coins received`,
            relatedUserId: trade.senderUserId
          }
        });
      }

      if (receiverCoins.gt(0)) {
        await tx.currencyTransaction.create({
          data: {
            userId: trade.receiverUserId,
            amount: receiverCoins.neg(),
            type: "trade_out",
            description: `Trade ${tradeId} - coins sent`,
            relatedUserId: trade.senderUserId
          }
        });

        await tx.currencyTransaction.create({
          data: {
            userId: trade.senderUserId,
            amount: receiverCoins,
            type: "trade_in",
            description: `Trade ${tradeId} - coins received`,
            relatedUserId: trade.receiverUserId
          }
        });
      }

      console.log("=== TRADE COMPLETED SUCCESSFULLY (LOCKS RELEASED) ===");

      return trade;
    }, {
      timeout: 15000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });

  } catch (error) {
    console.error("=== ACCEPT TRADE ERROR ===");
    console.error("Error accepting trade:", error);
    throw error;
  } finally {
    // Record item transfers in ItemHistory (outside transaction)
    // This runs asynchronously after trade completes
    try {
      console.log("=== RECORDING ITEM TRANSFERS IN HISTORY ===");

      // Record sender items going to receiver
      for (const item of senderItems) {
        await transferItem({
          itemUuid: item.uuid,
          fromUser: trade.senderUserId,
          toUser: trade.receiverUserId,
          transferType: "TRADE",
          tradeId,
          metadata: { tradeDirection: "sender_to_receiver" }
        }).catch(err => {
          console.error(`Failed to record transfer for ${item.uuid}:`, err);
        });
      }

      // Record receiver items going to sender
      for (const item of receiverItems) {
        await transferItem({
          itemUuid: item.uuid,
          fromUser: trade.receiverUserId,
          toUser: trade.senderUserId,
          transferType: "TRADE",
          tradeId,
          metadata: { tradeDirection: "receiver_to_sender" }
        }).catch(err => {
          console.error(`Failed to record transfer for ${item.uuid}:`, err);
        });
      }

      console.log("Item transfer history recorded successfully");
    } catch (error) {
      // Don't fail the trade if history recording fails
      console.error("Warning: Failed to record item transfer history:", error);
    }
  }
}
