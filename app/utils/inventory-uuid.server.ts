/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2BaseInventoryItem } from "@ianlucas/cs2-lib";
import { generateItemUuid, createItemHistory, recordItemTransfer } from "~/models/item-tracking.server";

/**
 * Enhanced inventory item with UUID
 */
export interface InventoryItemWithUuid extends CS2BaseInventoryItem {
  uuid: string; // Global UUID
  uid: number;  // Local UID (deprecated, will be replaced by uuid)
}

/**
 * Enhanced inventory data structure with UUIDs
 */
export interface InventoryDataWithUuids {
  items: Record<string, InventoryItemWithUuid>; // Key is UUID
  version?: number;
}

/**
 * Add UUID to a new item
 */
export async function addItemWithUuid({
  item,
  userId,
  source,
  metadata
}: {
  item: CS2BaseInventoryItem;
  userId: string;
  source: "DROP" | "CASE" | "SHOP" | "TRADE" | "MARKETPLACE" | "CRAFT" | "TRADEUP";
  metadata?: any;
}): Promise<InventoryItemWithUuid> {
  const uuid = generateItemUuid();

  // Create item history record
  await createItemHistory({
    itemUuid: uuid,
    itemId: item.id,
    wear: item.wear,
    seed: item.seed,
    nameTag: item.nameTag,
    stickers: item.stickers,
    createdBy: userId,
    source,
    currentOwner: userId
  });

  // Record initial creation transfer
  await recordItemTransfer({
    itemUuid: uuid,
    toUser: userId,
    transferType: "INITIAL_CREATE",
    metadata
  });

  return {
    ...item,
    uuid,
    uid: 0 // Temporary, will be assigned by inventory system
  };
}

/**
 * Transfer item between users (for trade/marketplace)
 */
export async function transferItem({
  itemUuid,
  fromUser,
  toUser,
  transferType,
  tradeId,
  listingId,
  metadata
}: {
  itemUuid: string;
  fromUser: string;
  toUser: string;
  transferType: "TRADE" | "MARKETPLACE_SELL" | "MARKETPLACE_BUY";
  tradeId?: string;
  listingId?: string;
  metadata?: any;
}) {
  // Record the transfer
  await recordItemTransfer({
    itemUuid,
    fromUser,
    toUser,
    transferType,
    tradeId,
    listingId,
    metadata
  });

  // Update ownership in ItemHistory
  const { updateItemOwnership } = await import("~/models/item-tracking.server");
  await updateItemOwnership(itemUuid, toUser);
}

/**
 * Mark item as consumed (trade-up, delete, etc)
 */
export async function consumeItem({
  itemUuid,
  userId,
  reason
}: {
  itemUuid: string;
  userId: string;
  reason: "TRADEUP" | "DELETE" | "OTHER";
}) {
  // Record consumption
  await recordItemTransfer({
    itemUuid,
    fromUser: userId,
    toUser: userId, // Same user
    transferType: "TRADEUP_CONSUME",
    metadata: { reason }
  });

  // Mark as deleted in ItemHistory
  const { markItemDeleted } = await import("~/models/item-tracking.server");
  await markItemDeleted(itemUuid);
}

/**
 * Migrate old inventory item to UUID format
 */
export function migrateItemToUuid(
  item: CS2BaseInventoryItem & { uid: number },
  userId: string
): InventoryItemWithUuid {
  const uuid = generateItemUuid();

  return {
    ...item,
    uuid
  };
}

/**
 * Parse inventory with UUID support
 * Handles both legacy (UID-based) and new (UUID-based) formats
 */
export function parseInventoryWithUuid(inventory?: string | null): InventoryDataWithUuids | undefined {
  if (!inventory) return undefined;

  try {
    const parsed = JSON.parse(inventory);

    // Check if this is already UUID format
    if (parsed.items) {
      const firstKey = Object.keys(parsed.items)[0];
      if (firstKey && firstKey.includes("-")) {
        // Already UUID format
        return parsed as InventoryDataWithUuids;
      }

      // Legacy format - needs migration
      // For now, return undefined to trigger migration
      return undefined;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Convert inventory with UUIDs to JSON string
 */
export function stringifyInventoryWithUuid(inventory: InventoryDataWithUuids): string {
  return JSON.stringify(inventory);
}

/**
 * Get item by UUID from inventory
 */
export function getItemByUuid(
  inventory: InventoryDataWithUuids,
  uuid: string
): InventoryItemWithUuid | undefined {
  return inventory.items[uuid];
}

/**
 * Add item to inventory (mutable operation)
 */
export function addItemToInventory(
  inventory: InventoryDataWithUuids,
  item: InventoryItemWithUuid
): void {
  inventory.items[item.uuid] = item;
}

/**
 * Remove item from inventory by UUID (mutable operation)
 */
export function removeItemFromInventory(
  inventory: InventoryDataWithUuids,
  uuid: string
): void {
  delete inventory.items[uuid];
}

/**
 * Get all items from inventory as array
 */
export function getInventoryItems(inventory: InventoryDataWithUuids): InventoryItemWithUuid[] {
  return Object.values(inventory.items);
}

/**
 * Find item in inventory by properties (fallback for legacy code)
 */
export function findItemByProperties(
  inventory: InventoryDataWithUuids,
  properties: {
    id: number;
    wear?: number;
    nameTag?: string;
  }
): InventoryItemWithUuid | undefined {
  return Object.values(inventory.items).find(item => {
    return (
      item.id === properties.id &&
      Math.abs((item.wear || 0) - (properties.wear || 0)) < 0.0001 &&
      (item.nameTag || "") === (properties.nameTag || "")
    );
  });
}
