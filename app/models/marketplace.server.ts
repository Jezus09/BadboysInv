/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { prisma } from "~/db.server";
import { Decimal } from "@prisma/client/runtime/library";
import { parseInventory } from "~/utils/inventory";
import { invalidateCachedInventory } from "~/redis.server";

export async function getActiveMarketplaceListings() {
  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      seller: {
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

  return listings;
}

export async function getUserListings(userId: string) {
  return await prisma.marketplaceListing.findMany({
    where: {
      userId,
      status: "ACTIVE"
    },
    include: {
      seller: {
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

export async function createListing({
  userId,
  itemUid,
  itemData,
  price,
  expiresInDays = 7
}: {
  userId: string;
  itemUid: number;
  itemData: string;
  price: number;
  expiresInDays?: number;
}) {
  // Check if user already has an active listing for this item
  const existingListing = await prisma.marketplaceListing.findFirst({
    where: {
      userId,
      itemUid,
      status: "ACTIVE"
    }
  });

  if (existingListing) {
    throw new Error("Item already listed on marketplace");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const listing = await prisma.marketplaceListing.create({
    data: {
      userId,
      itemUid,
      itemData,
      price: new Decimal(price),
      expiresAt
    }
  });

  // Record price history when listing is created
  const item = JSON.parse(itemData);
  await prisma.marketplacePriceHistory.create({
    data: {
      itemId: item.id,
      wear: item.wear,
      price: new Decimal(price),
      listingId: listing.id,
      soldAt: null // Not sold yet, just listed
    }
  });

  return listing;
}

export async function cancelListing(listingId: string, userId: string) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId }
  });

  if (!listing || listing.userId !== userId) {
    throw new Error("Listing not found or unauthorized");
  }

  if (listing.status !== "ACTIVE") {
    throw new Error("Listing is not active");
  }

  const result = await prisma.marketplaceListing.update({
    where: { id: listingId },
    data: {
      status: "CANCELLED",
      updatedAt: new Date()
    }
  });

  // Invalidate cache after cancelling listing
  await invalidateCachedInventory(userId);

  return result;
}

export async function purchaseListing(listingId: string, buyerId: string) {
  console.log("=== MARKETPLACE PURCHASE START ===");
  console.log("Listing ID:", listingId);
  console.log("Buyer ID:", buyerId);

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: {
          id: true,
          coins: true,
          inventory: true
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
  console.log("Item UID:", listing.itemUid);
  console.log("Price:", listing.price.toString());

  // Parse inventories
  const sellerInventoryData = parseInventory(listing.seller.inventory);
  const buyerInventoryData = parseInventory(buyer.inventory);

  if (!sellerInventoryData?.items || !buyerInventoryData?.items) {
    throw new Error("Could not parse inventories");
  }

  console.log("Original seller inventory UIDs:", Object.keys(sellerInventoryData.items));
  console.log("Original buyer inventory UIDs:", Object.keys(buyerInventoryData.items));

  // Check if item still exists in seller's inventory
  const itemInInventory = sellerInventoryData.items[listing.itemUid];
  if (!itemInInventory) {
    throw new Error("Item no longer exists in seller's inventory");
  }

  // Parse the item data from listing
  const itemData = JSON.parse(listing.itemData);
  console.log("Item to transfer:", itemData);

  // Create new inventory objects
  const newSellerInventory = { ...sellerInventoryData };
  const newBuyerInventory = { ...buyerInventoryData };

  // Copy items objects
  newSellerInventory.items = { ...sellerInventoryData.items };
  newBuyerInventory.items = { ...buyerInventoryData.items };

  // Remove item from seller inventory
  console.log(`Removing item UID ${listing.itemUid} from seller inventory`);
  delete newSellerInventory.items[listing.itemUid];

  // Find next available UID for buyer
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

  // Add item to buyer inventory with new UID
  const newUID = getNextUID(newBuyerInventory);
  newBuyerInventory.items[newUID] = itemData;
  console.log(`Added item to buyer inventory with new UID ${newUID}`);

  console.log("New seller inventory UIDs:", Object.keys(newSellerInventory.items));
  console.log("New buyer inventory UIDs:", Object.keys(newBuyerInventory.items));

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

    // Update seller inventory
    await tx.user.update({
      where: { id: listing.userId },
      data: {
        inventory: JSON.stringify(newSellerInventory)
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

    // Record sold price in price history
    await tx.marketplacePriceHistory.create({
      data: {
        itemId: itemData.id,
        wear: itemData.wear,
        price: listing.price,
        listingId: listingId,
        soldAt: new Date()
      }
    });

    console.log("=== MARKETPLACE PURCHASE COMPLETED SUCCESSFULLY ===");
    return listing;
  });

  // Invalidate cache for both buyer and seller AFTER transaction completes
  console.log("Invalidating inventory cache for buyer:", buyerId);
  await invalidateCachedInventory(buyerId);

  console.log("Invalidating inventory cache for seller:", listing.userId);
  await invalidateCachedInventory(listing.userId);

  return result;
}

export async function getListing(listingId: string) {
  return await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });
}

export async function getPriceHistory(itemId: number, wear?: number, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const whereClause: any = {
    itemId,
    createdAt: {
      gte: startDate
    }
  };

  // If wear is specified, filter by similar wear (±0.05)
  if (wear !== undefined) {
    whereClause.wear = {
      gte: wear - 0.05,
      lte: wear + 0.05
    };
  }

  return await prisma.marketplacePriceHistory.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "asc"
    },
    select: {
      price: true,
      soldAt: true,
      createdAt: true
    }
  });
}

/**
 * Get active marketplace listing UIDs for a user
 * Returns an array of item UIDs that are currently listed on marketplace
 */
export async function getUserActiveListingUids(userId: string): Promise<number[]> {
  const listings = await prisma.marketplaceListing.findMany({
    where: {
      userId,
      status: "ACTIVE"
    },
    select: {
      itemUid: true
    }
  });

  return listings.map(listing => listing.itemUid);
}
