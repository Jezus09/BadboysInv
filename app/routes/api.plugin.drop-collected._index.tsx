/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { z } from "zod";
import { api } from "~/api.server";
import { middleware } from "~/http.server";
import { methodNotAllowed, unauthorized } from "~/responses.server";
import { findUniqueUser, manipulateUserInventory, existsUser } from "~/models/user.server";
import { CS2Economy } from "@ianlucas/cs2-lib";
import type { Route } from "./+types/api.plugin.drop-collected._index";

export const ApiPluginDropCollectedUrl = "/api/plugin/drop-collected";

// API Key for security (same as case drop)
const PLUGIN_API_KEY = process.env.PLUGIN_API_KEY || "badboys_secure_api_key_2025";

// Rarities that can drop (Consumer Grade to Classified)
const DROP_RARITIES = [
  "consumer grade",
  "industrial grade",
  "mil-spec",
  "mil-spec grade",
  "restricted",
  "classified"
];

/**
 * Get random weapon skin from drop pool
 */
function getRandomDropItem() {
  // Get all weapon skins that can drop
  const dropPool = CS2Economy.itemsAsArray.filter(
    (item) =>
      item.type === "weapon" &&
      item.rarity &&
      DROP_RARITIES.includes(item.rarity.toLowerCase())
  );

  if (dropPool.length === 0) {
    throw new Error("No items in drop pool");
  }

  // Weighted random by rarity (lower rarities drop more often)
  const rarityWeights: Record<string, number> = {
    "consumer grade": 50,
    "industrial grade": 30,
    "mil-spec": 15,
    "mil-spec grade": 15,
    "restricted": 4,
    "classified": 1
  };

  // Calculate total weight
  const totalWeight = dropPool.reduce((sum, item) => {
    const weight = rarityWeights[item.rarity.toLowerCase()] || 1;
    return sum + weight;
  }, 0);

  // Pick random weighted item
  let random = Math.random() * totalWeight;
  for (const item of dropPool) {
    const weight = rarityWeights[item.rarity.toLowerCase()] || 1;
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }

  // Fallback to first item
  return dropPool[0];
}

/**
 * Handle 3D drop crate collection from CS2 plugin
 * Called when a player collects a drop crate from a kill
 */
export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  try {
    const body = await request.json();

    const { collectorSteamId, killerSteamId, timestamp, apiKey } = z
      .object({
        collectorSteamId: z.string(),
        killerSteamId: z.string(),
        timestamp: z.number(),
        apiKey: z.string().optional()
      })
      .parse(body);

    // Verify API key if provided
    if (apiKey && apiKey !== PLUGIN_API_KEY) {
      console.error(`[DropCrate] Invalid API key from collector ${collectorSteamId}`);
      throw unauthorized;
    }

    console.log(`[DropCrate] Player ${collectorSteamId} collected crate from kill by ${killerSteamId} at ${timestamp}`);

    // Verify collector exists
    const collectorExists = await existsUser(collectorSteamId);
    if (!collectorExists) {
      console.error(`[DropCrate] Collector ${collectorSteamId} not found`);
      return Response.json({
        success: false,
        error: "Collector not found in database"
      }, { status: 404 });
    }

    // Get random drop item
    const droppedItem = getRandomDropItem();
    console.log(`[DropCrate] Selected drop: ${droppedItem.name} (${droppedItem.rarity})`);

    // Get collector's inventory
    const { inventory: rawInventory } = await findUniqueUser(collectorSteamId);

    // Add item to collector's inventory
    await manipulateUserInventory({
      rawInventory,
      userId: collectorSteamId,
      manipulate(inventory) {
        inventory.add({
          id: droppedItem.id
        });
        console.log(`[DropCrate] Added ${droppedItem.name} to ${collectorSteamId}'s inventory`);
      }
    });

    console.log(`[DropCrate] Successfully processed drop for ${collectorSteamId}`);

    return Response.json({
      success: true,
      message: "Drop crate collected successfully",
      collectorSteamId,
      killerSteamId,
      timestamp,
      droppedItem: {
        id: droppedItem.id,
        name: droppedItem.name,
        rarity: droppedItem.rarity,
        category: droppedItem.category
      }
    });
  } catch (error: any) {
    console.error("[DropCrate] Error processing drop collection:", error);

    // Return validation errors
    if (error.name === "ZodError") {
      return Response.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Return generic error
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to process drop collection"
      },
      { status: 500 }
    );
  }
});

export { loader } from "./api.$";
