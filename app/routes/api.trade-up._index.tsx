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
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  const user = await requireUser(request);
  const formData = await request.formData();

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

  if (itemProperties.length !== 10) {
    return Response.json({
      success: false,
      error: "Exactly 10 items required"
    });
  }

  try {
    const { inventory: rawInventory } = await findUniqueUser(user.id);

    let resultItemId: number | null = null;

    await manipulateUserInventory({
      rawInventory,
      userId: user.id,
      manipulate(inventory) {
        console.log(`[TradeUp] Looking for ${itemProperties.length} items in inventory`);

        // Find and remove items by properties (not UID, since UID changes)
        const itemsToRemove: number[] = [];

        for (const targetItem of itemProperties) {
          let found = false;

          // Search through inventory for matching item
          for (const [uid, invItem] of Object.entries(inventory.items)) {
            const numericUid = parseInt(uid);

            // Skip if already marked for removal
            if (itemsToRemove.includes(numericUid)) {
              continue;
            }

            // Match by item properties (same logic as trade system)
            const match =
              invItem.id === targetItem.id &&
              Math.abs((invItem.wear || 0) - (targetItem.wear || 0)) < 0.0001 &&
              (invItem.nameTag || "") === (targetItem.nameTag || "");

            if (match) {
              console.log(`[TradeUp] Found matching item at UID ${numericUid}: ID=${invItem.id}, wear=${invItem.wear}`);
              itemsToRemove.push(numericUid);
              found = true;
              break;
            }
          }

          if (!found) {
            throw new Error(`Item not found in inventory: ID=${targetItem.id}, wear=${targetItem.wear}`);
          }
        }

        // Verify we found all 10 items
        if (itemsToRemove.length !== 10) {
          throw new Error(`Expected to find 10 items, found ${itemsToRemove.length}`);
        }

        // Check all items have same rarity
        const rarities = itemsToRemove.map(uid => {
          const item = inventory.get(uid);
          const economyItem = CS2Economy.getById(item.id);
          return economyItem.rarity.toLowerCase();
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

        console.log(`[TradeUp] Upgrading from ${firstRarity} to ${nextRarity}`);

        // Find all items of next rarity
        const higherRarityItems = CS2Economy.itemsAsArray.filter(
          item => item.type === "weapon" && item.rarity.toLowerCase() === nextRarity
        );

        if (higherRarityItems.length === 0) {
          throw new Error("No items found for next rarity");
        }

        // Select random item from higher rarity
        const randomItem = higherRarityItems[Math.floor(Math.random() * higherRarityItems.length)];
        resultItemId = randomItem.id;

        console.log(`[TradeUp] Selected reward: ${randomItem.name} (ID: ${randomItem.id})`);

        // Remove all 10 items
        itemsToRemove.forEach(uid => {
          console.log(`[TradeUp] Removing item UID ${uid}`);
          inventory.removeItem(uid);
        });

        // Add new higher rarity item
        inventory.add({
          id: resultItemId
        });

        console.log(`[TradeUp] Trade up complete!`);
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
