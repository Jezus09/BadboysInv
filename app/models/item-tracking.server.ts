/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { prisma } from "~/db.server";
import { randomUUID } from "crypto";

/**
 * Generate a new globally unique UUID for an item
 */
export function generateItemUuid(): string {
  return randomUUID();
}

/**
 * Create a new item history record
 */
export async function createItemHistory({
  itemUuid,
  itemId,
  wear,
  seed,
  nameTag,
  stickers,
  createdBy,
  source,
  currentOwner
}: {
  itemUuid: string;
  itemId: number;
  wear?: number;
  seed?: number;
  nameTag?: string;
  stickers?: any;
  createdBy: string;
  source: "DROP" | "CASE" | "SHOP" | "TRADE" | "MARKETPLACE" | "CRAFT" | "TRADEUP";
  currentOwner: string;
}) {
  return await prisma.itemHistory.create({
    data: {
      itemUuid,
      itemId,
      wear: wear ?? null,
      seed: seed ?? null,
      nameTag: nameTag ?? null,
      stickers: stickers ? JSON.stringify(stickers) : null,
      createdBy,
      source,
      currentOwner
    }
  });
}

/**
 * Record an item transfer
 */
export async function recordItemTransfer({
  itemUuid,
  fromUser,
  toUser,
  transferType,
  tradeId,
  listingId,
  metadata
}: {
  itemUuid: string;
  fromUser?: string;
  toUser: string;
  transferType: "TRADE" | "MARKETPLACE_SELL" | "MARKETPLACE_BUY" | "INITIAL_CREATE" | "TRADEUP_CONSUME" | "TRADEUP_REWARD";
  tradeId?: string;
  listingId?: string;
  metadata?: any;
}) {
  return await prisma.itemTransfer.create({
    data: {
      itemUuid,
      fromUser: fromUser ?? null,
      toUser,
      transferType,
      tradeId: tradeId ?? null,
      listingId: listingId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
}

/**
 * Update item ownership
 */
export async function updateItemOwnership(itemUuid: string, newOwner: string) {
  return await prisma.itemHistory.update({
    where: { itemUuid },
    data: { currentOwner: newOwner }
  });
}

/**
 * Mark item as deleted/consumed
 */
export async function markItemDeleted(itemUuid: string) {
  return await prisma.itemHistory.update({
    where: { itemUuid },
    data: {
      currentOwner: null,
      deletedAt: new Date()
    }
  });
}

/**
 * Get item history
 */
export async function getItemHistory(itemUuid: string) {
  return await prisma.itemHistory.findUnique({
    where: { itemUuid },
    include: {
      transfers: {
        orderBy: { timestamp: "asc" }
      }
    }
  });
}

/**
 * Get user's item history
 */
export async function getUserItemHistory(userId: string, limit: number = 50) {
  return await prisma.itemHistory.findMany({
    where: {
      OR: [
        { currentOwner: userId },
        { createdBy: userId }
      ]
    },
    include: {
      transfers: {
        orderBy: { timestamp: "desc" },
        take: 5
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

/**
 * Get item transfer history
 */
export async function getItemTransfers(itemUuid: string) {
  return await prisma.itemTransfer.findMany({
    where: { itemUuid },
    orderBy: { timestamp: "asc" }
  });
}

/**
 * Batch create item histories (useful for migration)
 */
export async function batchCreateItemHistories(items: Array<{
  itemUuid: string;
  itemId: number;
  wear?: number;
  seed?: number;
  nameTag?: string;
  stickers?: any;
  createdBy: string;
  source: string;
  currentOwner: string;
}>) {
  return await prisma.itemHistory.createMany({
    data: items.map(item => ({
      itemUuid: item.itemUuid,
      itemId: item.itemId,
      wear: item.wear ?? null,
      seed: item.seed ?? null,
      nameTag: item.nameTag ?? null,
      stickers: item.stickers ? JSON.stringify(item.stickers) : null,
      createdBy: item.createdBy,
      source: item.source,
      currentOwner: item.currentOwner
    }))
  });
}

/**
 * Batch create item transfers (useful for migration)
 */
export async function batchCreateItemTransfers(transfers: Array<{
  itemUuid: string;
  fromUser?: string;
  toUser: string;
  transferType: string;
  tradeId?: string;
  listingId?: string;
  metadata?: any;
}>) {
  return await prisma.itemTransfer.createMany({
    data: transfers.map(transfer => ({
      itemUuid: transfer.itemUuid,
      fromUser: transfer.fromUser ?? null,
      toUser: transfer.toUser,
      transferType: transfer.transferType,
      tradeId: transfer.tradeId ?? null,
      listingId: transfer.listingId ?? null,
      metadata: transfer.metadata ? JSON.stringify(transfer.metadata) : null
    }))
  });
}
