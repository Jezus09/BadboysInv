/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Migration script to convert existing inventory items to UUID-based system
 *
 * This script will:
 * 1. Fetch all users with inventory
 * 2. Parse each inventory
 * 3. Generate UUIDs for each item
 * 4. Create ItemHistory records
 * 5. Update inventory structure to use UUIDs as keys
 * 6. Save updated inventories back to database
 *
 * Run with: npx tsx scripts/migrate-inventory-to-uuid.ts
 */

import { prisma } from "../app/db.server";
import { parseInventory } from "../app/utils/inventory";
import { generateItemUuid, batchCreateItemHistories } from "../app/models/item-tracking.server";

async function migrateInventoryToUuid() {
  console.log("=== STARTING INVENTORY UUID MIGRATION ===\n");

  // Fetch all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      inventory: true
    }
  });

  console.log(`Found ${users.length} users to process\n`);

  let totalItems = 0;
  let totalUsers = 0;
  let errors = 0;

  for (const user of users) {
    console.log(`Processing user: ${user.name} (${user.id})`);

    if (!user.inventory) {
      console.log("  ⏭️  No inventory, skipping\n");
      continue;
    }

    try {
      // Parse current inventory
      const inventoryData = parseInventory(user.inventory);
      if (!inventoryData?.items) {
        console.log("  ⚠️  Could not parse inventory, skipping\n");
        continue;
      }

      const itemCount = Object.keys(inventoryData.items).length;
      if (itemCount === 0) {
        console.log("  ⏭️  Empty inventory, skipping\n");
        continue;
      }

      console.log(`  📦 Found ${itemCount} items`);

      // Check if already migrated (first item has uuid)
      const firstItem = Object.values(inventoryData.items)[0];
      if (firstItem && 'uuid' in firstItem && (firstItem as any).uuid) {
        console.log("  ✅ Already migrated, skipping\n");
        continue;
      }

      // Create new inventory structure with UUIDs
      const newInventory: any = {
        version: inventoryData.version || 1,
        items: {}
      };

      const itemHistories: Array<{
        itemUuid: string;
        itemId: number;
        wear?: number;
        seed?: number;
        nameTag?: string;
        stickers?: any;
        createdBy: string;
        source: string;
        currentOwner: string;
      }> = [];

      // Process each item
      for (const [oldUid, item] of Object.entries(inventoryData.items)) {
        const uuid = generateItemUuid();

        // Add UUID to item
        const itemWithUuid = {
          ...item,
          uuid,
          uid: parseInt(oldUid) // Keep old UID for reference during migration
        };

        // Use UUID as key in new inventory structure
        newInventory.items[uuid] = itemWithUuid;

        // Prepare ItemHistory record
        itemHistories.push({
          itemUuid: uuid,
          itemId: item.id,
          wear: item.wear,
          seed: item.seed,
          nameTag: item.nameTag,
          stickers: item.stickers,
          createdBy: user.id,
          source: "DROP", // Assume existing items are from drops (we don't have historical data)
          currentOwner: user.id
        });
      }

      console.log(`  🔄 Migrating ${itemHistories.length} items...`);

      // Batch create ItemHistory records
      await batchCreateItemHistories(itemHistories);

      // Update user inventory with UUID structure
      await prisma.user.update({
        where: { id: user.id },
        data: {
          inventory: JSON.stringify(newInventory)
        }
      });

      totalItems += itemHistories.length;
      totalUsers++;

      console.log(`  ✅ Migrated ${itemHistories.length} items successfully\n`);

    } catch (error) {
      console.error(`  ❌ Error processing user ${user.id}:`, error);
      errors++;
      console.log("");
    }
  }

  console.log("=== MIGRATION COMPLETE ===");
  console.log(`✅ Migrated users: ${totalUsers}/${users.length}`);
  console.log(`✅ Total items migrated: ${totalItems}`);
  console.log(`❌ Errors: ${errors}`);
}

// Run migration
migrateInventoryToUuid()
  .then(() => {
    console.log("\n🎉 Migration finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });
