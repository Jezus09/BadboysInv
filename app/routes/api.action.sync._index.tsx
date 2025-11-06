/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  CS2BaseInventoryItem,
  CS2Economy,
  CS2EconomyItem,
  CS2ItemType,
  RecordValue
} from "@ianlucas/cs2-lib";
import { z } from "zod";
import { api } from "~/api.server";
import { requireUser } from "~/auth.server";
import { SyncAction } from "~/data/sync";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import {
  craftAllowNametag,
  craftAllowSeed,
  craftAllowStatTrak,
  craftAllowStickerRotation,
  craftAllowStickers,
  craftAllowStickerWear,
  craftAllowStickerX,
  craftAllowStickerY,
  craftAllowWear,
  craftHideCategory,
  craftHideId,
  craftHideModel,
  craftHideType,
  editAllowNametag,
  editAllowSeed,
  editAllowStatTrak,
  editAllowStickerRotation,
  editAllowStickers,
  editAllowStickerWear,
  editAllowStickerX,
  editAllowStickerY,
  editAllowWear,
  editHideCategory,
  editHideId,
  editHideModel,
  editHideType,
  inventoryItemAllowApplyPatch,
  inventoryItemAllowApplySticker,
  inventoryItemAllowEdit,
  inventoryItemAllowRemovePatch,
  inventoryItemAllowScrapeSticker
} from "~/models/rule.server";
import { manipulateUserInventory, notifyPluginRefreshInventory } from "~/models/user.server";
import { methodNotAllowed } from "~/responses.server";
import { nonNegativeInt, teamShape } from "~/utils/shapes";
import {
  clientInventoryItemShape,
  syncInventoryShape
} from "~/utils/shapes.server";
import type { Route } from "./+types/api.action.sync._index";

const actionShape = z
  .object({
    type: z.literal(SyncAction.Add),
    item: clientInventoryItemShape
  })
  .or(
    z.object({
      type: z.literal(SyncAction.AddFromCache),
      data: syncInventoryShape
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.AddFromShop),
      item: clientInventoryItemShape
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.AddWithNametag),
      toolUid: nonNegativeInt,
      itemId: nonNegativeInt,
      nameTag: z.string()
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.ApplyItemKeychain),
      keychainUid: nonNegativeInt,
      slot: nonNegativeInt,
      targetUid: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.ApplyItemPatch),
      patchUid: nonNegativeInt,
      slot: nonNegativeInt,
      targetUid: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.ApplyItemSticker),
      slot: nonNegativeInt,
      stickerUid: nonNegativeInt,
      targetUid: nonNegativeInt,
      // 3D transform data (optional, for 3D mode)
      x: z.number().optional(),
      y: z.number().optional(),
      rotation: z.number().optional()
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.Equip),
      uid: nonNegativeInt,
      team: teamShape.optional()
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.Unequip),
      uid: nonNegativeInt,
      team: teamShape.optional()
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.RenameItem),
      toolUid: nonNegativeInt,
      targetUid: nonNegativeInt,
      nameTag: z.string().optional()
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.Remove),
      uid: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.RemoveItemPatch),
      targetUid: nonNegativeInt,
      slot: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.ScrapeItemSticker),
      targetUid: nonNegativeInt,
      slot: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.SwapItemsStatTrak),
      fromUid: nonNegativeInt,
      toUid: nonNegativeInt,
      toolUid: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.RenameStorageUnit),
      uid: nonNegativeInt,
      nameTag: z.string()
    })
  )
  .or(
    z.object({
      depositUids: z.array(nonNegativeInt).max(1),
      type: z.literal(SyncAction.DepositToStorageUnit),
      uid: nonNegativeInt
    })
  )
  .or(
    z.object({
      retrieveUids: z.array(nonNegativeInt).max(1),
      type: z.literal(SyncAction.RetrieveFromStorageUnit),
      uid: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.Edit),
      uid: nonNegativeInt,
      attributes: clientInventoryItemShape
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.AddWithSticker),
      itemId: nonNegativeInt,
      slot: nonNegativeInt,
      stickerUid: nonNegativeInt
    })
  )
  .or(
    z.object({
      type: z.literal(SyncAction.RemoveAllItems)
    })
  );

export type ActionShape = z.infer<typeof actionShape>;

export type ApiActionSyncData = {
  syncedAt: number;
};

async function enforceCraftRulesForItem(
  idOrItem: number | CS2EconomyItem,
  userId: string
) {
  // Check if user is owner for craft actions
  const isOwner = await isUserOwner(userId);
  if (!isOwner) {
    throw new Error("Access denied: Only the owner can use the craft system");
  }

  const { category, type, model, id } = CS2Economy.get(idOrItem);
  await craftHideId.for(userId).notContains(id);
  if (category !== undefined) {
    await craftHideCategory.for(userId).notContains(category);
  }
  if (type !== undefined) {
    await craftHideType.for(userId).notContains(type);
  }
  if (model !== undefined) {
    await craftHideModel.for(userId).notContains(model);
  }
}

