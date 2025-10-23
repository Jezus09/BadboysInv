/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data, redirect } from "react-router";
import { z } from "zod";
import { api } from "~/api.server";
import { getRequestUserId } from "~/auth.server";
import { middleware } from "~/http.server";
import { methodNotAllowed } from "~/responses.server";
import {
  getActiveMarketplaceListings,
  getUserListings,
  createListing,
  cancelListing,
  purchaseListing,
  getListing
} from "~/models/marketplace.server";
import {
  createListingWithUuid,
  cancelListingWithUuid,
  purchaseListingWithUuid
} from "~/models/marketplace-uuid.server";
import { getUserInventory } from "~/models/user.server";
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
  const { action: actionType, ...params} = z
    .object({
      action: z.enum([
        "create_listing",
        "cancel_listing",
        "purchase_listing",
        "get_my_listings"
      ]),
      listingId: z.string().optional(),
      itemUid: z.number().optional(), // Legacy UID support
      itemUuid: z.string().optional(), // New UUID support
      price: z.number().optional()
    })
    .parse(body);

  try {
    switch (actionType) {
      case "create_listing": {
        // Support both UUID (new) and UID (legacy)
        const hasUuid = params.itemUuid !== undefined;
        const hasUid = params.itemUid !== undefined;

        if ((!hasUuid && !hasUid) || params.price === undefined) {
          return data({
            success: false,
            message: "Missing required parameters (itemUuid or itemUid, and price)"
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

        // Find item by UUID or UID
        const itemKey = hasUuid ? params.itemUuid! : params.itemUid!.toString();
        const item = inventory.items[itemKey];

        if (!item) {
          return data({
            success: false,
            message: "Item not found in inventory"
          });
        }

        let listing;

        if (hasUuid) {
          console.log("[Marketplace] Creating UUID-based listing");
          listing = await createListingWithUuid({
            userId,
            itemUuid: params.itemUuid!,
            itemData: JSON.stringify(item),
            price: params.price,
            currentInventory: userInventory
          });
        } else {
          console.log("[Marketplace] Creating legacy UID-based listing");
          listing = await createListing({
            userId,
            itemUid: params.itemUid!,
            itemData: JSON.stringify(item),
            price: params.price,
            currentInventory: userInventory
          });
        }

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

        // Detect if listing uses UUID or UID
        const listing = await getListing(params.listingId);
        if (!listing) {
          return data({
            success: false,
            message: "Listing not found"
          });
        }

        const itemData = JSON.parse(listing.itemData);
        const hasUuid = itemData.uuid !== undefined;

        if (hasUuid) {
          console.log("[Marketplace] Cancelling UUID-based listing");
          await cancelListingWithUuid(params.listingId, userId);
        } else {
          console.log("[Marketplace] Cancelling legacy UID-based listing");
          await cancelListing(params.listingId, userId);
        }

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

        // Detect if listing uses UUID or UID
        const listing = await getListing(params.listingId);
        if (!listing) {
          return data({
            success: false,
            message: "Listing not found"
          });
        }

        const itemData = JSON.parse(listing.itemData);
        const hasUuid = itemData.uuid !== undefined;

        let purchasedListing;

        if (hasUuid) {
          console.log("[Marketplace] Purchasing UUID-based listing");
          purchasedListing = await purchaseListingWithUuid(params.listingId, userId);
        } else {
          console.log("[Marketplace] Purchasing legacy UID-based listing");
          purchasedListing = await purchaseListing(params.listingId, userId);
        }

        return data({
          success: true,
          message: "Purchase successful",
          listing: purchasedListing
        });
      }

      case "get_my_listings": {
        const listings = await getUserListings(userId);

        return data({
          success: true,
          listings
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
