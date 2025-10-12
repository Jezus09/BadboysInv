/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "~/db.server";

/**
 * Get all enabled shop items
 */
export async function getShopItems() {
  return prisma.shopItem.findMany({
    where: { enabled: true },
    orderBy: [
      { category: "asc" },
      { sortOrder: "asc" },
      { name: "asc" }
    ]
  });
}

/**
 * Get shop item by ID
 */
export async function getShopItem(id: string) {
  return prisma.shopItem.findUnique({
    where: { id }
  });
}

/**
 * Purchase a shop item
 */
export async function purchaseShopItem(
  userId: string,
  shopItemId: string
): Promise<{ success: boolean; message: string; newBalance?: string; itemId?: number }> {
  const shopItem = await getShopItem(shopItemId);
  
  if (!shopItem || !shopItem.enabled) {
    return { success: false, message: "Item not found or disabled" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true, inventory: true }
  });

  if (!user) {
    return { success: false, message: "User not found" };
  }

  const userCoins = user.coins || new Decimal(0);
  
  if (userCoins.lt(shopItem.price)) {
    return { 
      success: false, 
      message: `Insufficient funds. Need $${shopItem.price}, you have $${userCoins.toFixed(2)}` 
    };
  }

  try {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct coins
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          coins: {
            decrement: shopItem.price
          }
        },
        select: { coins: true, inventory: true }
      });

      // Add currency transaction
      await tx.currencyTransaction.create({
        data: {
          userId,
          amount: shopItem.price.neg(),
          type: "SPENT",
          description: `Purchased ${shopItem.name}`
        }
      });

      return updatedUser;
    });

    return {
      success: true,
      message: `Successfully purchased ${shopItem.name}`,
      itemId: shopItem.itemId || undefined,
      newBalance: (result.coins || new Decimal(0)).toFixed(2)
    };

  } catch (error) {
    console.error("Purchase error:", error);
    return { success: false, message: "Purchase failed. Please try again." };
  }
}

/**
 * Get shop items by category
 */
export async function getShopItemsByCategory(category: string) {
  return prisma.shopItem.findMany({
    where: { 
      enabled: true,
      category 
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" }
    ]
  });
}