async function enforceCraftRulesForStickerAttributes(
  {
    wear,
    rotation,
    x,
    y
  }: RecordValue<NonNullable<CS2BaseInventoryItem["stickers"]>>,
  userId: string
) {
  if (wear !== undefined) {
    await craftAllowStickerWear.for(userId).truthy();
  }
  if (rotation !== undefined) {
    await craftAllowStickerRotation.for(userId).truthy();
  }
  if (x !== undefined) {
    await craftAllowStickerX.for(userId).truthy();
  }
  if (y !== undefined) {
    await craftAllowStickerY.for(userId).truthy();
  }
}

async function enforceCraftRulesForInventoryItem(
  { stickers, statTrak, wear, seed, nameTag }: Partial<CS2BaseInventoryItem>,
  userId: string
) {
  if (stickers !== undefined) {
    await craftAllowStickers.for(userId).truthy();
    await craftHideType.for(userId).notContains(CS2ItemType.Sticker);
    for (const sticker of Object.values(stickers)) {
      await enforceCraftRulesForItem(sticker.id, userId);
      await enforceCraftRulesForStickerAttributes(sticker, userId);
    }
  }
  if (statTrak !== undefined) {
    await craftAllowStatTrak.for(userId).truthy();
  }
  if (wear !== undefined) {
    await craftAllowWear.for(userId).truthy();
  }
  if (seed !== undefined) {
    await craftAllowSeed.for(userId).truthy();
  }
  if (nameTag !== undefined) {
    await craftAllowNametag.for(userId).truthy();
  }
}

async function enforceEditRulesForItem(
  idOrItem: number | CS2EconomyItem,
  userId: string
) {
  const { category, type, model, id } = CS2Economy.get(idOrItem);
  await editHideId.for(userId).notContains(id);
  if (category !== undefined) {
    await editHideCategory.for(userId).notContains(category);
  }
  if (type !== undefined) {
    await editHideType.for(userId).notContains(type);
  }
  if (model !== undefined) {
    await editHideModel.for(userId).notContains(model);
  }
}

async function enforceEditRulesForInventoryItem(
  { stickers, statTrak, wear, seed, nameTag }: Partial<CS2BaseInventoryItem>,
  userId: string
) {
  if (stickers !== undefined) {
    await editAllowStickers.for(userId).truthy();
    await editHideType.for(userId).notContains(CS2ItemType.Sticker);
    for (const sticker of Object.values(stickers)) {
      await enforceEditRulesForItem(sticker.id, userId);
      await enforceEditRulesForStickerAttributes(sticker, userId);
    }
  }
  if (statTrak !== undefined) {
    await editAllowStatTrak.for(userId).truthy();
  }
  if (wear !== undefined) {
    await editAllowWear.for(userId).truthy();
  }
  if (seed !== undefined) {
    await editAllowSeed.for(userId).truthy();
  }
  if (nameTag !== undefined) {
    await editAllowNametag.for(userId).truthy();
  }
}

async function enforceEditRulesForStickerAttributes(
  {
    wear,
    rotation,
    x,
    y
  }: RecordValue<NonNullable<CS2BaseInventoryItem["stickers"]>>,
  userId: string
) {
  if (wear !== undefined) {
    await editAllowStickerWear.for(userId).truthy();
  }
  if (rotation !== undefined) {
    await editAllowStickerRotation.for(userId).truthy();
  }
  if (x !== undefined) {
    await editAllowStickerX.for(userId).truthy();
  }
  if (y !== undefined) {
    await editAllowStickerY.for(userId).truthy();
  }
}

