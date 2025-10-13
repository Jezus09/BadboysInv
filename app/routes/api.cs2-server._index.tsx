/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data, redirect } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { cs2Server, cs2ServerWebhooks } from "~/cs2-server";
import { getUserInventory } from "~/models/user.server";
import { middleware } from "~/http.server";
import { methodNotAllowed } from "~/responses.server";
import { parseInventory } from "~/utils/inventory";
import type { Route } from "./+types/api.cs2-server._index";

export const ApiCS2ServerUrl = "/api/cs2-server";

/**
 * Handle CS2 server integration requests
 */
export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);

  if (request.method !== "POST") {
    throw methodNotAllowed;
  }

  const userId = await getRequestUserId(request);
  if (!userId) {
    return redirect("/");
  }

  const body = await request.json();
  const { action: actionType, ...params } = z
    .object({
      action: z.enum([
        "sync_inventory",
        "give_item",
        "player_connect",
        "player_disconnect",
        "item_event"
      ]),
      steamId: z.string().optional(),
      itemId: z.string().optional(),
      itemAction: z.enum(["pickup", "drop"]).optional()
    })
    .parse(body);

  try {
    switch (actionType) {
      case "sync_inventory": {
        // Sync user's inventory with CS2 server
        const userInventory = await getUserInventory(userId);
        const inventory = parseInventory(userInventory?.inventory);

        if (inventory && params.steamId) {
          const success = await cs2Server.syncPlayerInventory(
            params.steamId,
            Object.values(inventory.items)
          );

          return data({
            success,
            message: success
              ? "Inventory synced successfully"
              : "Failed to sync inventory"
          });
        }
        break;
      }

      case "give_item": {
        // Give specific item to player
        if (params.steamId && params.itemId) {
          const success = await cs2Server.givePlayerItem(
            params.steamId,
            params.itemId
          );
          return data({
            success,
            message: success ? "Item given successfully" : "Failed to give item"
          });
        }
        break;
      }

      case "player_connect": {
        // Handle player connect webhook
        if (params.steamId) {
          await cs2ServerWebhooks.onPlayerConnect(params.steamId);
          return data({ success: true, message: "Player connect handled" });
        }
        break;
      }

      case "player_disconnect": {
        // Handle player disconnect webhook
        if (params.steamId) {
          await cs2ServerWebhooks.onPlayerDisconnect(params.steamId);
          return data({ success: true, message: "Player disconnect handled" });
        }
        break;
      }

      case "item_event": {
        // Handle item pickup/drop events
        if (params.steamId && params.itemId && params.itemAction) {
          await cs2ServerWebhooks.onItemEvent(
            params.steamId,
            params.itemId,
            params.itemAction
          );
          return data({ success: true, message: "Item event handled" });
        }
        break;
      }
    }

    return data({ success: false, message: "Invalid request parameters" });
  } catch (error) {
    console.error("CS2 Server integration error:", error);
    return data(
      {
        success: false,
        message: "Internal server error"
      },
      { status: 500 }
    );
  }
});

/**
 * Get CS2 server status and configuration
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const userId = await getRequestUserId(request);
  if (!userId) {
    return redirect("/");
  }

  return data({
    serverConfig: {
      connected: true, // Check actual connection status
      serverName: process.env.CS2_SERVER_NAME || "CS2 Server",
      playerCount: 0 // Get from server if available
    },
    features: {
      inventorySync: true,
      realTimeUpdates: true,
      itemGiving: true
    }
  });
});
