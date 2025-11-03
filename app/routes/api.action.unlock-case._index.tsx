/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Inventory, CS2UnlockedItem, CS2Economy } from "@ianlucas/cs2-lib";
import { z } from "zod";
import { api } from "~/api.server";
import { requireUser } from "~/auth.server";
import { prisma } from "~/db.server";
import { middleware } from "~/http.server";
import {
  inventoryItemAllowUnlockContainer,
  inventoryMaxItems,
  inventoryStorageUnitMaxItems
} from "~/models/rule.server";
import { updateUserInventory, notifyPluginCaseOpened } from "~/models/user.server";
import { conflict, methodNotAllowed } from "~/responses.server";
import { parseInventory } from "~/utils/inventory";
import { nonNegativeInt, positiveInt } from "~/utils/shapes";
import type { Route } from "./+types/api.action.unlock-case._index";

export const ApiActionUnlockCaseUrl = "/api/action/unlock-case";

export type ApiActionUnlockCaseActionData = {
  syncedAt: number;
  unlockedItem: CS2UnlockedItem;
};

export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);
  if (request.method !== "POST") {
    throw methodNotAllowed;
  }
  const user = await requireUser(request);
  const {
    id: userId,
    inventory: rawInventory,
    syncedAt: currentSyncedAt
  } = user;
  await inventoryItemAllowUnlockContainer.for(userId).truthy();
  const { caseUid, keyUid, syncedAt } = z
    .object({
      syncedAt: positiveInt,
      caseUid: nonNegativeInt,
      keyUid: nonNegativeInt.optional()
    })
    .parse(await request.json());
  if (syncedAt !== currentSyncedAt.getTime()) {
    throw conflict;
  }
  const inventory = new CS2Inventory({
    data: parseInventory(rawInventory),
    maxItems: await inventoryMaxItems.for(userId).get(),
    storageUnitMaxItems: await inventoryStorageUnitMaxItems.for(userId).get()
  });
  
  // Get case and key info before unlocking
  const caseItem = inventory.get(caseUid);
  const keyItem = keyUid !== undefined ? inventory.get(keyUid) : undefined;
  
  const unlockedItem = caseItem.unlockContainer();
  inventory.unlockContainer(unlockedItem, caseUid, keyUid);
  
  const { syncedAt: responseSyncedAt } = await updateUserInventory(
    userId,
    inventory.stringify()
  );

  // Save case opening to activity feed with delay to match animation timing
  setTimeout(async () => {
    try {
      const unlockedItemData = CS2Economy.getById(unlockedItem.id);
      const caseItemData = CS2Economy.getById(caseItem.id);
      const keyItemData = keyItem ? CS2Economy.getById(keyItem.id) : undefined;

      await prisma.caseOpening.create({
        data: {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          caseItemId: caseItem.id,
          caseName: caseItemData.name,
          keyItemId: keyItem?.id || null,
          keyName: keyItemData?.name || null,
          unlockedItemId: unlockedItem.id,
          unlockedName: unlockedItemData.name,
          unlockedRarity: unlockedItemData.rarity,
        },
      });

      // Notify CS2 plugin via webhook
      await notifyPluginCaseOpened({
        playerName: user.name,
        itemName: unlockedItemData.name,
        rarity: unlockedItemData.rarity || "Common",
        statTrak: unlockedItem.stattrak || false
      });
    } catch (error) {
      console.error("Error saving case opening:", error);
      // Don't fail the whole request if activity saving fails
    }
  }, 4000); // 4 second delay to match case opening animation

  return Response.json({
    unlockedItem,
    syncedAt: responseSyncedAt.getTime()
  } satisfies ApiActionUnlockCaseActionData);
});

export { loader } from "./api.$";
