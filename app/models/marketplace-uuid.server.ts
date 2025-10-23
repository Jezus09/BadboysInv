/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * UUID-based marketplace system implementation
 * This will replace the old UID-based marketplace.server.ts
 */

import { prisma } from "~/db.server";
import { Decimal } from "@prisma/client/runtime/library";
import { transferItem } from "~/utils/inventory-uuid.server";

export async function createListingWithUuid({
  userId,
  itemUuid,
  itemData,
  price,
  expiresInDays = 7,
  currentInventory
}: {
  userId: string;
  itemUuid: string;
  itemData: string;
  price: number;
  expiresInDays?: number;
  currentInventory: string;
}) {
  // Check if user already has an active listing for this item
  const existingListing = await prisma.marketplaceListing.findFirst({
    where: {
      userId,
      itemData: {
        contains: itemUuid // Check if UUID exists in itemData JSON
      },
      status: "ACTIVE"
    }
  });

  if (existingListing) {
    throw new Error("Item already listed on marketplace");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Parse inventory and remove the item
  const inventoryData = JSON.parse(currentInventory || '{"items":{}}');
  if (!inventoryData?.items) {
    throw new Error("Could not parse inventory");
  }

  // Verify item exists
  if (!inventoryData.items[itemUuid]) {
    throw new Error("Item not found in inventory");
  }

  // Remove item from inventory
  const newInventory = { ...inventoryData };
  newInventory.items = { ...inventoryData.items };
  delete newInventory.items[itemUuid];

  console.log(`[Marketplace] Removing item UUID ${itemUuid} from inventory when creating listing`);

  // Create listing and update inventory in transaction
  return await prisma.$transaction(async (tx) => {
    // Update user inventory to remove the listed item
    await tx.user.update({
      where: { id: userId },
      data: {
        inventory: JSON.stringify(newInventory)
      }
    });

    // Create the listing
    return await tx.marketplaceListing.create({
      data: {
        userId,
        itemUid: 0, // Deprecated field, use UUID from itemData
        itemData,
        price: new Decimal(price),
        expiresAt
      }
    });
  });
}

export async function cancelListingWithUuid(listingId: string, userId: string) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: {
          inventory: true
        }
      }
    }
  });

  if (!listing || listing.userId !== userId) {
    throw new Error("Listing not found or unauthorized");
  }

  if (listing.status !== "ACTIVE") {
    throw new Error("Listing is not active");
  }

  // Parse the item data from listing
  const itemData = JSON.parse(listing.itemData);
  const itemUuid = itemData.uuid;

  if (!itemUuid) {
    throw new Error("Item UUID not found in listing data");
  }

  // Parse seller's current inventory
  const inventoryData = JSON.parse(listing.seller.inventory || '{"items":{}}');
  if (!inventoryData?.items) {
    throw new Error("Could not parse inventory");
  }

  // Add item back to inventory with SAME UUID
  const newInventory = { ...inventoryData };
  newInventory.items = { ...inventoryData.items };
  newInventory.items[itemUuid] = itemData;

  console.log(`[Marketplace] Restoring item to inventory with UUID ${itemUuid}`);

  // Update listing status and restore item in transaction
  return await prisma.$transaction(async (tx) => {
    // Update user inventory to restore the item
    await tx.user.update({
      where: { id: userId },
      data: {
        inventory: JSON.stringify(newInventory)
      }
    });

    // Mark listing as cancelled
    return await tx.marketplaceListing.update({
      where: { id: listingId },
      data: {
        status: "CANCELLED",
        updatedAt: new Date()
      }
    });
  });
}

