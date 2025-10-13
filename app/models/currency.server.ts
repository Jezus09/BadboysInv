/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "~/db.server";

export interface CurrencyTransaction {
  id: string;
  userId: string;
  amount: Decimal;
  type: "earn" | "spend" | "transfer_in" | "transfer_out";
  reason?: string;
  description?: string;
  relatedUserId?: string;
  createdAt: Date;
}

export async function getUserCoins(userId: string): Promise<Decimal> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true }
  });
  return user?.coins || new Decimal(0);
}

// Alias for compatibility
export const getCoins = getUserCoins;

export async function addCoins(
  userId: string,
  amount: number | Decimal,
  reason?: string,
  description?: string
) {
  const decimalAmount = new Decimal(amount);

  // Update user coins
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      coins: { increment: decimalAmount }
    },
    select: { coins: true }
  });

  // Create transaction record
  await prisma.currencyTransaction.create({
    data: {
      userId,
      amount: decimalAmount,
      type: "earn",
      reason,
      description
    }
  });

  return updatedUser.coins;
}

export async function subtractCoins(
  userId: string,
  amount: number | Decimal,
  reason?: string,
  description?: string
): Promise<{ success: boolean; coins?: Decimal; error?: string }> {
  const decimalAmount = new Decimal(amount);
  const currentCoins = await getUserCoins(userId);

  if (currentCoins.lessThan(decimalAmount)) {
    return {
      success: false,
      error: "Insufficient balance"
    };
  }

  // Update user coins
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      coins: { decrement: decimalAmount }
    },
    select: { coins: true }
  });

  // Create transaction record
  await prisma.currencyTransaction.create({
    data: {
      userId,
      amount: decimalAmount.negated(),
      type: "spend",
      reason,
      description
    }
  });

  return {
    success: true,
    coins: updatedUser.coins || new Decimal(0)
  };
}

export async function transferCoins(
  fromUserId: string,
  toUserId: string,
  amount: number | Decimal,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const decimalAmount = new Decimal(amount);
  const fromUserCoins = await getUserCoins(fromUserId);

  if (fromUserCoins.lessThan(decimalAmount)) {
    return {
      success: false,
      error: "Insufficient balance"
    };
  }

  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Subtract from sender
    await tx.user.update({
      where: { id: fromUserId },
      data: { coins: { decrement: decimalAmount } }
    });

    // Add to receiver
    await tx.user.update({
      where: { id: toUserId },
      data: { coins: { increment: decimalAmount } }
    });

    // Create transaction records
    await tx.currencyTransaction.create({
      data: {
        userId: fromUserId,
        amount: decimalAmount.negated(),
        type: "transfer_out",
        reason: "transfer",
        description,
        relatedUserId: toUserId
      }
    });

    await tx.currencyTransaction.create({
      data: {
        userId: toUserId,
        amount: decimalAmount,
        type: "transfer_in",
        reason: "transfer",
        description,
        relatedUserId: fromUserId
      }
    });
  });

  return { success: true };
}

export async function getCurrencyTransactions(
  userId: string,
  limit = 50,
  offset = 0
) {
  return await prisma.currencyTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          name: true,
          avatar: true
        }
      }
    }
  });
}

export async function getTopUsers(limit = 10) {
  return await prisma.user.findMany({
    where: {
      coins: { not: null }
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      coins: true
    },
    orderBy: { coins: "desc" },
    take: limit
  });
}
