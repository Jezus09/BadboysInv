/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from "zod";
import { api } from "~/api.server";
import { requireUser } from "~/auth.server";
import { middleware } from "~/http.server";
import { findUniqueUser, manipulateUserInventory } from "~/models/user.server";
import { badRequest, methodNotAllowed } from "~/responses.server";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { isUserOwner } from "~/models/rule";
import { recordItemTransfer, markItemDeleted } from "~/models/item-tracking.server";
import type { Route } from "./+types/api.trade-up._index";

const RARITY_ORDER = [
  "consumer grade",
  "industrial grade",
  "mil-spec",
  "mil-spec grade",
  "restricted",
  "classified",
  "covert",
  "contraband"
];

function getRarityIndex(rarity: string): number {
  const index = RARITY_ORDER.indexOf(rarity.toLowerCase());
  return index === -1 ? 0 : index;
}

function getNextRarity(rarity: string): string | null {
  const currentIndex = getRarityIndex(rarity);
  if (currentIndex >= RARITY_ORDER.length - 1) {
    return null;
  }
  return RARITY_ORDER[currentIndex + 1];
}

export const action = api(async ({ request }: Route.ActionArgs) => {
  console.log("[TradeUp API] Request received");

  await middleware(request);
  console.log("[TradeUp API] Middleware passed");

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  const user = await requireUser(request);
  console.log("[TradeUp API] User authenticated:", user.id);

  // Only owner can use Trade Up (it's in development)
  const ownerCheck = await isUserOwner(user.id);
  if (!ownerCheck) {
    console.log("[TradeUp API] Access denied: User is not owner");
    return {
      success: false,
      error: "Trade Up jelenleg fejlesztés alatt áll"
    };
  }

  const formData = await request.formData();
  console.log("[TradeUp API] FormData received");

  const { items } = z
    .object({
      items: z.string()
    })
    .parse({
      items: formData.get("items")
    });

  const itemProperties = JSON.parse(items) as Array<{
    id: number;
    uuid?: string;
    wear?: number;
    seed?: number;
    stickers?: any;
    nameTag?: string;
  }>;

  console.log("[TradeUp API] Parsed items:", itemProperties.length);

  if (itemProperties.length !== 10) {
    console.log("[TradeUp API] ERROR: Wrong number of items");
    return Response.json({
      success: false,
      error: "Exactly 10 items required"
    });
  }

  try {
    const userData = await findUniqueUser(user.id);
    const rawInventory = userData.inventory;

    let resultItemId: number | null = null;
    const consumedUuids: string[] = [];
    let newItemUuid: string | null = null;

    await manipulateUserInventory({
      rawInventory,
      userId: user.id,
      manipulate(inventory) {
        console.log(`[TradeUp] Looking for ${itemProperties.length} items`);

        // Parse raw inventory to access UUIDs
        const inventoryData = rawInventory ? JSON.parse(rawInventory) : { items: {} };
        const allItems = inventory.getAll();
        const itemsToRemove: number[] = [];

        // Find items to remove by UUID (if available) or properties
        for (const targetItem of itemProperties) {
          let found = false;

          // If UUID provided, find by UUID first
          if (targetItem.uuid) {
            const itemEntry = Object.entries(inventoryData.items || {}).find(
              ([key, item]: [string, any]) => item.uuid === targetItem.uuid || key === targetItem.uuid
            );

            if (itemEntry) {
              const [key, item] = itemEntry as [string, any];
              const uid = item.uid || parseInt(key);

              if (!itemsToRemove.includes(uid)) {
                console.log(`[TradeUp] Found item by UUID: ${targetItem.uuid}, UID=${uid}`);
                itemsToRemove.push(uid);
                consumedUuids.push(targetItem.uuid);
                found = true;
              }
            }
          }

          // Fallback: Match by properties if UUID not found
          if (!found) {
            for (const invItem of allItems) {
              if (itemsToRemove.includes(invItem.uid)) continue;

              const match =
                invItem.id === targetItem.id &&
                Math.abs((invItem.wear || 0) - (targetItem.wear || 0)) < 0.0001 &&
                (invItem.nameTag || "") === (targetItem.nameTag || "");

              if (match) {
                console.log(`[TradeUp] Found item by properties: ID=${invItem.id}, UID=${invItem.uid}`);
                itemsToRemove.push(invItem.uid);

                // Try to get UUID for tracking
                const itemWithUuid = Object.values(inventoryData.items || {}).find(
                  (item: any) => item.uid === invItem.uid
                ) as any;
                if (itemWithUuid?.uuid) {
                  consumedUuids.push(itemWithUuid.uuid);
                }

                found = true;
                break;
              }
            }
          }

          if (!found) {
            throw new Error(`Item not found: ID=${targetItem.id}`);
          }
        }

        if (itemsToRemove.length !== 10) {
          throw new Error(`Expected 10 items, found ${itemsToRemove.length}`);
        }

        // Check all items have same rarity
        const rarities = itemsToRemove.map(uid => {
          const item = allItems.find(i => i.uid === uid)!;
          return CS2Economy.getById(item.id).rarity.toLowerCase();
        });

        const firstRarity = rarities[0];
        if (!rarities.every(r => r === firstRarity)) {
          throw new Error("All items must have the same rarity");
        }

        // Get next rarity
        const nextRarity = getNextRarity(firstRarity);
        if (!nextRarity) {
          throw new Error("Cannot upgrade from maximum rarity");
        }

        console.log(`[TradeUp] ${firstRarity} → ${nextRarity}`);

        // Find items of next rarity
        const higherRarityItems = CS2Economy.itemsAsArray.filter(
          item => item.type === "weapon" && item.rarity.toLowerCase() === nextRarity
        );

        if (higherRarityItems.length === 0) {
          throw new Error("No items found for next rarity");
        }

        // Select random item
        const randomItem = higherRarityItems[Math.floor(Math.random() * higherRarityItems.length)];
        resultItemId = randomItem.id;

        console.log(`[TradeUp] Reward: ${randomItem.name}`);

        // Remove all 10 items
        itemsToRemove.forEach(uid => {
          inventory.removeItem(uid);
        });

        // Add reward (UUID will be added automatically by ensureItemUuids)
        inventory.add({ id: resultItemId });

        console.log(`[TradeUp] Complete`);
      }
    });

    if (!resultItemId) {
      throw new Error("Failed to determine result item");
    }

    // Record consumed items in ItemHistory (fire and forget)
    if (consumedUuids.length > 0) {
      console.log(`[TradeUp] Recording ${consumedUuids.length} consumed items`);

      for (const uuid of consumedUuids) {
        try {
          // Record consumption transfer
          await recordItemTransfer({
            itemUuid: uuid,
            fromUser: user.id,
            toUser: user.id,
            transferType: "TRADEUP_CONSUME",
            metadata: { resultItemId }
          });

          // Mark item as deleted/consumed
          await markItemDeleted(uuid);

          console.log(`[TradeUp] Marked ${uuid} as consumed`);
        } catch (err) {
          console.error(`[TradeUp] Failed to record consumed item ${uuid}:`, err);
        }
      }
    }

    // Find new item UUID from updated inventory
    try {
      const updatedUser = await findUniqueUser(user.id);
      const updatedInventory = updatedUser.inventory ? JSON.parse(updatedUser.inventory) : { items: {} };

      // Find the newest item with matching resultItemId
      const newItem = Object.entries(updatedInventory.items || {})
        .map(([key, item]: [string, any]) => ({ key, item }))
        .filter(({ item }) => item.id === resultItemId)
        .sort((a, b) => {
          // Sort by creation (newest items usually have higher UIDs or are at the end)
          return (b.item.uid || 0) - (a.item.uid || 0);
        })[0];

      if (newItem?.item?.uuid) {
        newItemUuid = newItem.item.uuid;

        // Record reward transfer
        await recordItemTransfer({
          itemUuid: newItemUuid,
          fromUser: user.id,
          toUser: user.id,
          transferType: "TRADEUP_REWARD",
          metadata: {
            consumedItems: consumedUuids.length,
            resultItemId
          }
        });

        console.log(`[TradeUp] Recorded reward item ${newItemUuid}`);
      }
    } catch (err) {
      console.error(`[TradeUp] Failed to record reward item:`, err);
    }

    const resultItem = CS2Economy.getById(resultItemId);

    return Response.json({
      success: true,
      message: "Trade up successful",
      resultItem: {
        id: resultItem.id,
        name: resultItem.name,
        rarity: resultItem.rarity
      }
    });
  } catch (error: any) {
    console.error("[TradeUp] Error:", error);
    return Response.json({
      success: false,
      error: error.message || "Trade up failed"
    });
  }
});

export { loader } from "./api.$";