export async function purchaseListingWithUuid(listingId: string, buyerId: string) {
  console.log("=== MARKETPLACE PURCHASE (UUID) START ===");
  console.log("Listing ID:", listingId);
  console.log("Buyer ID:", buyerId);

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: {
          id: true,
          coins: true
        }
      }
    }
  });

  if (!listing) {
    throw new Error("Listing not found");
  }

  if (listing.status !== "ACTIVE") {
    throw new Error("Listing is not active");
  }

  if (listing.userId === buyerId) {
    throw new Error("Cannot buy your own listing");
  }

  if (new Date() > listing.expiresAt) {
    throw new Error("Listing has expired");
  }

  // Get buyer's current balance and inventory
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { coins: true, inventory: true }
  });

  if (!buyer) {
    throw new Error("Buyer not found");
  }

  const buyerBalance = buyer.coins || new Decimal(0);
  if (buyerBalance.lt(listing.price)) {
    throw new Error("Insufficient funds");
  }

  console.log("Seller:", listing.userId);
  console.log("Buyer:", buyerId);
  console.log("Price:", listing.price.toString());

  // Parse the item data from listing
  const itemData = JSON.parse(listing.itemData);
  const itemUuid = itemData.uuid;

  if (!itemUuid) {
    throw new Error("Item UUID not found in listing data");
  }

  console.log("Item UUID:", itemUuid);

  // Parse buyer's inventory
  const buyerInventoryData = JSON.parse(buyer.inventory || '{"items":{}}');

  if (!buyerInventoryData?.items) {
    throw new Error("Could not parse buyer inventory");
  }

  console.log("Original buyer inventory count:", Object.keys(buyerInventoryData.items).length);

  // Create new buyer inventory object
  const newBuyerInventory = { ...buyerInventoryData };
  newBuyerInventory.items = { ...buyerInventoryData.items };

  // Add item to buyer inventory with SAME UUID
  newBuyerInventory.items[itemUuid] = {
    ...itemData,
    // Remove equipped status
    equippedCT: undefined,
    equippedT: undefined
  };

  console.log(`Added item to buyer inventory with UUID ${itemUuid}`);
  console.log("New buyer inventory count:", Object.keys(newBuyerInventory.items).length);

  // Execute transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update listing status
    await tx.marketplaceListing.update({
      where: { id: listingId },
      data: {
        status: "SOLD",
        buyerId,
        soldAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update buyer inventory
    await tx.user.update({
      where: { id: buyerId },
      data: {
        inventory: JSON.stringify(newBuyerInventory)
      }
    });

    // Deduct coins from buyer
    await tx.user.update({
      where: { id: buyerId },
      data: {
        coins: {
          decrement: listing.price
        }
      }
    });

    // Add coins to seller
    await tx.user.update({
      where: { id: listing.userId },
      data: {
        coins: {
          increment: listing.price
        }
      }
    });

    // Record transactions
    await tx.currencyTransaction.create({
      data: {
        userId: buyerId,
        amount: listing.price.neg(),
        type: "MARKETPLACE_PURCHASE",
        description: `Purchased item from marketplace`,
        relatedUserId: listing.userId
      }
    });

    await tx.currencyTransaction.create({
      data: {
        userId: listing.userId,
        amount: listing.price,
        type: "MARKETPLACE_SALE",
        description: `Sold item on marketplace`,
        relatedUserId: buyerId
      }
    });

    console.log("=== MARKETPLACE PURCHASE COMPLETED SUCCESSFULLY ===");
    return listing;
  });

  // Record item transfer in ItemHistory (outside transaction)
  try {
    console.log("=== RECORDING ITEM TRANSFER IN HISTORY ===");

    await transferItem({
      itemUuid,
      fromUser: listing.userId,
      toUser: buyerId,
      transferType: "MARKETPLACE_BUY",
      listingId,
      metadata: {
        price: listing.price.toString(),
        listingCreatedAt: listing.createdAt.toISOString()
      }
    });

    console.log("Item transfer history recorded successfully");
  } catch (error) {
    // Don't fail the purchase if history recording fails
    console.error("Warning: Failed to record item transfer history:", error);
  }

  return result;
}
