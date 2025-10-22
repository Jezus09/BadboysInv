/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { prisma } from "~/db.server";
import { Decimal } from "@prisma/client/runtime/library";
import { parseInventory } from "~/utils/inventory";

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
      status: {
        in: ["ACTIVE", "SOLD"]
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
}

export async function createListing({
  userId,
  itemUid,
  itemData,
  price,
  expiresInDays = 7,
  currentInventory
}: {
  userId: string;
  itemUid: number;
  itemData: string;
  price: number;
  expiresInDays?: number;
  currentInventory: string;
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

  // Parse inventory and remove the item
  const inventoryData = parseInventory(currentInventory);
  if (!inventoryData?.items) {
    throw new Error("Could not parse inventory");
  }

  // Remove item from inventory
  const newInventory = { ...inventoryData };
  newInventory.items = { ...inventoryData.items };
  delete newInventory.items[itemUid];

  console.log(`[Marketplace] Removing item UID ${itemUid} from inventory when creating listing`);

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
        itemUid,
        itemData,
        price: new Decimal(price),
        expiresAt
      }
    });
  });
}

export async function cancelListing(listingId: string, userId: string) {
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

  // Parse seller's current inventory
  const inventoryData = parseInventory(listing.seller.inventory);
  if (!inventoryData?.items) {
    throw new Error("Could not parse inventory");
  }

  // Find next available UID
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

  // Add item back to inventory with new UID
  const newInventory = { ...inventoryData };
  newInventory.items = { ...inventoryData.items };
  const newUID = getNextUID(newInventory);
  newInventory.items[newUID] = itemData;

  console.log(`[Marketplace] Restoring item to inventory with new UID ${newUID} (was ${listing.itemUid})`);

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
  console.log("Item UID (original):", listing.itemUid);
  console.log("Price:", listing.price.toString());

  // Parse buyer's inventory (item already removed from seller when listing was created)
  const buyerInventoryData = parseInventory(buyer.inventory);

  if (!buyerInventoryData?.items) {
    throw new Error("Could not parse buyer inventory");
  }

  console.log("Original buyer inventory UIDs:", Object.keys(buyerInventoryData.items));

  // Parse the item data from listing
  const itemData = JSON.parse(listing.itemData);
  console.log("Item to transfer:", itemData);

  // Create new buyer inventory object
  const newBuyerInventory = { ...buyerInventoryData };
  newBuyerInventory.items = { ...buyerInventoryData.items };

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

  console.log("New buyer inventory UIDs:", Object.keys(newBuyerInventory.items));

  // Execute transaction
  return await prisma.$transaction(async (tx) => {
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

    // Update buyer inventory (seller inventory already updated when listing was created)
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
