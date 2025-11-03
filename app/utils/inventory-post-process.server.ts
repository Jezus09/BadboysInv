/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Post-processing helper to add UUIDs to items that don't have them
 * This allows CS2Inventory library to work normally while gradually adding UUID support
 */

import { generateItemUuid, createItemHistory } from "~/models/item-tracking.server";

/**
 * Process inventory after CS2Inventory operations to add UUIDs to new items
 */
export async function processInventoryWithUuids({
  inventoryJson,
  userId,
  source,
  metadata
}: {
  inventoryJson: string;
  userId: string;
  source: "DROP" | "CASE" | "SHOP" | "TRADE" | "MARKETPLACE" | "CRAFT" | "TRADEUP";
  metadata?: any;
}): Promise<string> {
  try {
    const inventory = JSON.parse(inventoryJson);

    if (!inventory.items) {
      return inventoryJson;
    }

    let modified = false;

    // Check each item and add UUID if missing
    for (const [key, item] of Object.entries(inventory.items) as Array<[string, any]>) {
      // If key is numeric UID (old format) or item doesn't have uuid property
      if (!item.uuid || !key.includes('-')) {
        const uuid = generateItemUuid();

        // Add UUID to item
        item.uuid = uuid;

        // If key is old UID format, we need to re-key the inventory
        if (!key.includes('-')) {
          // Will be handled below after iteration
          modified = true;
        }

        // Create ItemHistory record (async, don't await to avoid blocking)
        createItemHistory({
          itemUuid: uuid,
          itemId: item.id,
          wear: item.wear,
          seed: item.seed,
          nameTag: item.nameTag,
          stickers: item.stickers,
          createdBy: userId,
          source,
          currentOwner: userId
        }).catch(err => {
          console.error(`[UUID] Failed to create ItemHistory for ${uuid}:`, err);
        });

        console.log(`[UUID] Added UUID ${uuid} to item ${item.id} (source: ${source})`);
      }
    }

    // If we need to re-key from UID to UUID
    if (modified) {
      const newItems: Record<string, any> = {};

      for (const [key, item] of Object.entries(inventory.items) as Array<[string, any]>) {
        // Use UUID as key if available, otherwise keep old key
        const newKey = item.uuid || key;
        newItems[newKey] = item;
      }

      inventory.items = newItems;
    }

    return JSON.stringify(inventory);
  } catch (error) {
    console.error('[UUID] Failed to process inventory:', error);
    // Return original if processing fails
    return inventoryJson;
  }
}

/**
 * Simpler version: just ensure all items have UUIDs (don't re-key yet)
 * This is safer for gradual migration
 */
export async function ensureItemUuids({
  inventoryJson,
  userId,
  source
}: {
  inventoryJson: string;
  userId: string;
  source: "DROP" | "CASE" | "SHOP" | "TRADE" | "MARKETPLACE" | "CRAFT" | "TRADEUP";
}): Promise<string> {
  try {
    const inventory = JSON.parse(inventoryJson);

    if (!inventory.items) {
      return inventoryJson;
    }

    // Just add UUIDs to items that don't have them
    for (const item of Object.values(inventory.items) as Array<any>) {
      if (!item.uuid) {
        const uuid = generateItemUuid();
        item.uuid = uuid;

        // Create ItemHistory record (fire and forget)
        createItemHistory({
          itemUuid: uuid,
          itemId: item.id,
          wear: item.wear,
          seed: item.seed,
          nameTag: item.nameTag,
          stickers: item.stickers,
          createdBy: userId,
          source,
          currentOwner: userId
        }).catch(err => {
          console.error(`[UUID] Failed to create ItemHistory:`, err);
        });

        console.log(`[UUID] New item: ${uuid} (ID: ${item.id}, source: ${source})`);
      }
    }

    return JSON.stringify(inventory);
  } catch (error) {
    console.error('[UUID] Failed to ensure UUIDs:', error);
    return inventoryJson;
  }
}