export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);
  if (request.method !== "POST") {
    throw methodNotAllowed;
  }
  const { id: userId, inventory: rawInventory } = await requireUser(request);
  const { syncedAt, actions } = z
    .object({
      syncedAt: z.number(),
      actions: z.array(actionShape)
    })
    .parse(await request.json());
  let addedFromCache = false;
  let needsInventoryRefresh = false; // Track if we need to notify plugin to refresh
  const { syncedAt: responseSyncedAt } = await manipulateUserInventory({
    rawInventory,
    syncedAt,
    userId,
    async manipulate(inventory) {
      for (const action of actions) {
        switch (action.type) {
          case SyncAction.Add:
            await enforceCraftRulesForItem(action.item.id, userId);
            await enforceCraftRulesForInventoryItem(action.item, userId);
            inventory.add(action.item);
            break;
          case SyncAction.AddFromShop:
            // Shop purchases don't require any craft or owner permissions
            // Just add the item directly to inventory
            inventory.add(action.item);
            break;
          case SyncAction.AddFromCache:
            if (rawInventory === null && !addedFromCache) {
              for (const item of Object.values(action.data.items)) {
                try {
                  await enforceCraftRulesForItem(item.id, userId);
                  await enforceCraftRulesForInventoryItem(item, userId);
                  inventory.add(item);
                } catch {}
              }
              addedFromCache = true;
            }
            break;
          case SyncAction.AddWithNametag:
            await enforceCraftRulesForItem(action.itemId, userId);
            inventory.addWithNametag(
              action.toolUid,
              action.itemId,
              action.nameTag
            );
            break;
          case SyncAction.ApplyItemKeychain:
            // Since there's no applyItemKeychain method, we use edit()
            const targetItem = inventory.get(action.targetUid);
            const keychainItem = inventory.get(action.keychainUid);

            // Build new keychains map
            const newKeychains: Record<number, { id: number; seed?: number }> = {};

            // Copy existing keychains
            targetItem.allKeychains().forEach(([slot, keychain]) => {
              if (keychain !== undefined) {
                newKeychains[slot] = keychain;
              }
            });

            // Add new keychain
            newKeychains[action.slot] = {
              id: keychainItem.id,
              seed: Math.floor(Math.random() * 100000)
            };

            // Apply the keychain and remove the keychain item
            inventory.edit(action.targetUid, { keychains: newKeychains });
            inventory.remove(action.keychainUid);
            needsInventoryRefresh = true; // Keychain applied - refresh needed
            break;
          case SyncAction.ApplyItemPatch:
            await inventoryItemAllowApplyPatch.for(userId).truthy();
            inventory.applyItemPatch(
              action.targetUid,
              action.patchUid,
              action.slot
            );
            break;
          case SyncAction.ApplyItemSticker:
            await inventoryItemAllowApplySticker.for(userId).truthy();
            // Support 3D transform data (x, y, rotation) for 3D sticker placement
            inventory.applyItemSticker(
              action.targetUid,
              action.stickerUid,
              action.slot,
              action.x,
              action.y,
              action.rotation
            );
            needsInventoryRefresh = true; // Sticker applied - refresh needed for immediate in-game update
            break;
          case SyncAction.Equip:
            inventory.equip(action.uid, action.team);
            needsInventoryRefresh = true; // Item equipped - refresh needed
            break;
          case SyncAction.Unequip:
            inventory.unequip(action.uid, action.team);
            needsInventoryRefresh = true; // Item unequipped - refresh needed
            break;
          case SyncAction.RenameItem:
            inventory.renameItem(
              action.toolUid,
              action.targetUid,
              action.nameTag
            );
            break;
          case SyncAction.Remove:
            inventory.remove(action.uid);
            break;
          case SyncAction.RemoveItemPatch:
            await inventoryItemAllowRemovePatch.for(userId).truthy();
            inventory.removeItemPatch(action.targetUid, action.slot);
            break;
          case SyncAction.ScrapeItemSticker:
            await inventoryItemAllowScrapeSticker.for(userId).truthy();
            inventory.scrapeItemSticker(action.targetUid, action.slot);
            needsInventoryRefresh = true; // Sticker scraped - refresh needed for in-game wear update
            break;
          case SyncAction.SwapItemsStatTrak:
            inventory.swapItemsStatTrak(
              action.toolUid,
              action.fromUid,
              action.toUid
            );
            break;
          case SyncAction.RenameStorageUnit:
            inventory.renameStorageUnit(action.uid, action.nameTag);
            break;
          case SyncAction.DepositToStorageUnit:
            inventory.depositToStorageUnit(action.uid, action.depositUids);
            break;
          case SyncAction.RetrieveFromStorageUnit:
            inventory.retrieveFromStorageUnit(action.uid, action.retrieveUids);
            break;
          case SyncAction.Edit:
            await inventoryItemAllowEdit.for(userId).truthy();
            await enforceEditRulesForItem(action.attributes.id, userId);
            await enforceEditRulesForInventoryItem(action.attributes, userId);
            inventory.edit(action.uid, {
              ...action.attributes,
              statTrak:
                action.attributes.statTrak !== undefined
                  ? (inventory.get(action.uid).statTrak ?? 0)
                  : undefined,
              nameTag: action.attributes.nameTag
            });
            break;
          case SyncAction.AddWithSticker:
            await enforceCraftRulesForItem(action.itemId, userId);
            inventory.addWithSticker(
              action.stickerUid,
              action.itemId,
              action.slot
            );
            break;
          case SyncAction.RemoveAllItems:
            inventory.removeAll();
            break;
        }
      }
    }
  });

  // Notify CS2 plugin to refresh inventory if equip/unequip/keychain operations were performed
  if (needsInventoryRefresh) {
    // Fire-and-forget: don't wait for webhook to complete
    notifyPluginRefreshInventory(userId).catch((error) => {
      console.error(`[Sync] Failed to notify plugin for inventory refresh: ${error}`);
    });
  }

  return Response.json({
    syncedAt: responseSyncedAt.getTime()
  } satisfies ApiActionSyncData);
});

export { loader } from "./api.$";
