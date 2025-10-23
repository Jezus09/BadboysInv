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

    await manipulateUserInventory({
      rawInventory,
      userId: user.id,
      manipulate(inventory) {
        console.log(`[TradeUp] Looking for ${itemProperties.length} items`);

        // Get all items from CS2Inventory instance
        const allItems = inventory.getAll();
        const itemsToRemove: number[] = [];

        // Find items to remove by properties
        for (const targetItem of itemProperties) {
          let found = false;

          for (const invItem of allItems) {
            // Skip if already marked for removal
            if (itemsToRemove.includes(invItem.uid)) {
              continue;
            }

            // Match by item properties
            const match =
              invItem.id === targetItem.id &&
              Math.abs((invItem.wear || 0) - (targetItem.wear || 0)) < 0.0001 &&
              (invItem.nameTag || "") === (targetItem.nameTag || "");

            if (match) {
              console.log(`[TradeUp] Found item: ID=${invItem.id}, UID=${invItem.uid}`);
              itemsToRemove.push(invItem.uid);
              found = true;
              break;
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

        // Add reward
        inventory.add({ id: resultItemId });

        console.log(`[TradeUp] Complete`);
      }
    });

    if (!resultItemId) {
      throw new Error("Failed to determine result item");
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
