/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Economy } from "@ianlucas/cs2-lib";
import { data, redirect } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId, requireUser } from "~/auth.server";
import { middleware } from "~/http.server";
import { methodNotAllowed } from "~/responses.server";
import {
  getActiveMarketplaceListings,
  getUserListings,
  createListing,
  cancelListing,
  purchaseListing,
  getListing,
  getPriceHistory
} from "~/models/marketplace.server";
import { getUserInventory, notifyPluginMarketplaceListing, notifyPluginMarketplacePurchase } from "~/models/user.server";
import { parseInventory } from "~/utils/inventory";
import type { Route } from "./+types/api.marketplace._index";

export const ApiMarketplaceUrl = "/api/marketplace";

/**
 * Handle marketplace API requests
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
        "create_listing",
        "cancel_listing",
        "purchase_listing",
        "get_my_listings",
        "get_price_history"
      ]),
      listingId: z.string().optional(),
      itemUid: z.number().optional(),
      price: z.number().optional(),
      itemId: z.number().optional(),
      wear: z.number().optional(),
      days: z.number().optional()
    })
    .parse(body);

  try {
    switch (actionType) {
      case "create_listing": {
        if (params.itemUid === undefined || params.price === undefined) {
          return data({
            success: false,
            message: "Missing required parameters"
          });
        }

        // Get user's inventory
        const userInventory = await getUserInventory(userId);
        const inventory = parseInventory(userInventory);

        if (!inventory) {
          return data({
            success: false,
            message: "Inventory not found"
          });
        }

        // Check if item exists in inventory
        const item = inventory.items[params.itemUid];
        if (!item) {
          return data({
            success: false,
            message: "Item not found in inventory"
          });
        }

        // Create listing
        const listing = await createListing({
          userId,
          itemUid: params.itemUid,
          itemData: JSON.stringify(item),
          price: params.price
        });

        // Notify CS2 plugin
        const user = await requireUser(request);
        const itemData = CS2Economy.getById(item.id);
        await notifyPluginMarketplaceListing({
          playerName: user.name,
          itemName: itemData.name,
          rarity: itemData.rarity || "Common",
          statTrak: item.stattrak || false,
          price: params.price
        });

        return data({
          success: true,
          message: "Listing created successfully",
          listing
        });
      }

      case "cancel_listing": {
        if (!params.listingId) {
          return data({
            success: false,
            message: "Missing listing ID"
          });
        }

        await cancelListing(params.listingId, userId);

        return data({
          success: true,
          message: "Listing cancelled successfully"
        });
      }

      case "purchase_listing": {
        if (!params.listingId) {
          return data({
            success: false,
            message: "Missing listing ID"
          });
        }

        // Get listing info before purchase
        const listingInfo = await getListing(params.listingId);
        if (listingInfo) {
          const itemData = JSON.parse(listingInfo.itemData);
          const economyData = CS2Economy.getById(itemData.id);

          // Purchase listing
          const listing = await purchaseListing(params.listingId, userId);

          // Notify CS2 plugin
          const buyer = await requireUser(request);
          await notifyPluginMarketplacePurchase({
            buyerId: buyer.id,
            buyerName: buyer.name,
            sellerId: listingInfo.userId,
            sellerName: listingInfo.sellerName || "Unknown",
            itemName: economyData.name,
            rarity: economyData.rarity || "Common",
            statTrak: itemData.stattrak || false,
            price: listingInfo.price
          });

          return data({
            success: true,
            message: "Purchase successful",
            listing
          });
        }

        const listing = await purchaseListing(params.listingId, userId);

        return data({
          success: true,
          message: "Purchase successful",
          listing
        });
      }

      case "get_my_listings": {
        const listings = await getUserListings(userId);

        return data({
          success: true,
          listings
        });
      }

      case "get_price_history": {
        if (params.itemId === undefined) {
          return data({
            success: false,
            message: "Missing itemId parameter"
          });
        }

        const history = await getPriceHistory(
          params.itemId,
          params.wear,
          params.days || 30
        );

        return data({
          success: true,
          history
        });
      }

      default:
        return data({
          success: false,
          message: "Invalid action"
        });
    }
  } catch (error: any) {
    console.error("Marketplace API error:", error);
    return data(
      {
        success: false,
        message: error.message || "Internal server error"
      },
      { status: 500 }
    );
  }
});

/**
 * Get marketplace listings
 */
export const loader = api(async ({ request }: Route.LoaderArgs) => {
  await middleware(request);

  const url = new URL(request.url);
  const listingId = url.searchParams.get("listingId");

  if (listingId) {
    const listing = await getListing(listingId);
    return data({ listing });
  }

  const listings = await getActiveMarketplaceListings();
  return data({ listings });
});
