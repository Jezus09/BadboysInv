/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { prisma } from "~/db.server";
import { Decimal } from "@prisma/client/runtime/library";

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
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  return await prisma.marketplaceListing.create({
    data: {
      userId,
      itemUid,
      itemData,
      price: new Decimal(price),
      expiresAt
    }
  });
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

  return await prisma.marketplaceListing.update({
    where: { id: listingId },
    data: {
      status: "CANCELLED",
      updatedAt: new Date()
    }
  });
}

export async function purchaseListing(listingId: string, buyerId: string) {
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

  // Get buyer's current balance
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { coins: true }
  });

  if (!buyer) {
    throw new Error("Buyer not found");
  }

  const buyerBalance = buyer.coins || new Decimal(0);
  if (buyerBalance.lt(listing.price)) {
    throw new Error("Insufficient funds");
  }

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
